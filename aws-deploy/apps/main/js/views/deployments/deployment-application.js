DeploymentApplicationView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-application");

        this.application = new DeploymentApplicationModel();
        this.application.deployment_id = this.model.id;
        this.listenTo(this.application, 'change', this.onApplication);
        this.application.fetch();
    },

    events: {
        "change #application_name": "refreshEnvironments",
        "click #link": "link",
        "click #unlink": "unlink"
    },

    render: function () {
        this.$el.html(this.template());
        this.delegateEvents();
        return this;
    },

    onApplication: function () {
        if (!this.application.get("application_name") || !this.application.get("application_environment")) {
            this.refreshApplications();
            this.refreshEnvironments();
        } else {
            this.refreshVersions();
        }

        this.render();
    },

    refreshApplications: function () {
        if (this.applications && this.applications.length) {
            return;
        }

        this.applications = new AwsApplicationCollection();
        this.applications.fetch({
            success: _.bind(function (collection) {
                var target = this.$el.find("datalist#applications");
                collection.each(function (app) {
                    $("<option>").attr("value", app.get("application_name")).html(app.get("application_description")).appendTo(target);
                });
            }, this)
        });
    },

    refreshEnvironments: function () {
        var application_name = this.$el.find("#application_name").val();
        if (!application_name || (this.environments && (this.environments.application_name == application_name))) {
            return;
        }

        this.environments = new AwsEnvironmentCollection();
        this.environments.application_name = application_name;
        this.environments.fetch({
            success: _.bind(function (collection) {
                var target = this.$el.find("datalist#environments");
                collection.each(function (env) {
                    $("<option>").attr("value", env.get("environment_id")).html(env.get("environment_name")).appendTo(target);
                })
            }, this)
        });
    },

    refreshVersions: function () {
    },

    link: function (event) {
        event.preventDefault();

        var application_name = this.$el.find("#application_name").val();
        var application_environment = this.$el.find("#application_environment").val();

        this.application.emit("link", {
            application_name: application_name,
            application_environment: application_environment
        }, {
            success: _.bind(function () {
                toastr.success("application.linked");
                this.application.fetch();
            }, this),
            error: function () {
                toastr.error("application.link-failed");
            }
        });
    },

    unlink: function (event) {
        event.preventDefault();

        this.confirm("application.unlink-confirm", function (ok) {
            if (ok) {
                this.application.emit("unlink", {
                    success: _.bind(function () {
                        toastr.success("application.unlinked");
                        this.application.fetch();
                    }, this),
                    error: function () {
                        toastr.error("application.unlink-failed");
                    }
                });
            }
        });
    }
});
