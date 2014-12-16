AwsDeploy = {};

AwsDeploy.sync = function (method, model, options) {
    _.defaults(options || (options = {}), {
        url: '/api/1' + _.result(model, 'url')
    });

    Backbone.sync.apply(this, [method, model, options]);
};

AwsDeploy.emit = function (rpc, attrs, options) {
    if (_.isObject(attrs) && _.isUndefined(options)) {
        options = attrs;
        attrs = this.toJSON();
    }

    options = options ? _.clone(options) : {};
    var model = this;

    var success = options.success;
    options.success = function (resp) {
        if (success) success(model, resp, options);
    };

    var error = options.error;
    options.error = function (resp) {
        if (error) error(model, resp, options);
        model.trigger('error', model, resp, options);
    };

    options.attrs = {
        method: rpc,
        data: attrs
    };

    options.headers = {
        'X-HTTP-Method': 'EMIT'
    };

    return this.sync('create', this, options);
};

AwsDeploy.Model = Backbone.Model.extend({
    emit: AwsDeploy.emit,
    sync: AwsDeploy.sync
});

AwsDeploy.Collection = Backbone.Collection.extend({
    emit: AwsDeploy.emit,
    sync: AwsDeploy.sync
});

AwsDeploy.View = Backbone.View.extend({
    close: function () {
        if (this.onClose) {
            this.onClose();
        }

        if (this._modal) {
            this._modal.modal('hide');
            delete this._modal;
        }

        this.closeDialogs();
        this.closeChildViews();
        this.closeTrackedViews();

        this.remove();
        this.unbind();
    },

    streamFrom: function (collection) {
        collection.fetch({reset: true});
    },

    stopStreaming: function (collection) {
    },

    closeChildViews: function () {
        _.each(this._childViews, function (view) {
            view.close();
        });
        delete this._childViews;
    },

    addChildView: function (view) {
        var childViews = this._childViews || (this._childViews = []);
        childViews.push(view);
    },

    getChildViews: function () {
        return this._childViews ? _.clone(this._childViews) : [];
    },

    closeTrackedViews: function () {
        _.each(this._trackedViews, function (view) {
            view.close();
        });
        delete this._trackedViews;
    },

    addTrackedView: function (view) {
        var trackedViews = this._trackedViews || (this._trackedViews = []);
        trackedViews.push(view);
    },

    closeTrackedView: function (view) {
        this._trackedViews = _.without(this._trackedViews, view);
        view.close();
    },

    closeDialogs: function () {
        _.each(this._dialogs, function (dialog) {
            dialog.modal('hide');
        });
        delete this._dialogs;
    },

    alert: function (message, callback) {
        var dialogs = this._dialogs || (this._dialogs = []);
        var d = bootbox.alert({
            message: message,
            callback: callback ? _.bind(callback, this) : undefined
        });
        d.on('hidden.bs.modal', _.bind(function () {
            this._dialogs = _.without(this._dialogs, d);
        }, this));
        dialogs.push(d);
        return d;
    },

    confirm: function (message, callback) {
        var dialogs = this._dialogs || (this._dialogs = []);
        var d = bootbox.confirm({
            message: message,
            callback: callback ? _.bind(callback, this) : undefined
        });
        d.on('hidden.bs.modal', _.bind(function () {
            this._dialogs = _.without(this._dialogs, d);
        }, this));
        dialogs.push(d);
        return d;
    },

    dialog: function (message, callback) {
        var dialogs = this._dialogs || (this._dialogs = []);
        var d = bootbox.dialog({
            message: message,
            callback: callback ? _.bind(callback, this) : undefined
        });
        d.on('hidden.bs.modal', _.bind(function () {
            this._dialogs = _.without(this._dialogs, d);
        }, this));
        dialogs.push(d);
        return d;
    },

    prompt: function (message, callback) {
        var dialogs = this._dialogs || (this._dialogs = []);
        var d = bootbox.prompt({
            message: message,
            callback: callback ? _.bind(callback, this) : undefined
        });
        d.on('hidden.bs.modal', _.bind(function () {
            this._dialogs = _.without(this._dialogs, d);
        }, this));
        dialogs.push(d);
        return d;
    },

    modalView: function (view, options) {
        var dialogs = this._dialogs || (this._dialogs = []);
        options = options ? _.clone(options) : {};

        _.defaults(options, {
            onEscape: function () {
                view.close();
            }
        });

        options.message = view.render().el;
        var d = bootbox.dialog(options);
        view._modal = d;
        d.on('hiddden.bs.modal', _.bind(function () {
            this._dialogs = _.without(this._dialogs, d);
            delete view._modal;
            view.close();
        }, this));
        dialogs.push(d);

        d.on('shown.bs.modal', function () {
            d.find('input[autofocus]:first').focus();
        });
        return d;
    },

    setEditMode: function (editing) {
        this.$el.find('form :input:not(.ignore-edit-mode)').prop('disabled', !editing);
        this.$el.find('.edit-mode-only:not(.ignore-edit-mode)').toggle(editing);
        this.$el.find('.read-mode-only:not(.ignore-edit-mode)').toggle(!editing);
    }
});

AwsDeploy.Router = Backbone.Router.extend({
    onSignin: function () {
        if (!Backbone.History.started) {
            Backbone.history.start();
        }
    },

    showView: function (selector, view) {
        if (this._currentView) {
            this._currentView.close();
        }

        $(selector).html(view.render().el);

        this._currentView = view;
        this.trigger('showview', view);

        $(window).scrollTop(0,0);
        return view;
    }
});