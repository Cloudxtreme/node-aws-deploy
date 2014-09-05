var util = require('util');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var express = require('express');
var debug = require('debug')('aws-deploy:service');

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
    initialize: function () {
    },

    start: function () {
        var app = this.app = express();

        app.get('/', function (req, res) {
            res.send('hello world');
        });

        app.listen(8080, function () {
            console.log(app);

            debug('now listening on port ' + app.address);
        });
    },

    stop: function () {
    }
});

exports.Service = Service;
