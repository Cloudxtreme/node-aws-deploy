var debug = require('debug')('aws-deploy:task:check-application-status');
var async = require("async");
var AWS = require('../aws-sdk');
var _ = require('lodash');

var db = require('../../server/db');
var cache = require('../cache');

var EB = new AWS.ElasticBeanstalk();

function checkApplicationStatus(deployment_id, callback) {
    var applications;

    async.series([
        function (callback) {
            db.query("SELECT *" +
                " FROM awd_deployments" +
                " LEFT JOIN awd_applications ON awd_deployments.deployment_id = awd_applications.deployment_id", function (err, rows) {
                if (err) {
                    debug("could not retrieve application list");
                    callback(err);
                    return;
                }

                applications = rows.filter(function (row) {
                    return (!!row.application_name && !!row.application_environment) && (!deployment_id || deployment_id == row.deployment_id);
                });

                callback(null);
            });
        }, function (callback) {
            async.eachSeries(applications, function (application, callback) {
                async.series([
                    function (callback) {
                        EB.describeEnvironments({
                            'ApplicationName': application.application_name,
                            'EnvironmentIds': [
                                application.application_environment
                            ]
                        }, function (err, data) {
                            if (err) {
                                debug("error querying application status (%d): %s", application.deployment_id, err);
                                callback(err);
                                return;
                            }

                            var status = "error";
                            do {
                                var environment = _.first(data.Environments);
                                if (!environment) {
                                    debug("could not find environment for %d", application.deployment_id);
                                    status = "error";
                                    break;
                                }

                                switch (environment.Status) {
                                    case "Updating":
                                        status = "processing";
                                        break;
                                    default:
                                    {
                                        switch (environment.Health) {
                                            case "Green":
                                                status = "ok";
                                                break;
                                            case "Yellow":
                                                status = "warning";
                                                break;
                                            case "Red":
                                                status = "error";
                                                break;
                                            case "Grey":
                                                status = "unknown";
                                                break;
                                        }
                                    }
                                        break;
                                }
                            } while (0);

                            cache.put("application-status:" + application.deployment_id, status, exports.timeout * 2);
                            cache.put("application-version:" + application.deployment_id, environment.VersionLabel, exports.timeout * 2);

                            callback(null);
                        });
                    }, function (callback) {
                        EB.describeApplicationVersions({
                            "ApplicationName": application.application_name,
                            VersionLabels: [
                                cache.get("application-version:" + application.deployment_id)
                            ]
                        }, function (err, data) {
                            if (err) {
                                callback(err);
                                return;
                            }

                            var version = _.first(data.ApplicationVersions);
                            if (!version) {
                                callback("version not found");
                                return;
                            }

                            var sha = /SHA: ([A-F0-9]{40})/i.exec(version.Description);
                            if (sha) {
                                cache.put("application-commit:" + application.deployment_id, sha[1]);
                            }

                            callback(null);
                        });
                    }
                ], callback)
            }, callback);
        }
    ], callback);
}

exports.schedule = '0 * * * * *';
exports.run = checkApplicationStatus;
