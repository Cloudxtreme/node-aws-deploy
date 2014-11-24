var mysql = require('mysql');
var debug = require('debug')('aws-deploy:mysql');
var config = require('config');
var _ = require('lodash');
var db = require('../db');

var pool = mysql.createPool({
    host: config.db.mysql.host,
    user: config.db.mysql.user,
    password: config.db.mysql.password,
    database: config.db.mysql.database,
    charset: config.db.mysql.charset,
    connectionLimit: config.db.mysql.limit,
    debug: config.db.mysql.debug,

    queryFormat: function queryFormat(query, values) {
        if (_.isArray(values)) {
            values = _.clone(values);
            return query.replace(/(\?)/g, function (text, key) {
                return values.length > 0 ? this.escape(values.shift()) : null;
            })
        } else if (_.isObject(values)) {
            return query.replace(/\:(\w+)/g, function (text, key) {
                if (values.hasOwnProperty(key)) {
                    return this.escape(values[key]);
                }
                return null;
            })
        } else {
            return query;
        }
    }
});

exports.query = function (query, params, callback, context) {
    if (_.isFunction(callback)) {
        context = callback;
        callback = params;
        params = undefined;
    }

    pool.query(query, params, function (err, rows, fields) {
        if (err) {
            callback(new DbError(err));
        }

        if (callback) {
            callback.apply(context, [null, rows, fields]);
        }
    });
};

exports.querySingle = function (query, params, callback, context) {
    if (_.isFunction(callback)) {
        context = callback;
        callback = params;
        params = undefined;
    }

    exports.query(query, params, function (err, rows) {
        if (err || !_.isArray(rows)) {
            callback(new DbError(err || "Response not in row format"));
            return;
        }

        if (callback) {
            callback.apply(context, [null, rows[0]]);
        }
    });
};
