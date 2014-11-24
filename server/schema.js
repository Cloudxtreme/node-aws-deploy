var assert = require('assert');
var _ = require('lodash');
var debug = require('debug')('aws-deploy:schema');

var handlers = {
    'create': {},
    'read': {},
    'update': {},
    'destroy': {},
    'emit': {}
};

function SchemaError(message) {
    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);

    this.name = this.constructor.name;
    this.message = message;
}
require('util').inherits(SchemaError, Error);
exports.SchemaError = SchemaError;

function Handler(pattern, filters, method) {
    this.build(pattern);

    this.filters = filters;
    this.method = method;
}

_.assign(Handler, {
    process: function (handlers, issue, callback) {
        var processor = function (index) {
            var handler = handlers[index];
            issue(handler, function (err, data) {
                if (!err || (handlers.length == (index + 1))) {
                    callback(err, data);
                    return;
                }
                processor(index + 1);
            });
        };
        processor(0);
    }
});

_.assign(Handler.prototype, {
    build: function (pattern) {
        if (!pattern) {
            this.pattern = null;
            this.params = [];
            return;
        }

        var output = "^";
        var params = [];

        while (!_.isUndefined(pattern)) {
            var match = /^\:([^\/])+?(?:\/(.*))?$/.exec(pattern);
            pattern = match[2];
            params.push(match[1]);
            output += "([^\/]+)?";

            if (!_.isUndefined(pattern)) {
                output += "\/";
            }
        }

        output += "$";

        this.pattern = new RegExp(output);
        this.params = params;
    },

    call: function (url, args, method, data, info, callback) {
        var filterData = {
            url: url,
            data: data,
            info: info,
            callback: callback,
            params: {},
            input: []
        };

        var filters = _.clone(this.filters);

        if (this.pattern) {
            var match = this.pattern.exec(args);
            if (!match) {
                callback(new SchemaError("Pattern mismatch"));
                return;
            }
            filterData.input = match.slice(1);
            _.each(this.params, function (param, index) {
                filterData.params[param] = filterData.input[index];
            });
        }

        var next = function (err) {
            if (err) {
                filterData.callback(err);
                return;
            }
            var filter = filters.shift();
            filter.call(filterData, next);
        };

        filters.push({
            call: function () {
                var input = filterData.input;
                var data = filterData.data;

                if (!_.isUndefined(method)) {
                    input.push(method);
                }

                if (!_.isUndefined(data)) {
                    input.push(data);
                }

                input.push(filterData.callback);
                input.push(filterData.info);

                this.method.apply(null, input);
            }.bind(this)
        });

        next(null);
    }
});

exports.on = function (type, pattern) {
    var args = Array.prototype.slice.call(arguments);

    var filters = _.clone(args).slice(2, args.length - 1);
    var method = _.head(args.slice(args.length - 1));

    var components = /^\/([^\/]+)(?:\/(.*))?/.exec(pattern);
    assert(components, "Invalid URL pattern " + pattern);

    var handler = new Handler(components[2], filters, method);

    var key = components[1];
    var target = handlers[type][key] = [];
    target.push(handler);
    handlers[type][key] = target;
};

exports.create = function (url, data, info, callback) {
    var components = /\/([^\/]+)(?:\/(.*))?/.exec(url);
    if (!components) {
        callback(new SchemaError("Invalid URL"));
        return;
    }

    debug("create %s (%s, %s)", url, info.address, info.session.user_id ? info.session.user_id : "anonymous");

    var handler = handlers['create'][components[1]];
    if (!_.isUndefined(handler)) {
        Handler.process(handler, function (handler, callback) {
            handler.call(url, components[2], undefined, data, info, callback);
        }, callback);
    } else {
        callback(new SchemaError("No handler for " + key + " (create)"));
    }
};

exports.read = function (url, info, callback) {
    var components = /\/([^\/]+)(?:\/(.*))?/.exec(url);
    if (!components) {
        callback(new SchemaError("Invalid URL"));
        return;
    }

    debug("read %s (%s, %s)", url, info.address, info.session.user_id ? info.session.user_id : "anonymous");

    var handler = handlers['read'][components[1]];
    if (!_.isUndefined(handler)) {
        Handler.process(handler, function (handler, callback) {
            handler.call(url, components[2], undefined, undefined, info, callback);
        }, callback);
    } else {
        callback(new SchemaError("No handler for " + key + " (read)"));
    }
};

exports.update = function (url, data, info, callback) {
    var components = /\/([^\/]+)(?:\/(.*))?/.exec(url);
    if (!components) {
        callback(new SchemaError("Invalid URL"));
        return;
    }

    debug("update %s (%s, %s)", url, info.address, info.session.user_id ? info.session.user_id : "anonymous");

    var handler = handlers['update'][components[1]];
    if (!_.isUndefined(handler)) {
        Handler.process(handler, function (handler, callback) {
            handler.call(url, components[2], undefined, data, info, callback);
        }, callback);
    } else {
        callback(new SchemaError("No handler for " + key + " (update)"));
    }
};

exports.destroy = function (url, info, callback) {
    var components = /\/([^\/]+)(?:\/(.*))?/.exec(url);
    if (!components) {
        callback(new SchemaError("Invalid URL"));
        return;
    }

    debug("destroy %s (%s, %s)", url, info.address, info.session.user_id ? info.session.user_id : "anonymous");

    var handler = handlers['destroy'][components[1]];
    if (!_.isUndefined(handler)) {
        Handler.process(handler, function (handler, callback) {
            handler.call(url, components[2], undefined, undefined, info, callback);
        }, callback);
    } else {
        callback(new SchemaError("No handler for " + key + " (destroy)"));
    }
};

exports.emit = function (url, method, data, info, callback) {
    var components = /\/([^\/]+)(?:\/(.*))?/.exec(url);
    if (!components) {
        callback(new SchemaError("Invalid URL"));
        return;
    }

    debug("emit %s (%s, %s)", url, info.address, info.session.user_id ? info.session.user_id : "anonymous");

    var handler = handlers['emit'][components[1]];
    if (!_.isUndefined(handler)) {
        Handler.process(handler, function (handler, callback) {
            handler.call(url, components[2], method, data, info, callback);
        }, callback);
    } else {
        callback(new SchemaError("No handler for " + key + " (emit)"));
    }
};
