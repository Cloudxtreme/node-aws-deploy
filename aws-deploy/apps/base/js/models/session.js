SessionModel = AwsDeploy.Model.extend({
    idAttribute: "session_id",
    url: "/session",

    isReady: function () {
        return !_.isUndefined(this.get("session_id"));
    },

    isAuthorized: function () {
        return this.isReady() && (this.get("user_id") > 0);
    },

    login: function (user_email, user_pass) {
        this.emit('login', {
            user_email: user_email,
            user_pass: user_pass
        }, {
            success: function (model, response) {
                console.log("SUCCESS", arguments);
            },
            error: function (model, response) {
                console.log("ERROR", arguments);
            }
        });
    }
});
