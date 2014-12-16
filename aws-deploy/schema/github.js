var config = require('config');
var async = require('async');
var crypto = require('crypto');
var request = require('request');
var url = require('url');

var schema = require('../../server/schema');
var SchemaError = schema.SchemaError;
var db = require("../../server/db")
var filters = require('../filters');

schema.on('read', '/github/callback',
    filters.authCheck,
function (callback, info) {
    async.waterfall([
        function (callback) {
            db.querySingle("SELECT * FROM awd_repositories" +
            " JOIN awd_deployments ON awd_repositories.deployment_id = awd_deployments.deployment_id" +
            " WHERE repository_state = ? LIMIT 1", [info.request.query["state"]], function (err, deployment) {
                if (err || !deployment) {
                    callback(err || new SchemaError("Deployment not found"));
                    return;
                }

                callback(null, deployment);
            });
        }, function (deployment, callback) {
            request.post({
                url: url.resolve(config.github.endpoint.auth, "/login/oauth/access_token"),
                json: true,
                body: {
                    client_id: config.github.client,
                    client_secret: config.github.secret,
                    code: info.request.query["code"]
                },
                headers: {
                    "accept": "application/json"
                }
            }, function (err, response, body) {
                if (err || response.statusCode != 200 || !body.hasOwnProperty("access_token")) {
                    callback(err || new SchemaError("Request failed"));
                    return;
                }

                db.query("UPDATE awd_repositories SET repository_credentials = ? WHERE deployment_id = ? LIMIT 1", [body.access_token, deployment.deployment_id], function (err) {
                    callback(err, deployment.deployment_id);
                });
            });
        }
    ], function (err, deployment_id) {
        info.response.redirect(err ? "/" : "/#deployments/" + deployment_id + "/repository");
    });
});

schema.on('read', '/github/:deployment_id/urls',
    filters.authCheck, filters.deploymentWriteCheck,
function (deployment_id, callback) {
    async.waterfall([
        function (callback) {
            db.querySingle("SELECT * FROM awd_repositories WHERE deployment_id = ? LIMIT 1", [deployment_id], function (err, repository) {
                if (err || !repository) {
                    callback(err || new SchemaError("Could not find repository"));
                    return;
                }

                if (repository.repository_type != 'github' || !repository.repository_credentials) {
                    callback(new SchemaError("Repository linking not completed"));
                    return;
                }

                callback(null, repository);
            });
        }, function (repository, callback) {
            request.get({
                url: url.resolve(config.github.endpoint.api, "/user/repos"),
                json: true,
                headers: {
                    "Authorization": "token " + repository.repository_credentials,
                    "User-Agent": "node-aws-deploy",
                    "Accept": "application/vnd.github.moondragon-preview+json"
                }
            }, function (err, response, body) {
                if (err || response.statusCode != 200) {
                    callback(err || new SchemaError("Request failed"));
                    return;
                }

                callback(null, body.map(function (repo) {
                    return {
                        id: repo.id,
                        full_name: repo.full_name,
                        git_url: repo.git_url,
                        html_url: repo.html_url
                    };
                }));
            });
        }
    ], callback);
});

schema.on('read', '/github/:deployment_id/branches/:owner/:repo',
    filters.authCheck, filters.deploymentWriteCheck,
function (deployment_id, owner, repo, callback) {
    async.waterfall([
        function (callback) {
            db.querySingle("SELECT * FROM awd_repositories WHERE deployment_id = ? LIMIT 1", [deployment_id], function (err, repository) {
                if (err || !repository) {
                    callback(err || new SchemaError("Could not find repository"));
                    return;
                }

                if (repository.repository_type != 'github' || !repository.repository_credentials) {
                    callback(new SchemaError("Repository linking not completed"));
                    return;
                }

                callback(null, repository);
            });
        }, function (repository, callback) {
            request.get({
                url: url.resolve(config.github.endpoint.api, "/repos/" + owner + "/" + repo + "/branches"),
                json: true,
                headers: {
                    "Authorization": "token " + repository.repository_credentials,
                    "User-Agent": "node-aws-deploy",
                    "Accept": "application/vnd.github.moondragon-preview+json"
                }
            }, function (err, response, body) {
                if (err || response.statusCode != 200) {
                    callback(err || new SchemaError("Request failed"));
                    return;
                }

                callback(null, body.map(function (repo) {
                    return {
                        name: repo.name,
                        sha: repo.commit.sha
                    };
                }));
            });
        }
    ], callback);
});
