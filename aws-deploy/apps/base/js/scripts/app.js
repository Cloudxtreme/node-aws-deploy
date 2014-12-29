function AppMain() {
    this.initialize.apply(this, arguments);
}

_.extend(AppMain, {
    extend: function (props, staticProps) {
        var parent = this;

        var child;
        if (props && _.has(props, 'constructor')) {
            child = props.constructor;
        } else {
            child = function () {
                return parent.apply(this, arguments);
            }
        }

        _.extend(child, parent, staticProps);

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

_.extend(AppMain.prototype, {
    create: function (callback) {
        async.series([
            _.bind(this.setupLocalization, this)
        ], function (err) {
            if (err) {
                toastr.error("Failed to initialize application");
            }
            callback(err);
        });
    },

    setupLocalization: function (callback) {
        i18n.init({
            detectLngQS: 'lang',
            load: 'unspecific',
            resGetPath: '/locales/__lng__/__ns__.json'
        }, function (/* translate */) {
            callback(null);
        });
    }
});