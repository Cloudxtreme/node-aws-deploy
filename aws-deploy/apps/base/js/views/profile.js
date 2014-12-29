ProfileView = AwsDeploy.View.extend({
    initialize: function (options) {
        this.options = options;
        this.template = Templates.get("common/profile");
    },

    events: {
        "submit form": "submit",
        "click #save": "submit",
        "click #change_pass": "showChangePassword"
    },

    render: function () {
        this.$el.html(this.template(this.options.session.user().toJSON()));
        return this;
    },

    showChangePassword: function (event) {
        event.preventDefault();
        this.modalView(new ProfilePasswordView({session: this.options.session}));
    },

    submit: function () {
        var user_name = this.$el.find("#user_name").val();
        var user_email = this.$el.find("#user_email").val();

        var user = this.options.session.user();

        user.save({
            user_name: user_name,
            user_email: user_email
        }, {
            wait: true,
            success: _.bind(function () {
                toastr.success(i18n.t("profile.save-success"));
                this.close();
            }, this),
            error: _.bind(function () {
                toastr.error(i18n.t("profile.save-failed"));
            }, this)
        });

        event.preventDefault();
    }
});

ProfilePasswordView = AwsDeploy.View.extend({
    initialize: function (options) {
        this.options = options;
        this.template = Templates.get("common/profile-password");
    },

    events: {
        "submit form": "submit"
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    },

    submit: function (event) {
        event.preventDefault();

        var old_password = this.$el.find("#old_password").val();
        var new_password = this.$el.find("#new_password").val();
        var new_password_repeat = this.$el.find("#new_password_repeat").val();

        if (new_password != new_password_repeat) {
            this.alert("profile.password-mismatch");
            return;
        }

        this.$el.find("#password_progress").removeClass("hidden");

        this.options.session.user().emit('set-password', {
            old_password: old_password,
            new_password: new_password
        }, {
            success: _.bind(function () {
                toastr.success(i18n.t("profile.change-password-success"));
                this.close();
            }, this),
            error: _.bind(function () {
                toastr.error(i18n.t("profile.change-password-failed"));
                this.$el.find("#password_progress").addClass("hidden");
            }, this)
        });
    }
});
