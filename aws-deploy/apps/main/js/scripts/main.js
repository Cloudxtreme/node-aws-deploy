var MainApp = AwsDeploy.Router.extend({
    initialize: function () {
        this.session = new SessionManager();
        this.listenTo(this.session, 'signin', this.onSignin);

        this.navbar = new NavBarView({
            session: this.session
        });
        $('#header').html(this.navbar.render().el);
    },

    routes: {
        "": "showProducts",
        "product/:product_id": "showProduct",
        "product/:product_id/edit": "editProduct"
    },

    showProducts: function () {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        this.showView("#content", new ProductsListView());
    },

    showProduct: function (product_id) {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        var products = new ProductCollection();
        products.fetch({
            success: _.bind(function (collection) {
                var product = collection.get(product_id);

                this.showView("#content", new ProductView({model: product}));
            }, this),
            error: function () {
                toastr.error("router.failed-products-fetch");
            }
        });
    },

    editProduct: function (product_id) {
        if (!this.session.isAuthorized()) {
            this.navbar.showLogin();
            return;
        }

        var products = new ProductCollection();
        products.fetch({
            success: _.bind(function (collection) {
                var product = collection.get(product_id);

                this.showView("#content", new ProductView({model: product, edit: true}));
            }, this),
            error: function () {
                toastr.error("router.failed-products-fetch");
            }
        });
    }
});

var app = new MainApp();
