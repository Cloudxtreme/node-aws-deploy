var Service = require('./server/service').Service;
var api = require('./server/api');
var express = require('express');
var bodyParser = require('body-parser');

var DeployService = Service.extend({
    initialize: function () {
        this.__super__().initialize();

        this.on('listening', function () {
        }.bind(this));

        var app = this.app;

        app.use('/api', bodyParser.json());
        app.use('/api/1/', api.sessionHandler());
        app.all('/api/1/*', api.request);
        app.use('/api', api.errorHandler);

        app.use(express.static('./client'));
    }
});

var server = new DeployService();
server.start();
