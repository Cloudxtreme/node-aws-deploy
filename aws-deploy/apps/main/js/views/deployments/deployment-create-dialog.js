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
                toastr.success("deployments.deployment-created");
                app.navigate("/#deployments/" + model.id, { trigger: true });
            }, this),
            error: _.bind(function () {
                toastr.error("deployments.deployment-creation-failed");
            }, this)
        });
    }
});
