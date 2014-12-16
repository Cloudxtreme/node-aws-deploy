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
        return "/repositories/" + this.deployment_id;
    }
});
