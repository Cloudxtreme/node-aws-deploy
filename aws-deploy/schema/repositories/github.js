var config = require('config');
var async = require('async');
var crypto = require('crypto');
var request = require('request');
var url = require('url');

var schema = require('../../../server/server').schema;
var SchemaError = require('../../../server/server').errors.SchemaError;
var db = require("../../db");
var filters = require('../../filters');
var schedule = require('../../schedule');
var log = require('../../log');

schema.on('read', '/repository/github/callback',
    filters.authCheck,
function (callback, info) {
    async.waterfall([
        function (callback) {
            db.querySingle("SELECT * FROM awd_repositories" +
            " JOIN awd_deployments ON awd_repositories.deployment_id = awd_deployments.deployment_id" +
            " WHERE repository_state = ? LIMIT 1", [info.request.query["state"]], function (err, deployment) {
                if (err || !deployment) {
                    log.send(null, "error", "github.callback-failed", {
                        "state": info.request.query["state"]
                    }, info);
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
                    "Accept": "application/json",
                    "User-Agent": config.github.useragent
                }
            }, function (err, response, body) {
                if (err || response.statusCode != 200 || !body.hasOwnProperty("access_token")) {
                    log.send(deployment.deployment_id, "error", "github.oauth-failed", {
                        "client": config.github.client,
                        "status": response ? response.statusCode : null
                    }, info);
                    callback(err || new SchemaError("Request failed"));
                    return;
                }

                log.send(deployment.deployment_id, "info", "github.oauth-success", {
                    "client": config.github.client
                });

                db.query("UPDATE awd_repositories SET repository_credentials = ? WHERE deployment_id = ? LIMIT 1", [body.access_token, deployment.deployment_id], function (err) {
                    callback(err, deployment.deployment_id);
                });
            });
        }
    ], function (err, deployment_id) {
        info.response.redirect(err ? "/" : "/#deployments/" + deployment_id + "/repository");
    });
});

schema.on('create', '/repository/github/trigger',
function (data, callback, info) {
    var url;
    var repositories;

    async.series([
        function (callback) {
            var event = info.request.headers['x-github-event'];
            if (event !== "push") {
                callback(new SchemaError("not a push event"));
                return;
            }

            var m1 = /([^\/]+)\/(.+)/.exec(data.hasOwnProperty("repository") ? data.repository.full_name : "");
            if (!m1) {
                callback(new SchemaError("no repo in request"));
            }
            var owner = m1[1];
            var repo = m1[2];

            var m2 = /refs\/heads\/(.+)/.exec(data.ref);
            if (!m2) {
                callback(new SchemaError("no branch in request"));
                return;
            }
            var branch = m2[1];

            url = owner + "/" + repo + "#" + branch;
            callback(null);
        }, function (callback) {
            db.query("SELECT * FROM awd_repositories" +
            " JOIN awd_deployments ON awd_deployments.deployment_id = awd_repositories.deployment_id" +
            " WHERE repository_url = ? AND NOT ISNULL(repository_secret) AND repository_type = 'github'", [url], function (err, rows) {
                if (err) {
                    callback(err);
                    return;
                }

                repositories = rows;
                callback(null);
            });
        }, function (callback) {
            var m = /sha1=([0-9A-F]{40})/i.exec(info.request.headers['x-hub-signature']);
            if (!m) {
                callback(new SchemaError("could not find signature"));
                return;
            }

            var signature = m[1];
            var body = JSON.stringify(data);

            var count = 0;
            async.eachSeries(repositories, function (repository, callback) {
                var hash = crypto.createHmac('sha1', repository.repository_secret).update(body).digest('hex');
                if (hash !== signature) {
                    async.nextTick(callback);
                    return;
                }

                ++ count;

                log.send(repository.deployment_id, 'info', 'github.trigger', {
                    "url": url,
                    "commit": data.after,
                    "pusher": data.hasOwnProperty("pusher") ? data.pusher.name : undefined
                });

                schedule.run('check-repository-status', repository.deployment_id, function (err) {
                    async.nextTick(callback);
                });
            }, function (err) {
                if (!count) {
                    log.send(null, 'warning', 'github.trigger-failed', {
                        "url": url,
                        "commit": data.after,
                        "pusher": data.hasOwnProperty("pusher") ? data.pusher.name : undefined
                    });
                }
                callback(err);
            });
        }
    ], function (err) {
        callback(err);
    });
});

schema.on('read', '/repository/github/:deployment_id/urls',
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
                    "User-Agent": config.github.useragent,
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

schema.on('read', '/repository/github/:deployment_id/branches/:owner/:repo',
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
                    "User-Agent": config.github.useragent,
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
