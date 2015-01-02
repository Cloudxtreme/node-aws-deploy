var debug = require('debug')('aws-deploy:task:check-repository-status');
var async = require('async');
var request = require('request');
var config = require('config');
var _ = require('lodash');
var url = require('url');
var CronJob = require('cron').CronJob;

var db = require('../../server/db');
var cache = require('../cache');
var log = require('../log');

function checkRepositoryStatus(deployment_id, callback) {
    var repositories;

    async.series([
        function (callback) {
            db.query("SELECT * FROM awd_deployments" +
            " JOIN awd_repositories ON awd_deployments.deployment_id = awd_repositories.deployment_id", function (err, rows) {
                if (err) {
                    callback(err);
                    return;
                }

                repositories = rows.filter(function (row) {
                    return !!row.repository_credentials && (!deployment_id || deployment_id == row.deployment_id);
                });

                callback(null);
            });
        }, function (callback) {
            async.each(repositories, function (repository, callback) {
                var old_status = cache.get("repository-status:" + repository.deployment_id);
                old_status = old_status ? old_status : "unknown";

                async.series([
                    function (callback) {
                        switch (repository.repository_type) {
                            case 'github': {
                                var repo = /([^\/]+)\/([^#]+)#(.+)/i.exec(repository.repository_url);

                                request.get({
                                    url: url.resolve(config.github.endpoint.api, '/repos/' + repo[1] + '/' + repo[2] + '/branches/' + repo[3]),
                                    json: true,
                                    headers: {
                                        "Authorization": "token " + repository.repository_credentials,
                                        "User-Agent": config.github.useragent,
                                        "Accept": "application/vnd.github.moondragon-preview+json"
                                    }
                                }, function (err, response, body) {
                                    if (err || response.statusCode != 200) {
                                        cache.put("repository-status:" + repository.deployment_id, "error");
                                        callback(err || "Request failed");
                                        return;
                                    }

                                    var repository_commit = body.hasOwnProperty("commit") ? body.commit.sha : null;
                                    cache.put("repository-commit:" + repository.deployment_id, repository_commit);
                                    cache.put("repository-status:" + repository.deployment_id, "ok");

                                    callback(null);
                                });
                            } break;
                            default: {
                                async.nextTick(function () {
                                    cache.put("repository-status:" + repository.deployment_id, "error");
                                    callback("Unknown repository type");
                                });
                            } break;
                        }
                    }
                ], function (err) {
                    var new_status = cache.get("repository-status:" + repository.deployment_id);
                    new_status = new_status ? new_status : "unknown";

                    if (old_status != new_status) {
                        log.send(repository.deployment_id, 'info', 'repository.status', {
                            "old_status": old_status,
                            "new_status": new_status
                        });
                    }

                    callback(err);
                });

            }, callback);
        }
    ], callback);
}

exports.schedule = '0 */15 * * * *';
exports.run = checkRepositoryStatus;
