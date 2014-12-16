SessionModel = AwsDeploy.Model.extend({
    idAttribute: "session_id",
    url: "/user/session"
});

UserModel = AwsDeploy.Model.extend({
    idAttribute: "user_id",
    urlRoot: "/user"
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
        return "/user";
    }
});
