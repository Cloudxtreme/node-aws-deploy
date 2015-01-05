DeploymentHealthView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-health");

        this.collection = new DeploymentHealthCollection();
        this.collection.deployment_id = this.model.id;
        this.listenTo(this.collection, 'reset', this.addAll);
        this.collection.fetch({reset: true});
    },

    events: {
        "click #add": "showAddDialog"
    },

    render: function () {
        this.$el.html(this.template());
        var root = this.$el.find("tbody");
        _.each(this.getChildViews(), function (view) {
            root.append(view.render().el);
        });
        this.delegateEvents();
        return this;
    },

    addAll: function () {
        this.closeChildViews();
        this.collection.each(this.addOne, this);
        this.render();
    },

    addOne: function (model) {
        var view = new DeploymentHealthItemView({model: model});
        this.addChildView(view);
    },

    showAddDialog: function (event) {
        event.preventDefault();
        this.modalView(new DeploymentHealthItemEditView({collection: this.collection}));
    }
});

DeploymentHealthItemView = AwsDeploy.View.extend({
    tagName: "tr",

    initialize: function () {
        this.template = Templates.get('main/deployment-health-item');
        this.listenTo(this.model, 'change', this.render);
    },

    events: {
        "click #edit": "showEditDialog"
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        this.delegateEvents();
        return this;
    },

    showEditDialog: function (event) {
        event.preventDefault();
        this.modalView(new DeploymentHealthItemEditView({model: this.model}));
    }
});

DeploymentHealthItemEditView = AwsDeploy.View.extend({
    initialize: function () {
        if (!this.model) {
            this.model = new DeploymentHealthModel({
                healthcheck_name: '',
                healthcheck_type: 'ping',
                healthcheck_enabled: false,
                healthcheck_port: 80,
                healthcheck_uri: ''
            });
        }

        this.template = Templates.get('main/deployment-health-item-edit');
        this.listenTo(this.model, 'change', this.render);
    },

    events: {
        "submit form": "submit",
        "click #destroy": "destroy"
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.find("#healthcheck_enabled").prop("checked", this.model.get("healthcheck_enabled") > 0);
        this.delegateEvents();
        return this;
    },

    submit: function (event) {
        event.preventDefault();

        var healthcheck_name = this.$el.find("#healthcheck_name").val();
        var healthcheck_type = this.$el.find("#healthcheck_type").val();
        var healthcheck_enabled = this.$el.find("#healthcheck_enabled").prop('checked') ? 1 : 0;
        var healthcheck_port = this.$el.find("#healthcheck_port").val();
        var healthcheck_uri = this.$el.find("#healthcheck_uri").val();

        if (this.model.isNew()) {
            this.collection.create({
                healthcheck_name: healthcheck_name,
                healthcheck_type: healthcheck_type,
                healthcheck_enabled: healthcheck_enabled,
                healthcheck_port: healthcheck_port,
                healthcheck_uri: healthcheck_uri
            }, {
                success: _.bind(function () {
                    toastr.success(i18n.t("healthcheck.create-success"));
                    this.collection.fetch({reset: true});
                    this.close();
                }, this),
                error: _.bind(function () {
                    toastr.error(i18n.t("healthcheck.create-failed"));
                })
            });
        } else {
            this.model.save({
                healthcheck_name: healthcheck_name,
                healthcheck_type: healthcheck_type,
                healthcheck_enabled: healthcheck_enabled,
                healthcheck_port: healthcheck_port,
                healthcheck_uri: healthcheck_uri
            }, {
                wait: true,
                success: _.bind(function () {
                    toastr.success(i18n.t("healthcheck.save-success"));
                    this.close();
                }, this),
                error: _.bind(function () {
                    toastr.error(i18n.t("healthcheck.save-failed"));
                })
            });
        }
    },

    destroy: function (event) {
        event.preventDefault();

        this.confirm(i18n.t('healthcheck.destroy-confirm'), function (ok) {
            var collection = this.model.collection;

            this.model.destroy({
                success: _.bind(function () {
                    toastr.success(i18n.t("healthcheck.destroy-success"));
                    collection.fetch({reset: true});
                    this.close();
                }, this),
                error: function () {
                    toastr.error(i18n.t("healthcheck.destroy-failed"));
                }
            });
        });
    }
});
