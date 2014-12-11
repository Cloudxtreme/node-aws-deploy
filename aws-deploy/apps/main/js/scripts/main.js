var MainApp = Backbone.Router.extend({
    initialize: function () {
        this.session = new SessionModel();

        this.navbar = new NavBarView({
            model: this.session
        });
        $('#header').html(this.navbar.render().el);
    },

    routes: {
        "": "index"
    },

    index: function () {
    }
});

var app = new MainApp();

Backbone.history.start();
