DeploymentModel = AwsDeploy.Model.extend({
    idAttribute: "deployment_id"
});

DeploymentCollection = AwsDeploy.Collection.extend({
    model: DeploymentModel,
    url: "/deployments"
});

DeploymentRepositoryModel = AwsDeploy.Model.extend({
    idAttribute: "deployment_id",
    url: function () {
        return "/repo/" + this.deployment_id;
    }
});

DeploymentApplicationModel = AwsDeploy.Model.extend({
    idAttribute: "deployment_id",
    url: function () {
        return "/apps/" + this.deployment_id;
    }
});
