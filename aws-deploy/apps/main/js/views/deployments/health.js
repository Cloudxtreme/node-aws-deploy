DeploymentHealthView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-health");
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    }
});