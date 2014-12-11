LoginView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("common/login");

        this.listenTo(this.model, 'signin', this.close);
    },

    events: {
        "submit form": "login"
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    },

    login: function (event) {
        event.preventDefault();

        var user_email = this.$el.find("#user_email").val();
        var user_pass = this.$el.find("#user_pass").val();

        this.model.login(user_email, user_pass);
    }
});