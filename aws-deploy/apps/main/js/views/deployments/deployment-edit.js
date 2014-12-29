DeploymentEditView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-edit");
    },

    events: {
        "submit form": "save",
        "click button#destroy": "destroy"
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));

        this.$el.find("#deployment_name").val(this.model.get("deployment_name"));

        this.delegateEvents();
        return this;
    },

    save: function (event) {
        event.preventDefault();

        var deployment_name = this.$el.find("#deployment_name").val();

        this.model.save({
            deployment_name: deployment_name
        }, {
            wait: true,
            success: _.bind(function () {
                toastr.success(i18n.t("deployment.save-success"));
                app.navigate("#deployments/" + this.model.id, {trigger: true});
            }, this),
            error: _.bind(function () {
                toastr.error(i18n.t("deployment.save-failed"));
            }, this)
        });
    },

    destroy: function (event) {
        event.preventDefault();

        this.confirm(i18n.t("deployment.delete-confirm"), function (ok) {
        });
    }
});
