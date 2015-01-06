NavBarView = AwsDeploy.View.extend({
    initialize: function (options) {
        this.template = Templates.get("common/navbar");
        this.options = options;

        this.listenTo(this.options.session, 'signin', this.render);
    },

    events: {
        "click #login": "showLogin",
        "click #profile": "showProfile",
        "click #logout": "logout"
    },

    render: function () {
        this.$el.html(this.template());
        this.delegateEvents();
        return this;
    },

    showLogin: function () {
        this.modalView(new LoginView({
            session: this.options.session
        }));
    },

    showProfile: function (event) {
        event.preventDefault();
        this.modalView(new ProfileView({
            session: this.options.session
        }));
    },

    logout: function (event) {
        event.preventDefault();

        this.confirm(i18n.t("navbar.logout-confirm"), function (ok) {
            if (ok) {
                this.options.session.logout();
            }
        });
    }

});
