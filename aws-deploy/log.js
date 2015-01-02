var _ = require('lodash');
var db = require('../server/db');
var debug = require('debug')('aws-deploy:log');

function Logger() {}

_.assign(Logger.prototype, {
    send: function (deployment_id, type, event, data, info) {
        if (arguments.length == 2) {
            data = type;
            type = deployment_id;
            deployment_id = null;
        }

        if (info) {
            data = _.merge({
                address: info.address
            }, data);
        }

        var encoded = JSON.stringify(data);

        db.query("INSERT INTO awd_log" +
        " (deployment_id,log_type,log_event,log_data,log_timestamp)" +
        " VALUES" +
        " (:deployment_id, :log_type, :log_event, :log_data, NOW())", {
            deployment_id: deployment_id,
            log_type: type,
            log_event: event,
            log_data: encoded
        }, function (err) {
            debug('%s %s %s', type.toUpperCase(), event, JSON.stringify(_.merge({
                deployment_id: deployment_id
            }, data)));
        });
    }
});

module.exports = new Logger();
