var async = require('async');
var _ = require('lodash');
var url = require('url');
var config = require('config');

var schema = require('../../server/schema');
var SchemaError = schema.SchemaError;
var filters = require('../filters');
var db = require('../../server/db');

schema.on('create', '/deployments',
    filters.authCheck,
function createDeployment(data, callback, info) {
    data.deployment_created_by = info.session.user_id;
    db.query("INSERT INTO awd_deployments" +
    " (deployment_name,deployment_created_at,deployment_created_by)" +
    " VALUES" +
    " (:deployment_name,NOW(),:deployment_created_by)", data, function (err, result) {
        if (err) {
            callback(err);
            return;
        }

        data.deployment_id = result.insertId.toString();
        callback(null, data);
    });
});

schema.on('read', '/deployments',
    filters.authCheck,
function getDeployments(callback) {
    db.query("SELECT " +
    " awd_deployments.deployment_id," +
    " deployment_name,deployment_created_at,deployment_created_by," +
    " repository_type, repository_url, ISNULL(repository_credentials) AS repository_linked" +
    " FROM awd_deployments" +
    " LEFT JOIN awd_repositories ON awd_repositories.deployment_id = awd_deployments.deployment_id" +
    " ORDER BY deployment_name", function (err, rows) {
        callback(err, rows);
    });
});

schema.on('update', '/deployments/:deployment_id',
    filters.authCheck, filters.deploymentWriteCheck,
function updateDeployment(deployment_id, data, callback, info) {
    async.series([
        function (callback) {
            db.querySingle("SELECT * FROM awd_deployments WHERE deployment_id = ? LIMIT 1", [deployment_id], function (err, deployment) {
                if (err || !deployment) {
                    callback(err || new SchemaError("Could not find deployment"));
                    return;
                }

                data.deployment_id = deployment_id;
                _.defaults(data, deployment);

                callback(null);
            });
        }, function (callback) {
            db.query("UPDATE awd_deployments SET" +
            " deployment_name = :deployment_name," +
            " deployment_updated_at = NOW()," +
            " deployment_updated_by = :deployment_updated_by" +
            " WHERE deployment_id = :deployment_id" +
            " LIMIT 1", {
                deployment_name: data.deployment_name,
                deployment_updated_by: info.session.user_id,
                deployment_id: deployment_id
            }, callback);
        }
    ], function (err) {
        callback(err);
    });
});

schema.on('destroy', '/deployments/:deployment_id',
    filters.authCheck, filters.deploymentWriteCheck,
function destroyDeployment(deployment_id, callback) {
    db.query("DELETE FROM awd_deployments WHERE deployment_id = ? LIMIT 1", [deployment_id], callback);
});
