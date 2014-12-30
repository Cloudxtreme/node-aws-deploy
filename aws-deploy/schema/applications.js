var async = require('async');
var _ = require('lodash');
var url = require('url');
var config = require('config');

var schema = require('../../server/schema');
var SchemaError = schema.SchemaError;
var filters = require('../filters');
var db = require('../../server/db');
var cache = require('../cache');
var schedule = require('../schedule');
var AWS = require('../aws-sdk');

var EB = new AWS.ElasticBeanstalk();

schema.on('read', '/deployments/:deployment_id/application',
    filters.authCheck, filters.deploymentWriteCheck,
function (deployment_id, callback) {
    db.querySingle("SELECT" +
    " deployment_id, application_name, application_environment, application_bucket" +
    " FROM awd_applications WHERE deployment_id = ? LIMIT 1", [deployment_id], function (err, application) {
        if (err) {
            callback(err);
            return;
        }

        var application_status = cache.get("application-status:" + deployment_id);
        var application_commit = cache.get("application-commit:" + deployment_id);
        var application_version = cache.get("application-version:" + deployment_id);

        application = application ? _.merge(application, {
            application_status: application_status ? application_status : "unknown",
            application_commit: application_commit,
            application_version: application_version
        }) : {
            deployment_id: deployment_id,
            application_name: null,
            application_environment: null
        };

        callback(null, application);
    });
});

schema.on('read', '/deployments/:deployment_id/versions',
filters.authCheck,
function (deployment_id, callback) {
    async.waterfall([
        function (callback) {
            db.querySingle("SELECT * FROM awd_deployments" +
            " JOIN awd_applications ON awd_applications.deployment_id = awd_deployments.deployment_id" +
            " WHERE awd_deployments.deployment_id = ?", [deployment_id], function (err, deployment) {
                if (err || !deployment) {
                    callback(err || new SchemaError("deployment not found"));
                    return;
                }

                callback(null, deployment);
            });
        }, function (deployment, callback) {
            EB.describeApplicationVersions({
                "ApplicationName": deployment.application_name
            }, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, data.ApplicationVersions.map(function (version) {
                    return {
                        application_name: version.ApplicationName,
                        version_description: version.Description,
                        version_label: version.VersionLabel,
                        version_s3_bucket: version.SourceBundle.S3Bucket,
                        version_s3_key: version.SourceBundle.S3Key,
                        version_created_at: version.DateCreated,
                        version_updated_at: version.DateUpdated
                    };
                }));
            });
        }
    ], callback);
});

schema.on('emit', '/deployments/:deployment_id/application',
    filters.authCheck, filters.deploymentWriteCheck,
function (deployment_id, method, data, callback) {
    switch (method) {
        case 'link': {
            db.query("INSERT INTO awd_applications" +
            " (deployment_id, application_name, application_environment, application_bucket)" +
            " VALUES (:deployment_id, :application_name, :application_environment, :application_bucket)" +
            " ON DUPLICATE KEY UPDATE" +
            " application_name = :application_name, application_environment = :application_environment, application_bucket = :application_bucket", {
                deployment_id: deployment_id,
                application_name: data.application_name,
                application_environment: data.application_environment,
                application_bucket: data.application_bucket
            }, function (err) {
                if (err) {
                    callback(err);
                    return;
                }

                schedule.run('check-application-status', deployment_id, function () {
                    callback(null);
                });
            });
        } break;

        case 'unlink': {
            db.query("DELETE FROM awd_applications WHERE deployment_id = ? LIMIT 1", [deployment_id], function (err) {
                cache.del("application-status:" + deployment_id);
                cache.del("application-commit:" + deployment_id);
                callback(err);
            });
        } break;

        case 'deploy-version': {
            var application;
            async.series([
                function (callback) {
                    db.querySingle("SELECT * FROM awd_deployments" +
                    " JOIN awd_applications ON awd_applications.deployment_id = awd_deployments.deployment_id" +
                    " WHERE awd_deployments.deployment_id = ? LIMIT 1", [deployment_id], function (err,result) {
                        if (err || !result) {
                            callback(err || new SchemaError("Application not found"));
                            return;
                        }

                        application = result;
                        callback(null);
                    });
                }, function (callback) {
                    EB.updateEnvironment({
                        EnvironmentId: application.application_environment,
                        VersionLabel: data.version_label
                    }, function (err, data) {
                        callback(err);
                    });
                }
            ], function (err) {
                callback(err);
            });
        } break;

        case 'restart': {
            async.waterfall([
                function (callback) {
                    db.querySingle("SELECT * FROM awd_deployments" +
                        " JOIN awd_applications ON awd_applications.deployment_id = awd_deployments.deployment_id" +
                        " WHERE awd_deployments.deployment_id = ? LIMIT 1", [deployment_id], function (err,result) {
                        if (err || !result) {
                            callback(err || new SchemaError("Application not found"));
                            return;
                        }

                        callback(null, result);
                    });
                }, function (application, callback) {
                    EB.restartAppServer({
                        EnvironmentId: application.application_environment
                    }, function (err, data) {
                        callback(err);
                    });
                }
            ], function (err) {
                callback(err);
            });
        } break;

        case 'refresh': {
            schedule.run('check-application-status', deployment_id, function (err) {
                if (err) {
                    callback(new SchemaError(err));
                    return;
                }

                callback(null);
            });
        } break;

        default: {
            callback("Unknown method");
        } break;
    }
});
