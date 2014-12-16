AwsApplicationModel = AwsDeploy.Model.extend({
    idAttribute: "application_name"
});

AwsApplicationCollection = AwsDeploy.Collection.extend({
    model: AwsApplicationModel,
    url: "/aws/apps"
});

AwsEnvironmentModel = AwsDeploy.Model.extend({
    idAttribute: "environment_id"
});

AwsEnvironmentCollection = AwsDeploy.Collection.extend({
    model: AwsEnvironmentModel,
    url: function () {
        return "/aws/apps/" + this.app_name + "/environments";
    }
});

AwsApplicationVersionModel = AwsDeploy.Model.extend({
    idAttribute: "version_label"
});

AwsApplicationVersionCollection = AwsDeploy.Collection.extend({
    model: AwsApplicationVersionModel,
    url: function () {
        return "/aws/apps/" + this.app_name + "/versions";
    }
});
