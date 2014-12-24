var debug = require('debug')('aws-deploy:task:create-application-version');
var config = require('config');
var request = require('request');
var url = require('url');
var async = require('async');
var crypto = require('crypto');
var JSZip = require('jszip');
var _ = require('lodash');

var db = require('../../server/db');
var AWS = require('../aws-sdk');
var cache = require('../cache');

var S3 = new AWS.S3();
var EB = new AWS.ElasticBeanstalk();

function createApplicationPackage(deployment_id, callback) {
    var deployment;
    var repository_status = cache.get("repository-status:" + deployment_id);
    var repository_commit = cache.get("repository-commit:" + deployment_id);
    var content;
    var filename;
    var version;

    if (repository_status == "error") {
        callback("repository state is not valid");
        return;
    }

    if (!repository_commit) {
        callback("invalid repository commit");
        return;
    }

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
            var repo = /([^\/]+)\/([^#]+)#(.+)/i.exec(deployment.repository_url);

            request.get({
                url: url.resolve(config.github.endpoint.api, '/repos/' + repo[1] + '/' + repo[2] + '/zipball/' + repository_commit),
                encoding: null,
                headers: {
                    "Authorization": "token " + deployment.repository_credentials,
                    "User-Agent": config.github.useragent                }
            }, function (err, response, body) {
                if (err || response.statusCode != 200) {
                    callback(err || "Invalid response");
                    return;
                }

                if (response.headers["content-type"] != "application/zip") {
                    callback("Invalid response type");
                    return;
                }

                content = body;
                callback(null);
            });
        }, function (callback) {
            try {
                var zip = new JSZip(content);
                _.each(zip.files, function (file, name) {
                    var newName = /^[^\/]+\/(.*)$/.exec(name);
                    if (newName) {
                        file.name = newName[1];
                        if (newName[1].length != 0) {
                            zip.files[newName[1]] = file;
                        }
                        delete zip.files[name];
                    }
                });

                content = zip.generate({
                    compression: 'STORE',
                    type: 'nodebuffer'
                });
                callback(null);
            } catch (e) {
                callback(e);
            }
        }, function (callback) {
            var repo = /([^\/]+)\/([^#]+)#(.+)/i.exec(deployment.repository_url);

            request.get({
                url: url.resolve(config.github.endpoint.api, '/repos/' + repo[1] + '/' + repo[2] + '/contents/package.json?sha=' + repository_commit),
                json: true,
                headers: {
                    "Authorization": "token " + deployment.repository_credentials,
                    "User-Agent": config.github.useragent,
                    "Accept": "application/vnd.github.moondragon-preview+json"
                }
            }, function (err, response, body) {
                if (err || response.statusCode != 200) {
                    callback(err || "Invalid response");
                    return;
                }

                if (!_.isObject(body)) {
                    callback("Not a JSON object");
                    return;
                }

                if (!body.hasOwnProperty("content")) {
                    callback("Content not returned");
                    return;
                }

                var json;
                try {
                    json = JSON.parse(new Buffer(body.content, 'base64'));
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
            debug("uploading file '%s' (%d bytes) to bucket '%s'", filename, content.length, deployment.application_bucket);
            S3.upload({
                Bucket: deployment.application_bucket,
                Key: filename,
                Body: content,
                ContentLength: content.length,
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
            EB.deleteApplicationVersion({
                ApplicationName: deployment.application_name,
                VersionLabel: version,
                DeleteSourceBundle: true
            }, function (err) {
                callback(null);
            });
        }, function (callback) {
            EB.createApplicationVersion({
                ApplicationName: deployment.application_name,
                VersionLabel: version,
                AutoCreateApplication: false,
                Description: "Deploy of repository " + deployment.repository_url + " (SHA: " + repository_commit + ")",
                SourceBundle: {
                    S3Bucket: deployment.application_bucket,
                    S3Key: filename
                }
            }, function (err) {
                callback(err);
            });
        }
    ], function (err) {
        callback(err);
    });
}
exports.name = 'create-application-package';
exports.run = createApplicationPackage;