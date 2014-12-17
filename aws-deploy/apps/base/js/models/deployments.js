DeploymentModel = AwsDeploy.Model.extend({
    idAttribute: "deployment_id"
});

DeploymentCollection = AwsDeploy.Collection.extend({
    model: DeploymentModel,
    url: "/deployments"
});

DeploymentStatusModel = AwsDeploy.Model.extend({
    idAttribute: "deployment_id",
    url: function () {
        return "/deployments/" + this.deployment_id + "/status"
    }
});

DeploymentRepositoryModel = AwsDeploy.Model.extend({
    idAttribute: "deployment_id",
    url: function () {
        return "/deployments/" + this.deployment_id + "/repository";
    }
});

DeploymentApplicationModel = AwsDeploy.Model.extend({
    idAttribute: "deployment_id",
    url: function () {
        return "/deployments/" + this.deployment_id + "/application";
    }
});
