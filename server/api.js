var session = require('express-session');
var RedisStore = require('connect-redis')(session);
var config = require('config');
var debug = require('debug')('aws-deploy:api');
var _ = require('lodash');

var schema = require('./schema');
var db = require('./../aws-deploy/db');
var errors = require('./errors');

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


exports.errorHandler = function (err, req, res, next) {
    switch (err.constructor) {
        case errors.ApiError: {
            res.status(err.statusCode).set({
                "Content-Type": "application/json"
            }).send({
                message: err.message
            });
        } break;

        case errors.SchemaError: {
            res.status(403).set({
                "Content-Type": "application/json"
            }).send({
                message: err.message
            });
        } break;

        default: {
            if (err.message && (err.message.constructor == Error)) {
                res.status(403).set({
                    "Content-Type": "application/json"
                }).send({
                    message: "Permission denied"
                });
            }

            res.status(500).set({
                "Content-Type": "text/html"
            }).send("<html><body><h1>Internal Server Error</h1></body></html>");
        } break;
    }
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
