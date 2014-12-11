UserModel = AwsDeploy.Model.extend({
    idAttribute: "user_id"
});

UserCollection = AwsDeploy.Collection.extend({
    model: UserModel
});
