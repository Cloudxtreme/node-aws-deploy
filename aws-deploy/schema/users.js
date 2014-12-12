var schema = require('../../server/schema');
var SchemaError = schema.SchemaError;
var db = require('../../server/db');
var filters = require('../filters');
var _ = require('lodash');
var bcrypt = require('bcryptjs');
var config = require('config');
var async = require('async');

schema.on('read', '/session', function (callback, info) {
    var session = info.session;
    callback(null, {
        session_id: session.id,
        user_id: !_.isUndefined(session.user_id) ? session.user_id : 0
    });
});

schema.on('destroy', '/session',
filters.authCheck,
function destroySession(callback, info) {
    var session = info.session;

    delete session.user_id;
    callback(null, {
        session_id: session.id,
        user_id: 0
    });
});

schema.on('emit', '/session', function (method, data, callback, info) {
    var session = info.session;

    if (!_.isString(data.user_pass)) {
        callback(new SchemaError("Invalid password"));
        return;
    }

    switch (method) {
        case 'login': {
            async.waterfall([
                function getUserData(callback) {
                    db.querySingle("SELECT user_id, user_pass FROM awd_users WHERE user_email = :user_email LIMIT 1", data, function (err, user) {
                        if (err || !user) {
                            callback(err || new SchemaError("Could not find user"));
                            return;
                        }

                        callback(null, user);
                    });
                }, function verifyPassword(user, callback) {
                    bcrypt.compare(data.user_pass, user.user_pass, function (err, res) {
                        if (err || (res != true)) {
                            callback(new SchemaError(err || "Login failed"));
                            return;
                        }

                        callback(null, user.user_id);
                    });
                }
            ], function loginUser(err, user_id) {
                if (err) {
                    callback(err);
                    return;
                }

                var session = info.session;
                session.user_id = user_id;
                callback(null, {
                    session_id: session.id,
                    user_id: user_id
                });
            });
        } break;

        default: {
            callback(new SchemaError("Unknown method"));
        } break;
    }
});

schema.on('create', '/user',
function (data, callback, info) {
    if (!config.users.register) {
        callback(new SchemaError("User registration is disabled"));
        return;
    }

    if (!(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,6}$/i).test(data.user_email)) {
        callback(new SchemaError("Invalid email address"));
        return;
    }

    async.series([
        function ensureUniqueEmail(callback) {
            db.querySingle("SELECT * FROM awd_users WHERE user_email = :user_email LIMIT 1", data, function (err, user) {
                if (err || user) {
                    callback(err || new SchemaError("User already exists"));
                    return;
                }

                callback(null);
            });
        }, function encryptPassword(callback) {
            bcrypt.genSalt(10, function (err, salt) {
                if (err) {
                    callback(new SchemaError(err));
                    return;
                }

                bcrypt.hash(data.user_pass, salt, function (err, hash) {
                    if (err) {
                        callback(new SchemaError(err));
                        return;
                    }

                    data.user_pass = hash;
                    callback(null);
                });
            });
        }
    ], function createUser(err) {
        if (err) {
            callback(err);
            return;
        }

        db.query("INSERT INTO awd_users" +
        " (user_email, user_name, user_pass, user_created_at, user_created_from, user_level)" +
        " VALUES" +
        " (:user_email, :user_name, :user_pass, NOW(), :user_created_from, 0)", {
            user_email: data.user_email,
            user_name: data.user_name,
            user_pass: data.user_pass,
            user_created_from: info.address
        }, function (err, result) {
            if (err) {
                callback(err);
                return;
            }

            data.user_id = result.insertId.toString();
            delete data.user_pass;

            var session = info.session;
            session.user_id = data.user_id;
            callback(null, data);
        });
    });
});

schema.on('read', '/users/:user_id',
filters.authCheck,
function (user_id, callback, info) {
    if (info.session.user_id != user_id) {
        callback(new SchemaError("Access Denied"));
        return;
    }

    db.query("SELECT user_email, user_name FROM awd_users WHERE user_id = ? LIMIT 1", [user_id], function (err, rows) {
        callback(err, rows);
    });
});
