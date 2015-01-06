var _ = require('lodash');
var async = require('async');
var request = require('request');
var url = require('url');

var cache = require('../../cache');

function ping(check, instances, callback) {
    var message = "";
    async.eachSeries(instances, function (instance, callback) {
        var address = instance.hasOwnProperty("PublicDnsName") ? instance.PublicDnsName : instance.PrivateDnsName;
        var uri = url.resolve("http://" + address + ':' + check.healthcheck_port, check.healthcheck_uri ? check.healthcheck_uri : '/');
        callback = _.once(callback);

        request
            .get({
                uri: uri,
                timeout: 5000
            })
            .on('response', function (response) {
                message = response.statusCode;
                callback(response.statusCode != 200);
            })
            .on('error', function (err) {
                message = err.code;
                callback(err);
            });
    }, function (err) {
        callback(err, message);
    });
}

module.exports = ping;