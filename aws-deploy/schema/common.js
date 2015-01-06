var schema = require('../../server/server').schema;
var config = require('config');

schema.on('read', '/config', function readConfig(callback) {
    callback(null, {
        user_registration: config.users.register
    });
});
