var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var express = require('express');
var debug = require('debug')('aws-deploy:service');
var config = require('config');
var assert = require('assert');
var async = require('async');

function Service() {
    this.initialize.apply(this, arguments);
}

util.inherits(Service, EventEmitter);

_.assign(Service, {
    extend: function (props, staticProps) {
        var parent = this;

        var child;
        if (_.has(props, 'constructor')) {
            child = props.constructor;
        } else {
            child = function () {
                return parent.apply(this, arguments);
            }
        }

        _.assign(child, parent, staticProps);

        var Surrogate = function () {
            this.constructor = child;
        };

        Surrogate.prototype = parent.prototype;
        child.prototype = new Surrogate;

        if (props) {
            _.extend(child.prototype, props);
        }

        child.__super__ = parent.prototype;
        return child;
    }
});

_.assign(Service.prototype, {
    initialize: function (callback) {
        var app = this.app = express();

        this.on('listening', function (server) {
            debug("listening on %s:%d", server.address().address, server.address().port);
            server.on('close', function () {
                debug("server closed");
            });
        });

        async.nextTick(callback);
    },

    start: function () {
        var server;

        var hostPort = /(?:([^:]+):)?([0-9]+)/.exec(config.endpoints.http.listen);
        assert(hostPort, "Invalid HTTP endpoint listen address");

        var args = [Number(hostPort[2])];

        if (!_.isUndefined(hostPort[1])) {
            args.push(hostPort[1]);
        }

        args.push(function () {
            this.emit('listening', server);
        }.bind(this));

        server = this.server = this.app.listen.apply(this.app, args);
    },

    stop: function () {
        if (!this.server) {
            return;
        }

        this.server.close();
        delete this.server;
    },

    __super__: function () {
        return this.constructor.__super__;
    }
});

exports.Service = Service;
