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
        "click #add_deployment": "showDeploymentCreateDialog"
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

    showDeploymentCreateDialog: function () {
        this.modalView(new DeploymentCreateDialogView({
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
