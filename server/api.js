var schema = require('./schema');
var db = require('./db');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var config = require('config');
var _ = require('lodash');

exports.sessionHandler = function () {
    var store;
    switch (config.session.store) {
        case "memory": break;
        case "redis": {
            store = new RedisStore(config.session.redis);
        } break;
    }

    return session({
        store: store,
        secret: config.session.secret,
        resave: false,
        saveUninitialized: true
    });
};

function ApiError(statusCode, message) {
    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.message = message;
}
require('util').inherits(ApiError, Error);

exports.errorHandler = function (err, req, res, next) {
    switch (err.constructor) {
        case ApiError: {
            res.status(err.statusCode).set({
                "Content-Type": "application/json"
            }).send({
                message: err.message
            });
        } break;

        case db.DbError: {
            res.status(403).set({
                "Content-Type": "application/json"
            }).send({
                message: err.message
            });
        } break;

        case schema.SchemaError: {
            res.status(403).set({
                "Content-Type": "application/json"
            }).send({
                message: err.message
            });
        } break;

        default: {
            res.status(500).set({
                "Content-Type": "text/html"
            }).send("<html><body><h1>Internal Server Error</h1></body></html>");
        } break;
    }
};

exports.login = function (req, res, next) {
    next(new ApiError(404, "Login Not Implemented"));
};

exports.token = function (req, res, next) {
    next(new ApiError(403, "Token Not Available"));
};

exports.request = function (req, res, next) {
    var info = {
        session: req.session,
        address: req.headers['x-forwarded-for'] ||
        req.connection.remoteAddress ||
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress,
        request: req,
        response: res
    };

    switch (req.headers['x-http-method'] || req.method) {
        case 'GET': {
            exports.read(req, res, next, info);
        } break;

        case 'PUT': {
            exports.update(req, res, next, info);
        } break;

        case 'POST': {
            exports.create(req, res, next, info);
        } break;

        case 'DELETE': {
            exports.destroy(req, res, next, info);
        } break;

        case 'EMIT': {
            exports.emit(req, res, next, info);
        } break;

        default: {
            next(new ApiError(400, "Bad Request"));
        } break;
    }
};

exports.read = function (req, res, next, info) {
    schema.read('/' + req.params[0], info, function (err, data) {
        if (err) {
            next(err);
            return;
        }

        if (res.headersSent) {
            return;
        }

        var encoded = new Buffer(JSON.stringify(data ? data : {}));

        res.status(200).set({
            "Content-Type": "application/json",
            "Content-Length": encoded.length,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }).send(encoded);
    });
};

exports.update = function (req, res, next, info) {
    if (!req.body || !_.isObject(req.body)) {
        next(new ApiError(403, "Access Denied"));
        return;
    }

    schema.update('/' + req.params[0], req.body, info, function (err, data) {
        if (err) {
            next(err);
            return;
        }

        if (res.headersSent) {
            return;
        }

        var encoded = new Buffer(JSON.stringify(data ? data : {}));

        res.status(200).set({
            "Content-Type": "application/json",
            "Content-Length": encoded.length,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }).send(encoded);
    });
};

exports.create = function (req, res, next, info) {
    if (!req.body || !_.isObject(req.body)) {
        next(new ApiError(403, "Forbidden"));
        return;
    }

    schema.create('/' + req.params[0], req.body, info, function (err, data) {
        if (err) {
            next(err);
            return;
        }

        if (res.headersSent) {
            return;
        }

        var encoded = new Buffer(JSON.stringify(data ? data : {}));

        res.status(200).set({
            "Content-Type": "application/json",
            "Content-Length": encoded.length,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }).send(encoded);
    });
};

exports.destroy = function (req, res, next, info) {
    schema.destroy('/' + req.params[0], info, function (err, data) {
        if (err) {
            next(err);
            return;
        }

        if (res.headersSent) {
            return;
        }

        var encoded = new Buffer(JSON.stringify(data ? data : {}));

        res.status(200).set({
            "Content-Type": "application/json",
            "Content-Length": encoded.length,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }).send(encoded);
    });
};

exports.emit = function (req, res, next, info) {
    if (!req.body || !_.isObject(req.body)) {
        next(new ApiError(403, "Forbidden"));
        return;
    }

    var method = req.body.method;
    var data = req.body.data;

    if (!_.isString(method) || !_.isObject(data)) {
        next(new ApiError(403, "Forbidden"));
        return;
    }

    schema.emit('/' + req.params[0], method, data, info, function (err, data) {
        if (err) {
            next(err);
            return;
        }

        if (res.headersSent) {
            return;
        }

        var encoded = new Buffer(JSON.stringify(data ? data : {}));

        res.status(200).set({
            "Content-Type": "application/json",
            "Content-Length": encoded.length,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }).send(encoded);
    });
};
