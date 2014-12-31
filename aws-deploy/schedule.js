var async = require('async');
var _ = require('lodash');
var CronJob = require('cron').CronJob;

var entries = {
    'check-application-status': require('./schedule/check-application-status'),
    'check-repository-status': require('./schedule/check-repository-status')
};

exports.start = function (callback) {
    async.eachSeries(_.values(entries), function (entry, callback) {
        if (!entry.schedule) {
            async.nextTick(callback);
            return;
        }

        entry.run(null, function () {
            var job = new CronJob(entry.schedule, entry.run);
            job.start();
            callback(null);
        });
    }, callback);
};

exports.run = function (name, data, callback) {
    var entry = entries[name];
    if (!entry) {
        async.nextTick(function () {
            callback && callback("could not find function");
        });
        return;
    }

    entry.run(data, callback);
};
