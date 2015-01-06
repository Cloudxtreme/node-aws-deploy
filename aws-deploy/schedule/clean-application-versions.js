var debug = require('debug')('aws-deploy:task:clean-application-versions');
var _ = require('lodash');
var async = require('async');

var db = require('../db');
var AWS = require('../aws-sdk');
var log = require('../log');

var EB = new AWS.ElasticBeanstalk();

function cleanApplicationVersions(deployment_id, callback) {
    if (!deployment_id) {
        async.nextTick(function () {
            callback("no deployment id specified");
        });
        return;
    }

    var application;
    var environment;
    var versions;

    async.series([
        function (callback) {
            db.querySingle("SELECT * FROM awd_deployments" +
            " JOIN awd_repositories ON awd_repositories.deployment_id = awd_deployments.deployment_id" +
            " JOIN awd_applications ON awd_applications.deployment_id = awd_deployments.deployment_id" +
            " WHERE awd_deployments.deployment_id = ? LIMIT 1", [deployment_id], function (err, result) {
                if (err) {
                    callback(err);
                    return;
                }

                application = result;
                callback(null);
            });
        }, function (callback) {
            EB.describeEnvironments({
                "EnvironmentIds": [application.application_environment]
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                environment = _.first(data.Environments);
                if (!environment) {
                    callback("could not find environment");
                    return;
                }

                callback(null);
            });
        }, function (callback) {
            if (application.deployment_auto_clean < 1) {
                async.nextTick(callback);
                return;
            }

            var repo = /([^\/]+)\/([^#]+)#(.+)/i.exec(application.repository_url);
            if (!repo) {
                callback("could not get branch name");
                return;
            }

            EB.describeApplicationVersions({
                "ApplicationName": application.application_name
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                versions = _.chain(data.ApplicationVersions).sortBy(function (version) {
                    return -version.DateUpdated.getTime();
                }).filter(function (version, index) {
                    var branch = /Branch: ([^ )]+)/i.exec(version.Description);
                    if (!branch) {
                        return false;
                    }

                    if (version.VersionLabel == environment.VersionLabel) {
                        return false;
                    }

                    if (branch[1] != repo[3]) {
                        return false;
                    }

                    return (index >= application.deployment_auto_clean);
                }).map(function (version) {
                    return version.VersionLabel;
                }).value();

                callback(null);
            });
        }, function (callback) {
            async.eachSeries(versions, function (version, callback) {
                EB.deleteApplicationVersion({
                    "ApplicationName": application.application_name,
                    "VersionLabel": version,
                    "DeleteSourceBundle": true
                }, function (err) {
                    if (err) {
                        log.send(application.deployment_id, 'error', 'application.clean-failed', {
                            "version_label": version,
                            "error": err
                        });
                    } else {
                        log.send(application.deployment_id, 'info', 'application.clean-success', {
                            "version_label": version
                        });
                    }

                    callback(err);
                });
            }, callback);
        }
    ], function (err) {
        callback(err);
    })
}

exports.run = cleanApplicationVersions;
