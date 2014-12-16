var MainApp = AwsDeploy.Router.extend({
    initialize: function () {
        this.session = new SessionManager();
        this.listenTo(this.session, 'signin', this.onSignin);

        this.navbar = new NavBarView({
            session: this.session
        });
        $('#header').html(this.navbar.render().el);
    },

    routes: {
        "": "showDeployments",
        "deployments/:deployment_id": "showDeploymentOverview",
        "deployments/:deployment_id/edit": "showDeploymentEdit",
        "deployments/:deployment_id/repository": "showDeploymentRepository",
        "deployments/:deployment_id/aws": "showDeploymentAws"
    },

    showDeployments: function () {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        this.showView("#content", new DeploymentsListView());
    },

    showDeploymentOverview: function (deployment_id) {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        this.before({
            deployment_id: deployment_id
        }, function (deployment) {
            this.showView("#content", new DeploymentView({
                model: deployment, type: 'overview'
            }));
        });
    },

    showDeploymentEdit: function (deployment_id) {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        this.before({
            deployment_id: deployment_id
        }, function (deployment) {
            this.showView("#content", new DeploymentView({
                model: deployment, type: 'edit'
            }));
        });
    },

    showDeploymentRepository: function (deployment_id) {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        this.before({
            deployment_id: deployment_id
        }, function (deployment) {
            this.showView("#content", new DeploymentView({
                model: deployment, type: 'repository'
            }));
        });
    },

    showDeploymentAws: function (deployment_id) {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        this.before({
            deployment_id: deployment_id
        }, function (deployment) {
            this.showView("#content", new DeploymentView({
                model: deployment, type: 'aws'
            }));
        });
    },

    before: function (options, callback) {
        if (_.isUndefined(callback) && _.isFunction(options)) {
            callback = options;
            options = {};
        }

        var args = [];
        var actions = [];

        if (options.deployment_id) {
            actions.push(_.bind(function (callback) {
                if (options.deployment_id) {
                    this._deployments = new DeploymentCollection();
                    this._deployments.fetch({
                        reset: true,
                        success: function (collection) {
                            args.push(collection.get(options.deployment_id));
                            callback();
                        },
                        error: callback
                    })
                } else {
                    async.nextTick(callback);
                }
            }, this));
        }

        async.series(actions, _.bind(function (err) {
            if (err) {
                return;
            }
            callback.apply(this, args);
        }, this));
    }
});

var app = new MainApp();
