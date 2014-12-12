var MainApp = AwsDeploy.Router.extend({
    initialize: function () {
        this.session = new SessionManager();
        this.listenTo(this.session, 'signin', this.onSignin);

        this.navbar = new NavBarView({
            session: this.session
        });
        $('#header').html(this.navbar.render().el);
    }
});

var app = new MainApp();
