var fs = require('fs');
var path = require('path');
var glob = require('glob');
var _ = require('lodash');
var async = require('async');
var reactTools = require('react-tools');

function Application(options) {
    this.options = _.clone(options) || {};

    this.name = options.name;
    this.target = options.target;
    this.root = options.root;

    this.inherits = [];

    this.js = {};
    this.templates = {};
    this.css = {};

    this.files = {};
}
exports.Application = Application;

_.assign(Application, {
    create: function (options) {
        var app = new Application(options);
        return app.compile();
    }
});

_.assign(Application.prototype, {
    extend: function (options) {
        var app = new Application(options);

        app.parent = this;
        app.compile();

        return app;
    },

    get: function (option, inherit) {
        if (this.options.hasOwnProperty(option)) {
            return this.options[option];
        }

        if (this.parent && (!!inherit || _.isUndefined(inherit))) {
            return this.parent.get(option);
        }
    },

    mount: function (app, callback) {
        async.series([
            function (callback) {
                if (this.get('publish') && !this.published) {
                    this.published = true;
                    this.publish(this.get('use'), callback);
                } else {
                    async.nextTick(callback);
                }
            }.bind(this), function (callback) {
                if (this.parent) {
                    this.parent.mount(app, callback);
                } else {
                    async.nextTick(callback);
                }
            }.bind(this), function (callback) {
                app.use(this.options.target, this.express());
                async.nextTick(callback);
            }.bind(this)
        ], callback);
    },

    express: function () {
        return function (req, res, next) {
            var file = this.files[req.url.slice(1)];
            if (!file) {
                next();
                return;
            }

            file.generate(file.name, file.path, function (err, data) {
                if (err) {
                    next(err);
                    return;
                }

                res.status(200).set({
                    "Content-Type": file.type
                }).send(data);
            });
        }.bind(this);
    },

    compile: function (callback) {
        var options = this.options;

        _.each(options.js, function (scripts, name) {
            var matches = this.match(options.root, scripts);
            this.build(this.js, name, matches, {
                type: 'text/javascript',
                root: 'js/'
            });
        }, this);

        _.each(options.templates, function (templates, name) {
            var matches = this.match(options.root, templates);
            this.build(this.templates, name, matches, {
                type: 'text/javascript',
                root: 'templates/',
                ext: '.js',
                generator: function (output, file, callback) {
                    fs.readFile(file, 'utf-8', function (err, data) {
                        if (err) {
                            callback(err);
                            return;
                        }

                        try {
                            var compiled = _.template(data);
                            var templateData = 'Templates = window.Templates||{};Templates.'  + name + '_' + path.basename(output, '.js') + ' = ' + compiled.source;
                            callback(null, templateData);
                        } catch (e) {
                            callback(e);
                        }
                    }.bind(this));
                }
            })
        }, this);

        _.each(options.css, function (css, name) {
            var matches = this.match(options.root, css);
            this.build(this.css, name, matches, {
                type: 'text/css',
                root: 'css/'
            });
        }, this);

        return this;
    },

    build: function (registry, name, matches, options) {
        var items = registry[name] || (registry[name] = []);
        _.each(matches, function (match) {
            _.each(match.files, function (file) {
                if (file[0] == '/') {
                    items.push({name: file});
                    return;
                }

                var basename = path.basename(file, path.extname(file));
                var ext = options.ext || path.extname(file);
                var target = path.join(options.root, name, basename + ext).replace(/\\/g, '/');

                var generate;
                if (options.generator) {
                    if (_.isFunction(options.generator)) {
                        generate = options.generator;
                    } else if (_.isObject(options.generator)) {
                        generate = options.generator[ext];
                    }
                }
                if (!generate) {
                    generate = function (name, path, callback) {
                        fs.readFile(file, callback);
                    };
                }

                this.files[target] = {
                    name: basename + ext,
                    path: file,
                    generate: generate,
                    type: options.type
                };
                items.push({name: basename + ext});
            }.bind(this));
        }.bind(this));
    },

    publish: function (uses, callback) {
        var data = {
            js: [],
            templates: [],
            css: []
        };

        _.each(uses, function (use) {
            if (this.parent) {
                _.each(data, function (target, key) {
                    this.parent.gather(target, key, use, this.options.target);
                }.bind(this));
            }

            _.each(data, function (target, key) {
                this.gather(target, key, use, this.options.target);
            }.bind(this));
        }.bind(this));

        var generate = function (name, file, callback) {
            fs.readFile(path.join(this.root, 'index.html'), 'utf-8', function (err, input) {
                if (err) {
                    callback(err);
                    return;
                }

                try {
                    var compiled = _.template(input);
                    var result = compiled(data);
                    callback(null, result);
                } catch (e) {
                    callback(e);
                }
            }.bind(this));
        }.bind(this);

        this.files[''] = {
            generate: generate,
            type: 'text/html'
        };

        async.nextTick(callback);
    },

    gather: function (target, key, use, root) {
        if (!this.hasOwnProperty(key)) {
            return;
        }

        var types = this[key];
        if (_.isUndefined(types)) {
            return;
        }

        _.each(types[use], function (entry) {
            var file = entry.name;
            if (file[0] != '/') {
                var absolute = path.join(this.options.target, key, use, file);
                var relative = path.relative(root, absolute).replace(/\\/g, '/');
                target.push({name: relative});
            } else {
                target.push(entry);
            }
        }.bind(this));
    },

    match: function (root, patterns) {
        var files = [];

        _.each(patterns, function (pattern) {
            if (pattern[0] == '/') {
                files.push({files: [pattern]});
                return;
            }

            var searchPath = path.join(root, pattern);
            var matches = glob.sync(searchPath);

            files.push({files: matches});
        });

        return files;
    }
});
