var schema = require('../../server/schema');
var filters = require('../filters');
var db = require('../../server/db');
var async = require('async');
var _ = require('lodash');

schema.on('create', '/deployments',
    filters.authCheck,
function createDeployment(data, callback, info) {
    data.deployment_created_by = info.session.user_id;
    db.query("INSERT INTO awd_deployments" +
    " (deployment_name,deployment_created_at,deployment_created_by,deployment_application,deployment_environment,deployment_repo_type,deployment_repo_url)" +
    " VALUES" +
    " (:deployment_name,NOW(),:deployment_created_by,:deployment_application,:deployment_environment,:deployment_repo_type,:deployment_repo_url)", data, function (err, result) {
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
    " deployment_id,deployment_name,deployment_created_at,deployment_created_by," +
    " deployment_application,deployment_environment," +
    " deployment_repo_type,deployment_repo_url, IF(ISNULL(deployment_repo_access_token),0,1) AS deployment_repo_auth" +
    " FROM awd_deployments" +
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
            " deployment_application = :deployment_application," +
            " deployment_environment = :deployment_environment," +
            " deployment_repo_type = :deployment_repo_type," +
            " deployment_repo_url = :deployment_repo_url" +
            " WHERE deployment_id = :deployment_id" +
            " LIMIT 1", data, callback);
        }
    ], callback);
});

schema.on('destroy', '/deployments/:deployment_id',
    filters.authCheck, filters.deploymentWriteCheck,
function destroyDeployment(deployment_id, callback) {
    db.query("DELETE FROM awd_deployments WHERE deployment_id = ? LIMIT 1", [deployment_id], callback);
});
