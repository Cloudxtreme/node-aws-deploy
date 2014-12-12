LoginView = AwsDeploy.View.extend({
    initialize: function (options) {
        this.options = options;
        this.template = Templates.get("common/login");

        this.listenTo(this.options.session, 'signin:authorized', this.close);
    },

    events: {
        "submit form#login": "login",
        "submit form#register": "register",
        "click #show_register": "showRegister"
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    },

    login: function (event) {
        event.preventDefault();

        this.$el.find("#login_failed").addClass("hidden");

        var user_email = this.$el.find("form#login input#user_email").val();
        var user_pass = this.$el.find("form#login input#user_pass").val();

        this.options.session.login(user_email, user_pass, _.bind(function (err) {
            this.$el.find("#login_failed").toggleClass("hidden", !err);
        }, this));
    },

    register: function (event) {
        event.preventDefault();

        this.$el.find("#registration_failed").addClass("hidden");

        var user_email = this.$el.find("form#register input#user_email").val();
        var user_name = this.$el.find("form#register input#user_name").val();
        var user_pass = this.$el.find("form#register input#user_pass").val();
        var user_pass_repeat = this.$el.find("form#register input#user_pass_repeat").val();

        if (user_pass !== user_pass_repeat) {
            this.alert("register.password-mismatch");
            return;
        }

        this.options.session.register({
            user_email: user_email,
            user_name: user_name,
            user_pass: user_pass
        }, _.bind(function (err) {
            this.$el.find("#registration_failed").toggleClass("hidden", !err);
        }, this));
    },

    showRegister: function () {
        this.$el.find("form#login").addClass("hidden");
        this.$el.find("form#register").removeClass("hidden");
    }
});
