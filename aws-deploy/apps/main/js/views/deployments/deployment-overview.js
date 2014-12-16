DeploymentOverviewView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/deployment-overview");
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});
