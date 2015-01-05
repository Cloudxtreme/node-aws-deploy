var debug = require('debug')('aws-deploy:task:clean-application-versions');
var _ = require('lodash');
var async = require('async');
var request = require('request');
var url = require('url');

var db = require('../../server/db');
var AWS = require('../aws-sdk');
var log = require('../log');
var cache = require('../cache');

var EB = new AWS.ElasticBeanstalk();
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
    var health = "ok";

    var instances;
    var checks;

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
            async.eachSeries(checks, function (check) {
                switch (check.healthcheck_type) {
                    case 'ping': {
                        async.eachSeries(instances, function (instance, callback) {
                            var address = instance.hasOwnProperty("PublicIpAddress") ? instance.PublicIpAddress : instance.PrivateIpAddress;
                            var uri = url.resolve("http://" + address + ':' + check.healthcheck_port, check.healthcheck_uri ? check.healthcheck_uri : '/');
                            callback = _.once(callback);

                            request
                                .get({uri: uri})
                                .on('response', function (response) {
                                        callback(response.statusCode != 200);
                                    })
                                .on('error', function (err) {
                                    callback(err);
                                });
                        }, function (err) {
                            cache.put("healthcheck-status:" + check.healthcheck_id, err ? "error" : "ok", 15 * 60 * 1000);
                            callback(err);
                        });
                    } break;

                    default: {
                        async.nextTick(callback);
                    } break;
                }
            }, callback);
        }
    ], function (err) {
        if (err) {
            health = "error";
        }
        cache.put("application-health:" + application.deployment_id, health, 15 * 60 * 1000);
        callback(null);
    });
}
exports.schedule = "15 */5 * * * *";
exports.run = healthCheck;
