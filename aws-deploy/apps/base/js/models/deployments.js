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

DeploymentApplicationVersionModel = AwsDeploy.Model.extend({
    idAttribute: "version_label"
});

DeploymentApplicationVersionCollection = AwsDeploy.Collection.extend({
    model: DeploymentApplicationVersionModel,
    url: function () {
        return "/deployments/" + this.deployment_id + "/versions";
    }
});

DeploymentLogModel = AwsDeploy.Model.extend({
    idAttribute: "log_id"
});

DeploymentLogCollection = AwsDeploy.Collection.extend({
    model: DeploymentLogModel,
    url: function () {
        return "/deployments/" + this.deployment_id + "/log/" + this.page_index;
    }
});

DeploymentHealthModel = AwsDeploy.Model.extend({
    idAttribute: "healthcheck_id"
});

DeploymentHealthCollection = AwsDeploy.Collection.extend({
    model: DeploymentHealthModel,
    url: function () {
        return "/deployments/" + this.deployment_id + "/health";
    }
});
