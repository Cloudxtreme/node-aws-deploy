var async = require('async');
var _ = require('lodash');
var url = require('url');
var querystring = require('querystring');
var crypto = require('crypto');
var config = require('config');

var schema = require('../../server/schema');
var SchemaError = schema.SchemaError;
var filters = require('../filters');
var db = require('../../server/db');

schema.on('read', '/deployments/:deployment_id/repository',
    filters.authCheck, filters.deploymentWriteCheck,
function readRepository(deployment_id, callback) {
    db.querySingle("SELECT" +
    " deployment_id, repository_type, repository_created_by, repository_url, repository_created_at, IF(ISNULL(repository_credentials),FALSE,TRUE) AS repository_linked" +
    " FROM awd_repositories WHERE deployment_id = ? LIMIT 1", [deployment_id], function (err, repository) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, repository || {
            deployment_id: deployment_id,
            repository_type: null,
            repository_url: null,
            repository_linked: false
        });
    });
});

schema.on('update', '/deployments/:deployment_id/repository',
    filters.authCheck, filters.deploymentWriteCheck,
function updateRepository(deployment_id, data, callback) {
    db.query("UPDATE awd_repositories" +
    " SET repository_url = ?" +
    " WHERE deployment_id = ? LIMIT 1", [data.repository_url, deployment_id], function (err) {
        callback(err);
    });
});

schema.on('emit', '/deployments/:deployment_id/repository',
    filters.authCheck, filters.deploymentWriteCheck,
function emitRepository (deployment_id, method, data, callback, info) {
    switch (method) {
        case 'link': {
            async.waterfall([
                function (callback) {
                    db.querySingle("SELECT * FROM awd_deployments" +
                    " WHERE deployment_id = ? LIMIT 1", [deployment_id], function (err, deployment) {
                        if (err || !deployment) {
                            callback(err || new SchemaError("Deployment not found"));
                            return;
                        }
                        callback(null);
                    });
                }, function (callback) {
                    switch (data.repository_type) {
                        case 'github': {
                            crypto.pseudoRandomBytes(30, function (err, buf) {
                                if (err) {
                                    callback(err);
                                    return;
                                }

                                var state = buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_');

                                db.query("INSERT INTO awd_repositories" +
                                " (deployment_id, repository_type, repository_created_by, repository_created_at, repository_state)" +
                                " VALUES (:deployment_id, :repository_type, :repository_created_by, NOW(), :repository_state)" +
                                " ON DUPLICATE KEY UPDATE" +
                                " repository_type = :repository_type, repository_created_by = :repository_created_by, repository_created_at = NOW(), repository_state = :repository_state, repository_credentials = NULL", {
                                    deployment_id: deployment_id,
                                    repository_type: 'github',
                                    repository_created_by: info.session.user_id,
                                    repository_state: state
                                }, function (err) {
                                    if (err) {
                                        callback(err);
                                        return;
                                    }

                                    var path = url.resolve(config.github.endpoint.auth, '/login/oauth/authorize?') + querystring.stringify({
                                        client_id: config.github.client,
                                        state: state,
                                        scope: "repo"
                                    });

                                    callback(null, path);
                                });
                            });
                        } break;

                        default: {
                            callback(new SchemaError("Unsupported repository type"));
                        } break;
                    }
                }
            ], callback);
        } break;

        case 'unlink': {
            db.query("DELETE FROM awd_repositories" +
            " WHERE deployment_id = ? LIMIT 1", [deployment_id], function (err) {
                callback(err);
            });
        } break;

        default: {
            callback("Unknown method");
        } break;
    }
});
