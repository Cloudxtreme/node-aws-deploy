DeploymentAwsView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-aws");

        this.versions = new AwsApplicationVersionCollection();
        if (!!this.model.get("deployment_application")) {
            this.versions.app_name = this.model.get("deployment_application");
            this.listenTo(this.versions, 'reset', this.render);
            this.versions.fetch({
                reset: true
            });
        }

        this.environments = new AwsEnvironmentCollection();
        if (!!this.model.get("deployment_environment")) {
            this.environments.app_name = this.model.get("deployment_application");
            this.listenTo(this.environments, 'reset', this.render);
            this.environments.fetch({
                reset: true
            });
        }
    },

    environment: function () {
        if (!this.model.get("deployment_environment")) {
            return null;
        }

        return this.environments.get(this.model.get("deployment_environment"));
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    }
});
