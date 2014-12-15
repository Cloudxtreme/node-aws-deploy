DeploymentsListView = AwsDeploy.View.extend({
    initialize: function (options) {
        this.options = options;
        this.template = Templates.get("main/deployments");

        this.deployments = new DeploymentCollection();
        this.listenTo(this.deployments, 'reset', this.addAll);

        this.deployments.fetch({
            reset: true
        });
    },

    events: {
        "click #add_deployment": "showCreateDeploymentDialog"
    },

    render: function () {
        this.$el.html(this.template());

        var root = this.$el.find("tbody");
        _.each(this.getChildViews(), function (view) {
            root.append(view.render().el);
        });

        return this;
    },

    addAll: function () {
        this.closeChildViews();
        this.deployments.each(this.addOne, this);
        this.render();
    },

    addOne: function (model) {
        var view = new DeploymentsItemView({model: model});
        this.addChildView(view);
    },

    showCreateDeploymentDialog: function () {
        this.modalView(new CreateDeploymentDialogView({
            collection: this.deployments
        }));
    }
});

DeploymentsItemView = AwsDeploy.View.extend({
    tagName: 'tr',

    initialize: function () {
        this.template = Templates.get("main/deployments-item");
        this.listenTo(this.model, 'change', this.render);
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});

CreateDeploymentDialogView = AwsDeploy.View.extend({
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
                var node = $("<option>").attr("value", app.get("app_name")).html(app.get("app_description"));
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
                var node = $("<option>").attr("value", env.get("env_id")).html(env.get("env_name"));
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

DeploymentView = AwsDeploy.View.extend({
    initialize: function (options) {
        this.options = options;
        this.template = Templates.get("main/deployment");

        this.listenTo(this.model, 'change', this.render);

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

    events: {
        "submit form#deployment": "saveDeployment",
        "click button#link": "linkDeployment",
        "click button#delete": "destroyDeployment"
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));

        this.$el.find("#deployment_name").val(this.model.get("deployment_name"));
        this.$el.find("#deployment_application").val(this.model.get("deployment_application"));
        this.$el.find("#deployment_environment").val(this.model.get("deployment_environment"));
        this.$el.find("#deployment_repo_type").val(this.model.get("deployment_repo_type"));
        this.$el.find("#deployment_repo_url").val(this.model.get("deployment_repo_url"));

        this.setEditMode(!!this.options.edit);
        this.delegateEvents();
        return this;
    },

    environment: function () {
        if (!this.model.get("deployment_environment")) {
            return null;
        }

        return this.environments.get(this.model.get("deployment_environment"));
    },

    saveDeployment: function (event) {
        event.preventDefault();

        var deployment_name = this.$el.find("#deployment_name").val();
        var deployment_application = this.$el.find("#deployment_application").val();
        var deployment_environment = this.$el.find("#deployment_environment").val();
        var deployment_repo_type = this.$el.find("#deployment_repo_type").val();
        var deployment_repo_url = this.$el.find("#deployment_repo_url").val();

        this.model.save({
            deployment_name: deployment_name,
            deployment_application: deployment_application,
            deployment_environment: deployment_environment,
            deployment_repo_type: !!deployment_repo_type ? deployment_repo_type : null,
            deployment_repo_url: deployment_repo_url
        }, {
            wait: true,
            success: _.bind(function () {
                toastr.success("deployment.saved");
                app.navigate("#deployment/" + this.model.id, {trigger: true});
            }, this),
            error: _.bind(function () {
                toastr.error("deployment.save-failed");
            }, this)
        })
    },

    linkDeployment: function (event) {
        event.preventDefault();

        switch (this.model.get("deployment_repo_type")) {
            case 'github': {
                var github = new GithubApi();
                github.link(this.model.id, function (err) {
                    if (err) {
                        toastr.error("deployment.repo-link-failed");
                    }
                });
            } break;

            default: {
                toastr.error("deployment.repo-type-invalid");
            } break;
        }

    },

    destroyDeployment: function (event) {
        event.preventDefault();

        this.confirm("deployment.delete-deployment-confirm", function (ok) {
        });
    }
});
