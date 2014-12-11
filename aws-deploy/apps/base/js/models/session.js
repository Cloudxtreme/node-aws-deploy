SessionModel = AwsDeploy.Model.extend({
    idAttribute: "session_id",
    url: "/session",

    isReady: function () {
        return !_.isUndefined(this.get("session_id"));
    },

    isAuthorized: function () {
        return this.isReady() && (this.get("user_id") > 0);
    },

    initialize: function () {
        this.listenTo(this, 'change', this.onChange);
        this.fetch();
    },

    login: function (user_email, user_pass, callback) {
        this.emit('login', {
            user_email: user_email,
            user_pass: user_pass
        }, {
            success: _.bind(function (model, response) {
                callback && callback(null);
                this.trigger('signin signin:authorized');
            }, this),
            error: _.bind(function (model, response) {
                callback && callback("login failed");
            }, this)
        });
    },

    onChange: function () {
        if (this.get("user_id") > 0) {
            this.trigger("signin signin:authorized");
        } else {
            this.trigger("signin signin:unauthorized");
        }
    }
});
