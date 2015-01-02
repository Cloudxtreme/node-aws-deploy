var debug = require('debug')('aws-deploy:task:clean-application-versions');
var _ = require('lodash');
var async = require('async');

var db = require('../../server/db');
var AWS = require('../aws-sdk');

var EB = new AWS.ElasticBeanstalk();

function deployApplicationVersion(data, callback) {
    var application;
    async.series([
        function (callback) {
            db.querySingle("SELECT * FROM awd_deployments" +
                " JOIN awd_applications ON awd_applications.deployment_id = awd_deployments.deployment_id" +
                " WHERE awd_deployments.deployment_id = ? LIMIT 1", [data.deployment_id], function (err,result) {
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
                if (err) {
                    log.send(application.deployment_id, 'error', 'application.deploy-failed', {
                        "environment_id": application.application_environment,
                        "version_label": data.version_label,
                        "error": err
                    });
                } else {
                    log.send(application.deployment_id, 'error', 'application.deploy-success', {
                        "environment_id": application.application_environment,
                        "version_label": data.version_label
                    });
                }
                callback(err);
            });
        }
    ], function (err) {
        callback(err);
    });

}

exports.run = deployApplicationVersion;
