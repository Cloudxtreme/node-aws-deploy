SessionManager = function () {
    this.initialize.apply(this, arguments);
};
_.extend(SessionManager.prototype, Backbone.Events);

_.extend(SessionManager.prototype, {
    initialize: function () {
        this.session = new SessionModel();
        this.users = new LocalUserCollection();

        this.listenTo(this.session, 'change', this.onChange);
        this.listenTo(this.users, 'reset', this.onChange);

        this.session.fetch();
    },

    isReady: function () {
        return this.session.has("session_id") && (!this.session.get("user_id") || this.users.length > 0);
    },

    isAuthorized: function () {
        return this.isReady() && this.session.get("user_id") > 0;
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

    onChange: function () {
        if (this.isReady()) {
            if (_.isUndefined(this._user_id)) {
                this._user_id = this.session.get("user_id");
                if (this._user_id > 0) {
                    this.trigger("signin signin:authorized");
                } else {
                    this.trigger("signin signin:unauthorized");
                }
            } else if (this.session.get("user_id") !== this._user_id) {
                window.location.reload();
            }
        } else if (this.session.has("session_id") && this.session.get("user_id") > 0) {
            this.users.fetch({
                reset: true
            });
        }
    }
});