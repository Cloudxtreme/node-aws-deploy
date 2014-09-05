var Service = require('./server/service').Service;

var DeployService = Service.extend({
    initialize: function () {
    }
});

var server = new DeployService();
server.start();
