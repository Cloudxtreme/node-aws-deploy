var _ = require('lodash');
var async = require('async');

var apps = [
    require('./apps/main/main')
];

exports.mount = function (express, callback) {
    async.eachSeries(apps, function (app, callback) {
        app.mount(express, callback);
    }, callback);
};
