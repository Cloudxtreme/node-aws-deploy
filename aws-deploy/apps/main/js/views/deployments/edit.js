DeploymentEditView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-edit");
    },

    events: {
        "submit form": "save",
        "click button#destroy": "destroy",
        "change input[type=checkbox]": "update"
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));

        this.$el.find("#deployment_name").val(this.model.get("deployment_name"));
        this.$el.find("#deployment_auto_package").prop("checked", this.model.get("deployment_auto_package"));
        this.$el.find("#deployment_auto_deploy").prop("checked", this.model.get("deployment_auto_deploy"));
        this.$el.find("#deployment_auto_clean input[type=checkbox]").prop("checked", (this.model.get("deployment_auto_clean") > 0));
        this.$el.find("#deployment_auto_clean input[type=number]").prop("disabled", this.model.get("deployment_auto_clean") == 0).val(this.model.get("deployment_auto_clean") > 0 ? this.model.get("deployment_auto_clean") : undefined);

        this.update();

        this.delegateEvents();
        return this;
    },

    save: function (event) {
        event.preventDefault();

        var deployment_name = this.$el.find("#deployment_name").val();
        var deployment_auto_package = this.$el.find("#deployment_auto_package").prop("checked");
        var deployment_auto_deploy = this.$el.find("#deployment_auto_deploy").prop("checked");
        var deployment_auto_clean = this.$el.find("#deployment_auto_clean input[type=checkbox]").prop("checked") ? this.$el.find("#deployment_auto_clean input[type=number]").val() : 0;

        this.model.save({
            deployment_name: deployment_name,
            deployment_auto_package: deployment_auto_package,
            deployment_auto_deploy: deployment_auto_deploy,
            deployment_auto_clean: deployment_auto_clean
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
    },

    update: function () {
        var deployment_auto_package = this.$el.find("#deployment_auto_package").prop("checked");
        var deployment_auto_deploy = this.$el.find("#deployment_auto_deploy").prop("checked");
        var deployment_auto_clean = this.$el.find("#deployment_auto_clean input[type=checkbox]").prop("checked");

        this.$el.find("#deployment_auto_deploy").prop("disabled", !deployment_auto_package);
        this.$el.find("#deployment_auto_clean input[type=checkbox]").prop("disabled", !(deployment_auto_package && deployment_auto_deploy));
        this.$el.find("#deployment_auto_clean input[type=number]").prop("disabled", !(deployment_auto_package && deployment_auto_deploy && deployment_auto_clean));
    }
});
