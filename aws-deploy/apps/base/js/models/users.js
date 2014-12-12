SessionModel = AwsDeploy.Model.extend({
    idAttribute: "session_id",
    url: "/session"
});

UserModel = AwsDeploy.Model.extend({
    idAttribute: "user_id",
    urlRoot: function () {
        return "/user"
    }

});

UserCollection = AwsDeploy.Collection.extend({
    model: UserModel,
    url: function () {
        return "/users"
    }
});

LocalUserCollection = AwsDeploy.Collection.extend({
    model: UserModel,
    url: function () {
        return "/users/" + this.user_id;
    }
});
