var debug = require('debug')('aws-deploy:task:create-application-version');
var async = require('async');
var _ = require('lodash');

var db = require('../../server/db');
var cache = require('../cache');
var schedule = require('../schedule');
var log = require('../log');

function autoPackage(dummy, callback) {
    var deployments;

    if (cache.get("auto-package-running")) {
        async.nextTick(function () {
            callback("auto-package still running");
        });
        return;
    }

    cache.put("auto-package-running", 1, 10 * 60 * 1000);
    async.series([
        function (callback) {
            db.query("SELECT * FROM awd_deployments" +
            " JOIN awd_repositories ON awd_repositories.deployment_id = awd_deployments.deployment_id" +
            " JOIN awd_applications ON awd_applications.deployment_id = awd_deployments.deployment_id" +
            " WHERE deployment_auto_package > 0",
            function (err, rows) {
                if (err) {
                    callback(err);
                    return;
                }

                deployments = rows;
                callback(null);
            });
        }, function (callback) {
            async.eachSeries(deployments, function (deployment, callback) {
                var version_label;
                async.series([
                    function (callback) {
                        var repository_commit = cache.get("repository-commit:" + deployment.deployment_id);
                        var repository_status = cache.get("repository-status:" + deployment.deployment_id);
                        var application_commit = cache.get("application-commit:" + deployment.deployment_id);
                        var application_status = cache.get("application-status:" + deployment.deployment_id);

                        if ((repository_status != "ok") || (application_status != "ok")) {
                            async.nextTick(function () {
                                callback("not ready yet");
                            });
                            return;
                        }

                        var attempted_commit = cache.get("attempted_commit:" + deployment.deployment_id);
                        if (!repository_commit || !application_commit || (repository_commit == application_commit) || (repository_commit == attempted_commit)) {
                            async.nextTick(function () {
                                callback("no commit available");
                            });
                            return;
                        }
                        cache.put("attempted-commit:" + deployment.deployment_id, repository_commit, 5 * 60 * 1000);

                        callback(null);
                    }, function (callback) {
                        if (deployment.deployment_auto_clean > 0) {
                            schedule.run('clean-application-versions', deployment.deployment_id, function (err) {
                                callback(err);
                            });
                        } else {
                            async.nextTick(callback);
                        }
                    }, function (callback) {
                        schedule.run('create-application-package', deployment.deployment_id, function (err, result) {
                            version_label = result;
                            callback(err);
                        });
                    }, function (callback) {
                        if (deployment.deployment_auto_deploy) {
                            schedule.run('deploy-application-version', {
                                deployment_id: deployment.deployment_id,
                                version_label: version_label
                            }, function (err) {
                               callback(err);
                            });
                        } else {
                            async.nextTick(callback);
                        }
                    }, function (callback) {
                        if (deployment.deployment_auto_deploy) {
                            schedule.run('check-application-status', deployment.deployment_id, function (err) {
                                callback(err);
                            });
                        } else {
                            async.nextTick(callback);
                        }
                    }
                ], function (err) {
                    callback(null);
                });
            }, callback);
        }
    ], function (err) {
        cache.del("auto-package-running");
        callback && callback(err);
    });
}
exports.schedule = "30 * * * * *";
exports.run = autoPackage;