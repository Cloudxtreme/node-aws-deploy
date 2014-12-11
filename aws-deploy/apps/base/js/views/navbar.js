NavBarView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("common/navbar");
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    }
});