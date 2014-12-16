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
