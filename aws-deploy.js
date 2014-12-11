var Service = require('./server/service').Service;
var api = require('./server/api');
var express = require('express');
var bodyParser = require('body-parser');
var async = require('async');
var debug = require("debug")("aws-deploy:main");

var apps = require('./aws-deploy/apps');
/*var schemas = */require('./aws-deploy/schemas');

var DeployService = Service.extend({
    initialize: function (callback) {
        async.series([
            function (callback) {
                this.__super__().initialize(callback);
            }.bind(this), function (callback) {
                this.on('listening', function () {
                    debug("listening");
                }.bind(this));

                var app = this.app;

                app.use('/api', bodyParser.json());
                app.use('/api/1/', api.sessionHandler());
                app.all('/api/1/*', api.request);
                app.use('/api', api.errorHandler);

                app.use(express.static('./client'));

                apps.mount(app, callback);
            }.bind(this)
        ], function (err) {
            callback.apply(this, err);
        }.bind(this));
    }
});

new DeployService(function (err) {
    if (err) {
        throw new Error(err);
    }
    this.start();
});