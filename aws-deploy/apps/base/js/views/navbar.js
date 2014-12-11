NavBarView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("common/navbar");
    },

    events: {
        "click #login": "showLogin"
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    },

    showLogin: function () {
        this.modalView(new LoginView({
            model: this.model
        }));
    }
});