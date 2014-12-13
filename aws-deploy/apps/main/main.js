var Base = require('../base/base');

module.exports = Base.extend({
    "publish": true,
    "name": "main",
    "root": __dirname,
    "target": "/",
    "use": [
        "lib",
        "common",
        "main"
    ],

    "js": {
        "main": [
            "js/views/*.js",
            "js/scripts/main.js"
        ]
    },
    "templates": {
        "main": [
            "templates/*.html"
        ]
    },
    "css": {
        "main": [
            "css/*.css"
        ]
    }
});