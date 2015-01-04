DeploymentCreateDialogView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-create-dialog");
    },

    events: {
        "submit form": "submit"
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    },

    submit: function (event) {
        event.preventDefault();

        var deployment_name = this.$el.find("#deployment_name").val();

        this.collection.create({
            deployment_name: deployment_name
        }, {
            success: _.bind(function (model) {
                toastr.success(i18n.t("deployments.create-success"));
                this.collection.fetch({
                    reset: true
                });
                this.close();
            }, this),
            error: _.bind(function () {
                toastr.error(i18n.t("deployments.create-failed"));
            }, this)
        });
    }
});
