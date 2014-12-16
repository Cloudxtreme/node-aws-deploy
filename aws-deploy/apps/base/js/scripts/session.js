SessionManager = function () {
    this.initialize.apply(this, arguments);
};
_.extend(SessionManager.prototype, Backbone.Events);

_.extend(SessionManager.prototype, {
    initialize: function () {
        this.session = new SessionModel();
        this.users = new LocalUserCollection();

        this.listenTo(this.session, 'change', this.onSession);

        this._isReady = false;

        this.session.fetch();
    },

    isReady: function () {
        return this._isReady;
    },

    isAuthorized: function () {
        return this.isReady() && !!this.users.get(this.session.get("user_id"));
    },

    user: function () {
        return this.users.first();
    },

    login: function (user_email, user_pass, callback) {
        this.session.emit('login', {
            user_email: user_email,
            user_pass: user_pass
        }, {
            success: _.bind(function () {
                callback && callback(null);
                this.session.fetch();
            }, this),
            error: _.bind(function () {
                callback && callback("login failed");
            }, this)
        });
    },

    logout: function (callback) {
        this.session.destroy({
            success: function () {
                window.location.reload();
            }
        });
    },

    register: function (data, callback) {
        var user = new UserModel();
        user.save(data, {
            success: _.bind(function () {
                this.session.fetch();
                callback && callback(null);
            }, this),
            error: _.bind(function () {
                callback && callback("registration failed");
            }, this)
        });
    },

    onSession: function () {
        if (this.session.has("session_id") && this.session.get("user_id") > 0) {
            this.users.fetch({
                reset: true,
                success: _.bind(function (collection) {
                    this._isReady = true;
                    var user = collection.get(this.session.get("user_id"));
                    if (user) {
                        this.trigger("signin signin:authorized");
                    } else {
                        this.trigger("signin signin:unauthorized");
                    }
                }, this), error: _.bind(function () {
                    this._isReady = true;
                    this.trigger("signin signin:unauthorized");
                }, this)
            });
        } else if (this.session.has("session_id")) {
            this._isReady = true;
            this.trigger("signin signin:unauthorized");
        }
    }
});