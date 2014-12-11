var config = require('config');
var assert = require('assert');

function DbError(err) {
    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);

    this.name = this.constructor.name;
    this.message = err;
}
require('util').inherits(DbError, Error);
exports.DbError = DbError;

switch (config.db.type) {
    case 'mysql': {
        var mysql = require('./db/mysql');

        exports.query = mysql.query;
        exports.querySingle = mysql.querySingle;
    } break;

    default: {
        assert(null, "Invalid db backend");
    }
}
