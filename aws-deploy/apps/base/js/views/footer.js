FooterView = AwsDeploy.View.extend({
    className: "container",

    initialize: function () {
        this.template = Templates.get("common/footer");
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    }
});