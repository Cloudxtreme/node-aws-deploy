var config = require('config');
var assert = require('assert');

function DbError(err) {
    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);

    this.name = this.constructor.name;
    this.message = message;
}
require('util').inherits(DbError, Error);

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
