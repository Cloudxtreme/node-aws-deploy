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
        "deployments/:deployment_id": "showDeployment",
        "deployments/:deployment_id/edit": "editDeployment"
    },

    showDeployments: function () {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        this.showView("#content", new DeploymentsListView());
    },

    showDeployment: function (deployment_id) {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        var deployments = new DeploymentCollection();
        deployments.fetch({
            success: _.bind(function (collection) {
                var deployment = collection.get(deployment_id);

                this.showView("#content", new DeploymentView({model: deployment}));
            }, this),
            error: function () {
                toastr.error("router.failed-deployments-fetch");
            }
        });
    },

    editDeployment: function (deployment_id) {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        var deployments = new DeploymentCollection();
        deployments.fetch({
            success: _.bind(function (collection) {
                var deployment = collection.get(deployment_id);

                this.showView("#content", new DeploymentView({model: deployment, edit: true}));
            }, this),
            error: function () {
                toastr.error("router.failed-deployments-fetch");
            }
        });
    }
});

var app = new MainApp();
