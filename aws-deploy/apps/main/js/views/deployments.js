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
        this.template = Templates.get("main/deployment-dialog-create");

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

        switch (options.type) {
            case 'overview': {
                this.tabView = new DeploymentOverviewView({
                    model: this.model
                });
            } break;

            case 'edit': {
                this.tabView = new DeploymentEditView({
                    model: this.model
                });
            } break;

            case 'repository': {
                this.tabView = new DeploymentRepositoryView({
                    model: this.model
                });
            } break;

            case 'aws': {
                this.tabView = new DeploymentAwsView({
                    model: this.model
                });
            } break;
        }
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));

        if (this.tabView) {
            this.$el.find("div#deployment").html(this.tabView.render().el);
        }

        this.$el.find("ul#menu li#" + this.options.type).addClass("active");

        return this;
    }
});

DeploymentOverviewView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-tab-overview");
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});

DeploymentEditView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-tab-edit");
    },

    events: {
        "submit form": "save",
        "click button#destroy": "destroy"
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));

        this.$el.find("#deployment_name").val(this.model.get("deployment_name"));
        this.$el.find("#deployment_application").val(this.model.get("deployment_application"));
        this.$el.find("#deployment_environment").val(this.model.get("deployment_environment"));

        return this;
    },

    save: function (event) {
        event.preventDefault();

        var deployment_name = this.$el.find("#deployment_name").val();
        var deployment_application = this.$el.find("#deployment_application").val();
        var deployment_environment = this.$el.find("#deployment_environment").val();

        this.model.save({
            deployment_name: deployment_name,
            deployment_application: deployment_application,
            deployment_environment: deployment_environment
        }, {
            wait: true,
            success: _.bind(function () {
                toastr.success("deployment.saved");
                app.navigate("#deployment/" + this.model.id, {trigger: true});
            }, this),
            error: _.bind(function () {
                toastr.error("deployment.save-failed");
            }, this)
        });
    },

    destroy: function (event) {
        event.preventDefault();

        this.confirm("deployment.delete-deployment-confirm", function (ok) {
        });
    }
});

DeploymentRepositoryView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-tab-repository");

        this.repository = new DeploymentRepositoryModel();
        this.repository.deployment_id = this.model.id;
        this.listenTo(this.repository, 'change', this.render);

        this.repository.fetch({
            success: _.bind(function () {
                this.refreshUrls();
            }, this)
        });
    },

    events: {
        "change #repository_type": "onChangeRepositoryType",
        "change #repository_name": "onChangeRepositoryName",
        "change #repository_branch": "onChangeRepositoryBranch",
        "click #link": "link",
        "click #save": "save",
        "click #unlink": "unlink"
    },

    render: function () {
        this.$el.html(this.template(this.repository.toJSON()));
        this.$el.find("#repository_type").val(this.repository.get("repository_type")).prop('disabled', !!this.repository.get("repository_linked"));
        return this;
    },

    onChangeRepositoryType: function (event) {
        this.repository.set("repository_type", event.target.value);
    },

    refreshUrls: function () {
        if (this.repository.get("repository_linked") && !this.repository.get("repository_url")) {
            this.urls = new GithubUrlCollection();
            this.urls.deployment_id = this.model.id;

            var target = this.$el.find("select#repository_name");

            this.urls.fetch({
                reset: true,
                success: _.bind(function (collection) {
                    $("<option>").attr("value","").html("repository.pick-repository").appendTo(target);
                    target.prop("disabled", false);

                    collection.each(function (url) {
                        $("<option>").html(url.get("full_name")).appendTo(target);
                    });
                }, this)
            });
        }
    },

    onChangeRepositoryName: function () {
        var repository_name = this.$el.find("#repository_name").val();

        if (this.repository.get("repository_linked") && !this.repository.get("repository_url")) {
            this.branches = new GithubBranchCollection();
            this.branches.deployment_id = this.model.id;
            this.branches.repository_name = repository_name;

            var target = this.$el.find("select#repository_branch");

            this.branches.fetch({
                reset: true,
                success: _.bind(function (collection) {
                    $("<option>").attr("value", "").html("repository.pick-branch").appendTo(target);
                    target.prop("disabled", false);

                    collection.each(function (branch) {
                        $("<option>").attr("value", branch.get("name")).html(branch.get("name") + " (" + branch.get("sha") + ")").appendTo(target);
                    });
                }, this)
            });
        }
    },

    onChangeRepositoryBranch: function () {
        var repository_name = this.$el.find("#repository_name").val();
        var repository_branch = this.$el.find("#repository_branch").val();

        this.$el.find("button#save").prop('disabled', !(!!repository_name && !!repository_branch));
    },

    save: function (event) {
        event.preventDefault();

        var repository_name = this.$el.find("#repository_name").val();
        var repository_branch = this.$el.find("#repository_branch").val();

        this.repository.save({
            repository_url: repository_name + "#" + repository_branch
        }, {
            wait: true,
            error: function () {
                toastr.error("repository.repo-link-failed");
            }
        })
    },

    link: function (event) {
        event.preventDefault();

        this.repository.emit('link', {
            success: _.bind(function (model, url) {
                window.location.href = url;
            }, this),
            error: function () {
                toastr.error("deployment.repo-link-error");
            }
        });
    },

    unlink: function (event) {
        event.preventDefault();

        this.confirm("repository.unlink-repo-confirm", function (ok) {
            if (ok) {
                this.repository.emit('unlink', {
                    success: _.bind(function () {
                        this.repository.fetch();
                    }, this),
                    error: function () {
                        toastr.error("deployment.repo-unlink-error");
                    }
                });
            }
        });
    }
});

DeploymentAwsView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-tab-aws");

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
