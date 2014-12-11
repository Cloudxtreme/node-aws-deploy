SessionModel = AwsDeploy.Model.extend({
    idAttribute: "session_id",
    url: "/session"
});

UserModel = AwsDeploy.Model.extend({
    idAttribute: "user_id"
});

UserCollection = AwsDeploy.Collection.extend({
    model: UserModel
});
