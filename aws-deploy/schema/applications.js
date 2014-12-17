var async = require('async');
var _ = require('lodash');
var url = require('url');
var config = require('config');

var schema = require('../../server/schema');
var SchemaError = schema.SchemaError;
var filters = require('../filters');
var db = require('../../server/db');

schema.on('read', '/deployments/:deployment_id/application',
    filters.authCheck, filters.deploymentWriteCheck,
function (deployment_id, callback) {
    db.querySingle("SELECT" +
    " deployment_id, application_name, application_environment" +
    " FROM awd_applications WHERE deployment_id = ? LIMIT 1", [deployment_id], function (err, application) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, application || {
            deployment_id: deployment_id,
            application_name: null,
            application_environment: null
        });
    });
});

schema.on('emit', '/deployments/:deployment_id/application',
    filters.authCheck, filters.deploymentWriteCheck,
function (deployment_id, method, data, callback) {
    switch (method) {
        case 'link': {
            db.query("INSERT INTO awd_applications" +
            " (deployment_id, application_name, application_environment)" +
            " VALUES (:deployment_id, :application_name, :application_environment)" +
            " ON DUPLICATE KEY UPDATE" +
            " application_name = :application_name, application_environment = :application_environment", {
                deployment_id: deployment_id,
                application_name: data.application_name,
                application_environment: data.application_environment
            }, function (err) {
                callback(err);
            });
        } break;

        case 'unlink': {
            db.query("DELETE FROM awd_applications WHERE deployment_id = ? LIMIT 1", [deployment_id], function (err) {
                callback(err);
            });
        } break;

        default: {
            callback("Unknown method");
        } break;
    }
});
