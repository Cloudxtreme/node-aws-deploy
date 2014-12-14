LoginView = AwsDeploy.View.extend({
    initialize: function (options) {
        this.options = options;
        this.template = Templates.get("common/login");

        this.listenTo(this.options.session, 'signin:authorized', this.close);

        this.config = new ConfigurationModel();
        this.listenTo(this.config, 'change', this.render);

        this.config.fetch();
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

        this.$el.find("#login_progress").toggleClass("hidden", false);
        this.$el.find("form#login button[type=submit]").prop("disabled", true);

        var user_email = this.$el.find("form#login input#user_email").val();
        var user_pass = this.$el.find("form#login input#user_pass").val();

        this.options.session.login(user_email, user_pass, _.bind(function (err) {
            if (err) {
                toastr.error("login.login-failed");
            }

            this.$el.find("#login_progress").toggleClass("hidden", true);
            this.$el.find("form#login button[type=submit]").prop("disabled", false);
        }, this));
    },

    register: function (event) {
        event.preventDefault();

        var user_email = this.$el.find("form#register input#user_email").val();
        var user_name = this.$el.find("form#register input#user_name").val();
        var user_pass = this.$el.find("form#register input#user_pass").val();
        var user_pass_repeat = this.$el.find("form#register input#user_pass_repeat").val();

        if (!user_name.length) {
            this.alert("register.name-missing");
            return;
        }

        if (user_pass !== user_pass_repeat) {
            this.alert("register.password-mismatch");
            return;
        }

        this.$el.find("#registration_progress").toggleClass("hidden", false);
        this.$el.find("form#register button[type=submit]").prop("disabled", true);

        this.options.session.register({
            user_email: user_email,
            user_name: user_name,
            user_pass: user_pass
        }, _.bind(function (err) {
            if (err) {
                toastr.error("register.registration-failed");
            }

            this.$el.find("#registration_progress").toggleClass("hidden", true);
            this.$el.find("form#register button[type=submit]").prop("disabled", false);
        }, this));
    },

    showRegister: function () {
        this.$el.find("form#login").addClass("hidden");
        this.$el.find("form#register").removeClass("hidden");
    }
});
