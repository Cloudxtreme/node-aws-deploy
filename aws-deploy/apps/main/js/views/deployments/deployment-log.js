DeploymentLogView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get('main/deployment-log');
        this.listenTo(this.model, 'change', this.render);
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    }
});