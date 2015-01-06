var debug = require('debug')('aws-deploy:task:health-check');
var _ = require('lodash');
var async = require('async');
var request = require('request');
var url = require('url');

var db = require('../db');
var AWS = require('../aws-sdk');
var log = require('../log');
var cache = require('../cache');

var ping = require('./checks/ping');

var EC2 = new AWS.EC2();

function healthCheck(deployment_id, callback) {
    var applications;

    if (cache.get("health-check-running")) {
        async.nextTick(callback);
        return;
    }

    cache.put("health-check-running", 1, 10 * 60 * 1000);

    async.series([
        function (callback) {
            db.query("SELECT * FROM (SELECT" +
            " awd_deployments.*, awd_applications.application_name, awd_applications.application_environment," +
            " (SELECT COUNT(*) FROM awd_healthchecks WHERE deployment_id = awd_deployments.deployment_id AND healthcheck_enabled > 0) AS deployment_healthchecks" +
            " FROM awd_deployments" +
            " JOIN awd_applications ON awd_applications.deployment_id = awd_deployments.deployment_id) T1" +
            " WHERE deployment_healthchecks > 0", function (err, rows) {
                if (err) {
                    callback(err);
                    return;
                }

                applications = rows.filter(function (row) {
                    return (!!row.application_name && !!row.application_environment) && (!deployment_id || deployment_id == row.deployment_id);
                });

                callback(null);
            });
        }, function (callback) {
            async.eachSeries(applications, healthCheckApplication, callback);
        }
    ], function (err) {
        cache.del("health-check-running");
        callback && callback(err);
    });
}

function healthCheckApplication(application, callback) {
    var environment;
    var health;

    var instances;
    var checks;

    var old_status = cache.get("application-health:" + application.deployment_id);

    async.series([
        function (callback) {
            db.query("SELECT * FROM awd_healthchecks" +
            " WHERE deployment_id = ? AND healthcheck_enabled > 0", [application.deployment_id], function (err, rows) {
                if (err || !rows.length) {
                    callback(err || "No healthchecks available");
                    return;
                }

                checks = rows;
                callback(null);
            });
        }, function (callback) {
            EC2.describeInstances({}, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                instances = _.chain(data.Reservations).map(function (reservation) {
                    return reservation.Instances.filter(function (instance) {
                        return _.some(instance.Tags, function (tag) {
                            if (tag.Key != "elasticbeanstalk:environment-id") {
                                return false;
                            }

                            return tag.Value == application.application_environment;
                        });
                    });
                }).flatten().value();

                callback(null);
            });
        }, function (callback) {
            async.eachSeries(checks, function (check, callback) {
                switch (check.healthcheck_type) {
                    case 'ping': {
                        ping(check, instances, function (err, message) {
                            cache.put("healthcheck-response:" + check.healthcheck_id, message);
                            cache.put("healthcheck-status:" + check.healthcheck_id, err ? "error" : "ok", 15 * 60 * 1000);

                            health = err || health;
                            callback(null);
                        });
                    } break;

                    default: {
                        async.nextTick(callback);
                    } break;
                }
            }, callback);
        }
    ], function (err) {

        var new_status = health ? "error" : "ok";
        new_status = new_status ? new_status : "unknown";

        if (!old_status && (new_status != "ok")) {
            log.send(application.deployment_id, "info", "application.health", {
                "old_status": "unknown",
                "new_status": new_status
            });
        } else if (old_status && (old_status != new_status)) {
            log.send(application.deployment_id, "info", "application.health", {
                "old_status": old_status,
                "new_status": new_status
            });
        }

        cache.put("application-health:" + application.deployment_id, new_status, 15 * 60 * 1000);
        callback(null);
    });
}
exports.schedule = "15 */5 * * * *";
exports.run = healthCheck;
