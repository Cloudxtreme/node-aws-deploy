var MainApp = Backbone.Router.extend({
    initialize: function () {
        this.navbar = new NavBarView();
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
