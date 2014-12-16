GithubUrlModel = AwsDeploy.Model.extend({
    idAttribute: "id"
});

GithubUrlCollection = AwsDeploy.Collection.extend({
    url: function () {
        return "/github/" + this.deployment_id + "/urls";
    }
});

GithubBranchModel = AwsDeploy.Model.extend({

});

GithubBranchCollection = AwsDeploy.Collection.extend({
    url: function () {
        return "/github/" + this.deployment_id + "/branches/" + this.repository_name;
    }
});
