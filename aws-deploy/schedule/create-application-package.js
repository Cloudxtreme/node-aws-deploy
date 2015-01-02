var debug = require('debug')('aws-deploy:task:create-application-version');
var spawn = require('child_process').spawn;
var config = require('config');
var request = require('request');
var url = require('url');
var async = require('async');
var crypto = require('crypto');
var temp = require('temp');
var _ = require('lodash');
var path = require('path');
var fs = require('fs');

var db = require('../../server/db');
var AWS = require('../aws-sdk');
var cache = require('../cache');
var log = require('../log');

var S3 = new AWS.S3();
var EB = new AWS.ElasticBeanstalk();

function createApplicationPackage(deployment_id, callback) {
    var deployment;
    var repository_status = cache.get("repository-status:" + deployment_id);
    var repository_commit = cache.get("repository-commit:" + deployment_id);
    var content;
    var filename;
    var version;
    var temppath;
    var datapath;
    var inzip;
    var outzip;

    var zip, unzip;

    if (repository_status == "error") {
        callback("repository state is not valid");
        return;
    }

    if (!repository_commit) {
        callback("invalid repository commit");
        return;
    }

    if (cache.get('creating-application-package')) {
        callback("application package processor is busy");
        return;
    }

    cache.put("creating-application-package", true, 5 * 60 * 1000);
    async.series([
        function (callback) {
            db.querySingle("SELECT * FROM awd_deployments" +
                " JOIN awd_repositories ON awd_repositories.deployment_id = awd_deployments.deployment_id" +
                " JOIN awd_applications ON awd_applications.deployment_id = awd_deployments.deployment_id" +
                " WHERE awd_deployments.deployment_id = ?", [deployment_id], function (err, result) {
                if (err || !result) {
                    callback(err || "could not find deployment");
                    return;
                }

                deployment = result;
                callback(null);
            });
        }, function (callback) {
            temp.track();
            temp.mkdir('awsdeploy', function (err, dirPath) {
                if (err) {
                    callback(err);
                    return;
                }

                debug("tempdir", dirPath);

                temppath = dirPath;
                inzip = path.join(temppath, 'in.zip');
                outzip = path.join(temppath, 'out.zip');

                debug("inzip", inzip);
                debug("outzip", outzip);

                callback(null);
            });
        }, function (callback) {
            var repo = /([^\/]+)\/([^#]+)#(.+)/i.exec(deployment.repository_url);

            debug("downloading package from github");
            request.get({
                url: url.resolve(config.github.endpoint.api, '/repos/' + repo[1] + '/' + repo[2] + '/zipball/' + repository_commit),
                encoding: null,
                headers: {
                    "Authorization": "token " + deployment.repository_credentials,
                    "User-Agent": config.github.useragent                }
            }).on('response', function (response) {
                if (response.statusCode != 200) {
                    callback("Invalid request");
                    return;
                }
                response.on('end', function () {
                    callback(null);
                });
            }).on('error', function (err) {
                callback(err);
            }).pipe(fs.createWriteStream(inzip));
        }, function (callback) {
            debug("extracting package from github");

            callback = _.once(callback);

            unzip = spawn('unzip', [inzip], { cwd: temppath, stdio: [0,1,2] });
            unzip.on('error', function (err) {
                callback(err);
            });
            unzip.on('close', function (code) {
                if (code > 0) {
                    callback("unzip failed");
                    return;
                }
                callback(null);
            });
        }, function (callback) {
            fs.readdir(temppath, function (err, files) {
                if (err) {
                    callback(err);
                    return;
                }

                async.detect(files, function (file, callback) {
                    fs.stat(path.join(temppath, file), function (err, stats) {
                        callback(!err && stats.isDirectory());
                    });
                }, function (result) {
                    if (!result) {
                        callback("dir not found");
                        return;
                    }
                    datapath = path.join(temppath, result);
                    callback(null);
                });
            });
        }, function (callback) {
            debug("compressing package for AWS");

            callback = _.once(callback);

            zip = spawn('zip', ['-x', '*.git*', '-r', outzip, '.'], { cwd: datapath, stdio: [0,1,2] });
            zip.on('error', function (err) {
                callback(err);
            });
            zip.on('close', function (code) {
                if (code > 0) {
                    callback("zip failed");
                    return;
                }
                callback(null);
            });
        }, function (callback) {
            debug("reading package manifest");
            fs.readFile(path.join(datapath, 'package.json'), 'utf8', function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                var json;
                try {
                    json = JSON.parse(data);
                } catch (e) {
                    callback(e);
                    return;
                }

                var pad = function (val) {
                    return (val < 10 ? '0' : '') + val.toString();
                };
                var date = new Date();
                var dts = date.getFullYear().toString() + pad(date.getMonth()+1) + pad(date.getDate());

                version = (deployment.repository_url + '-' + json.version + '-' + dts + '-' + repository_commit.slice(0,8)).replace(/[^A-Z0-9.]/gi, '-');
                callback(null);
            });
        }, function (callback) {
            crypto.pseudoRandomBytes(4, function (err, bytes) {
                if (err) {
                    callback(err);
                    return;
                }

                filename = bytes.toString('hex') + '_' + version + '.zip';
                callback(null);
            });
        }, function (callback) {
            debug("uploading file '%s' to bucket '%s'", filename, deployment.application_bucket);
            S3.upload({
                Bucket: deployment.application_bucket,
                Key: filename,
                Body: fs.createReadStream(outzip),
                ContentType: "application/zip"
            }, function (err, data) {
                if (err) {
                    debug("upload of '%s' to bucket '%s' failed", filename, deployment.application_bucket);
                    callback(err);
                    return;
                }

                debug("upload of '%s' to bucket '%s' completed", filename, deployment.application_bucket);
                callback(null);
            });
        }, function (callback) {
            debug("deleting old application version");
            EB.deleteApplicationVersion({
                ApplicationName: deployment.application_name,
                VersionLabel: version,
                DeleteSourceBundle: true
            }, function (err) {
                callback(null);
            });
        }, function (callback) {
            var repo = /([^\/]+)\/([^#]+)#(.+)/i.exec(deployment.repository_url);

            debug("creating new application version");
            EB.createApplicationVersion({
                ApplicationName: deployment.application_name,
                VersionLabel: version,
                AutoCreateApplication: false,
                Description: "Deploy of repository " + deployment.repository_url + " (SHA: " + repository_commit + " Branch: " + repo[3] + ")",
                SourceBundle: {
                    S3Bucket: deployment.application_bucket,
                    S3Key: filename
                }
            }, function (err) {
                callback(err);
            });
        }
    ], function (err) {
        if (err) {
            log.send(deployment_id, 'error', 'repository.package-failed', {
                "error": err
            });
        } else {
            log.send(deployment_id, 'info', 'repository.package-success', {
                "version_label": version
            });
        }

        debug("application publication status: %s", err ? "failed" : "success");
        temp.cleanup(function () {
            cache.del("creating-application-package");
            callback(err, version);
        });
    });
}
exports.run = createApplicationPackage;