var schema = require('server-core').schema;
var config = require('config');

schema.on('read', '/config', function readConfig(callback) {
    callback(null, {
        user_registration: config.users.register
    });
});
