DeploymentCreateDialogView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-create-dialog");

        this.applications = new AwsApplicationCollection();
        this.listenTo(this.applications, 'reset', this.update);
        this.listenTo(this.applications, 'reset', this.refreshEnvironments);

        this.environments = new AwsEnvironmentCollection();
        this.listenTo(this.environments, 'reset', this.update);

        this.refresh();
    },

    events: {
        "submit form": "submit",
        "change #deployment_application": "refresh",
        "change #deployment_environment": "refresh"
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    },

    refresh: function () {
        this.refreshApplications();
        this.refreshEnvironments();
    },

    refreshApplications: function () {
        if (this._refreshingApplications) {
            return;
        }

        if (this.applications.length > 0) {
            return;
        }

        this._refreshingApplications = true;
        this.applications.fetch({
            reset: true,
            success: _.bind(function () {
                delete this._refreshingApplications;
            }, this),
            error: _.bind(function () {
                delete this._refreshingApplications;
            }, this)
        });
    },

    refreshEnvironments: function () {
        if (this._refreshingEnvironments) {
            return;
        }

        var deployment_application = this.$el.find("#deployment_application").val();
        if (!deployment_application || deployment_application == this.environments.application_name) {
            return;
        }

        this._refreshingEnvironments = true;
        this.environments.app_name = deployment_application;
        this.environments.fetch({
            reset: true,
            success: _.bind(function () {
                delete this._refreshingEnvironments;
            }, this),
            error: _.bind(function () {
                delete this._refreshingEnvironments;
            }, this)
        })
    },

    update: function () {
        var deployment_application = this.$el.find("#deployment_application");
        var applications = this.$el.find("datalist#applications");
        if (applications) {
            applications.empty();
            this.applications.each(function (app) {
                var node = $("<option>").attr("value", app.get("application_name")).html(app.get("application_description"));
                applications.append(node);
            });
        }
        deployment_application.parent().toggleClass("has-error", !(!deployment_application.val() || !!this.applications.get(deployment_application.val())));
        deployment_application.parent().toggleClass("has-success", !!this.applications.get(deployment_application.val()));

        var deployment_environment = this.$el.find("#deployment_environment");
        var environments = this.$el.find("datalist#environments");
        if (environments) {
            environments.empty();
            this.environments.each(function (env) {
                var node = $("<option>").attr("value", env.get("environment_id")).html(env.get("environment_name"));
                environments.append(node);
            });
        }
        deployment_environment.parent().toggleClass("has-error", !(!deployment_environment.val() || !!this.environments.get(deployment_environment.val())));
        deployment_environment.parent().toggleClass("has-success", !!this.environments.get(deployment_environment.val()));
    },

    submit: function (event) {
        event.preventDefault();

        var deployment_name = this.$el.find("#deployment_name").val();
        var deployment_application = this.$el.find("#deployment_application").val();
        var deployment_environment = this.$el.find("#deployment_environment").val();

        this.collection.create({
            deployment_name: deployment_name,
            deployment_application: deployment_application,
            deployment_environment: deployment_environment
        }, {
            success: _.bind(function () {
                toastr.success("deployments.deployment-created");
                this.close();

                this.collection.fetch({
                    reset: true
                });
            }, this),
            error: _.bind(function () {
                toastr.error("deployments.deployment-creation-failed");
            }, this)
        });
    }
});
