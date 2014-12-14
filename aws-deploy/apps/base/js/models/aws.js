AwsApplicationModel = AwsDeploy.Model.extend({
    idAttribute: "app_name"
});

AwsApplicationCollection = AwsDeploy.Collection.extend({
    model: AwsApplicationModel,
    url: "/aws-applications"
});

AwsEnvironmentModel = AwsDeploy.Model.extend({
    idAttribute: "env_id"
});

AwsEnvironmentCollection = AwsDeploy.Collection.extend({
    model: AwsEnvironmentModel,
    url: function () {
        return "/aws-environments/" + this.app_name;
    }
});

AwsApplicationVersionModel = AwsDeploy.Model.extend({
    idAttribute: "version_label"
});

AwsApplicationVersionCollection = AwsDeploy.Collection.extend({
    model: AwsApplicationVersionModel,
    url: function () {
        return "/aws-versions/" + this.app_name;
    }
});
