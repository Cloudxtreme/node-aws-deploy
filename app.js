var forever = require('forever-monitor');
var path = require('path');

var manifest = require('./package.json');

var env = {
    "NODE_ENV": process.env['NODE_ENV'] ? process.env['NODE_ENV'] : 'production',
    "DEBUG": process.env['DEBUG'] ? process.env['DEBUG'] : '',
    "NODE_APP_INSTANCE": process.env['NODE_APP_INSTANCE'] ? process.env['NODE_APP_INSTANCE'] : 'app'
};

// PARAM1 is merged into process environment
var re = /([^=]+)=([^,]*),?/g;
var PARAM1 = process.env["PARAM1"];
while ((match = re.exec(PARAM1)) !== null) {
    env[match[1]] = match[2];
}

// PARAM2 is fed into the NODE_CONFIG environment variable
var PARAM2 = process.env["PARAM2"];
if (PARAM2) {
    env["NODE_CONFIG"] = PARAM2;
}

var script = path.join(__dirname, manifest.main ? manifest.main + '.js' : 'index.js');

var child = new (forever.Monitor)(script, {
    'env': env
});

child.start();
