var debug = require('debug')('aws-deploy:task:check-application-status');
var async = require("async");
var AWS = require('../aws-sdk');
var _ = require('lodash');

var db = require('../../server/db');
var cache = require('../cache');
var log = require('../log');

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

                var old_status = cache.get("application-status:" + application.deployment_id);
                old_status = old_status ? old_status : "unknown";

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

                            cache.put("application-status:" + application.deployment_id, status);
                            cache.put("application-version:" + application.deployment_id, !_.isUndefined(environment) ? environment.VersionLabel : "");

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
                ], function (err) {
                    var new_status = cache.get("application-status:" + application.deployment_id);
                    new_status = new_status ? new_status : "unknown";

                    if ((new_status != old_status)) {
                        log.send(application.deployment_id, "info", "application.status", {
                            "old_status": old_status,
                            "new_status": new_status
                        });
                    }
                    callback(err);
                });
            }, callback);
        }
    ], callback);
}

exports.schedule = '0 * * * * *';
exports.run = checkApplicationStatus;
