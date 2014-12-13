var Application = require('../../../server/application').Application;

module.exports = Application.create({
    "publish": false,
    "name": "base",
    "root": __dirname,
    "target": "/base/",

    "js": {
        "lib": [
            "//cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.1/lodash.js",
            "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.js",
            "//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.1/js/bootstrap.js",
            "//cdnjs.cloudflare.com/ajax/libs/bootbox.js/4.3.0/bootbox.js",
            "//cdnjs.cloudflare.com/ajax/libs/backbone.js/1.1.2/backbone.js",
            "//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.js"
        ],
        "common": [
            "js/scripts/*.js",
            "js/models/*.js",
            "js/views/*.js"
        ]
    },
    "templates": {
        "common": [
            "templates/*.html"
        ]
    },
    "css": {
        "lib": [
            "//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.1/css/bootstrap.css",
            "//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.1/css/bootstrap-theme.css",
            "//cdnjs.cloudflare.com/ajax/libs/font-awesome/4.2.0/css/font-awesome.css",
            "//cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.css"
        ],
        "common": [
            "css/*.css"
        ]
    }
});