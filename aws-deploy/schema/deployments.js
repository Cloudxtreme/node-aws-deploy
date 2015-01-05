var async = require('async');
var _ = require('lodash');
var url = require('url');
var config = require('config');

var schema = require('../../server/schema');
var SchemaError = schema.SchemaError;
var filters = require('../filters');
var db = require('../../server/db');
var cache = require('../cache');

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
    " deployment_name,deployment_created_at,deployment_created_by, deployment_auto_package, deployment_auto_deploy, deployment_auto_clean," +
    " repository_type, repository_url, ISNULL(repository_credentials) AS repository_linked" +
    " FROM awd_deployments" +
    " LEFT JOIN awd_repositories ON awd_repositories.deployment_id = awd_deployments.deployment_id" +
    " ORDER BY deployment_name", function (err, rows) {
        if (err) {
            callback(err);
            return;
        }

        var deployments = rows.map(function (deployment) {
            var application_status = cache.get('application-status:' + deployment.deployment_id);
            var repository_status = cache.get('repository-status:' + deployment.deployment_id);

            var application_commit = cache.get('application-commit:' + deployment.deployment_id);
            var repository_commit = cache.get('repository-commit:' + deployment.deployment_id);

            if ((repository_status === "ok") && (application_commit !== repository_commit)) {
                repository_status = "warning";
            }

            var application_health = cache.get('application-health:' + deployment.deployment_id);

            return _.merge(deployment, {
                application_status: application_status ? application_status : "unknown",
                application_version: cache.get('application-version:' + deployment.deployment_id),
                application_health: application_health ? application_health : "unknown",
                repository_status: repository_status ? repository_status : "unknown"
            });
        });

        callback(null, deployments);
    });
});

schema.on('read', '/deployments',
function getDeployments(callback) {
    db.query("SELECT " +
        " awd_deployments.deployment_id," +
        " deployment_name," +
        " repository_type" +
        " FROM awd_deployments" +
        " LEFT JOIN awd_repositories ON awd_repositories.deployment_id = awd_deployments.deployment_id" +
        " ORDER BY deployment_name", function (err, rows) {
        if (err) {
            callback(err);
            return;
        }

        var deployments = rows.map(function (deployment) {
            var application_status = cache.get('application-status:' + deployment.deployment_id);
            var repository_status = cache.get('repository-status:' + deployment.deployment_id);

            var application_commit = cache.get('application-commit:' + deployment.deployment_id);
            var repository_commit = cache.get('repository-commit:' + deployment.deployment_id);

            if ((repository_status === "ok") && (application_commit !== repository_commit)) {
                repository_status = "warning";
            }

            var application_health = cache.get('application-health:' + deployment.deployment_id);

            return _.merge(deployment, {
                application_status: application_status ? application_status : "unknown",
                application_version: null,
                application_health: application_health ? application_health : "unknown",
                repository_status: repository_status ? repository_status : "unknown",
                repository_url: null
            });
        });

        callback(null, deployments);
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
            " deployment_auto_package = :deployment_auto_package," +
            " deployment_auto_deploy = :deployment_auto_deploy," +
            " deployment_auto_clean = :deployment_auto_clean," +
            " deployment_updated_at = NOW()," +
            " deployment_updated_by = :deployment_updated_by" +
            " WHERE deployment_id = :deployment_id" +
            " LIMIT 1", {
                deployment_name: data.deployment_name,
                deployment_auto_package: data.deployment_auto_package,
                deployment_auto_deploy: data.deployment_auto_deploy,
                deployment_auto_clean: data.deployment_auto_clean,
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

schema.on('read', '/deployments/:deployment_id/log/:page_index',
    filters.authCheck, filters.deploymentReadCheck,
function (deployment_id, page_index, callback) {
    db.query("SELECT * FROM awd_log" +
    " WHERE deployment_id = ?" +
    " ORDER BY log_timestamp DESC" +
    " LIMIT ?, 25", [deployment_id, page_index * 25], function (err, rows) {
        callback(err, rows);
    });
});