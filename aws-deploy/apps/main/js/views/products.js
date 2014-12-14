ProductsListView = AwsDeploy.View.extend({
    initialize: function (options) {
        this.options = options;
        this.template = Templates.get("main/products");

        this.products = new ProductCollection();
        this.listenTo(this.products, 'reset', this.addAll);

        this.products.fetch({
            reset: true
        });
    },

    events: {
        "click #add_product": "showProductDialog"
    },

    render: function () {
        this.$el.html(this.template());

        var root = this.$el.find("tbody");
        _.each(this.getChildViews(), function (view) {
            root.append(view.render().el);
        });

        return this;
    },

    addAll: function () {
        this.closeChildViews();
        this.products.each(this.addOne, this);
        this.render();
    },

    addOne: function (model) {
        var view = new ProductItemView({model: model});
        this.addChildView(view);
    },

    showProductDialog: function () {
        this.modalView(new ProductDialogView({
            collection: this.products
        }));
    }
});

ProductItemView = AwsDeploy.View.extend({
    tagName: 'tr',

    initialize: function () {
        this.template = Templates.get("main/products-item");
        this.listenTo(this.model, 'change', this.render);
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));
        return this;
    }
});

ProductDialogView = AwsDeploy.View.extend({
    initialize: function () {
        this.template = Templates.get("main/product-form");

        this.applications = new AwsApplicationCollection();
        this.listenTo(this.applications, 'reset', this.render);

        this.environments = new AwsEnvironmentCollection();
        this.listenTo(this.environments, 'reset', this.render);

        this.applications.fetch({
            reset: true
        });

        this.environments.fetch({
            reset: true
        });
    },

    events: {
        "submit form": "submit"
    },

    render: function () {
        var data;
        if (this.model) {
            data = this.model.toJSON();
        } else {
            data = {
                product_name: "",
                product_application: ""
            }
        }

        this.$el.html(this.template(data));
        return this;
    },

    submit: function (event) {
        event.preventDefault();

        var product_name = this.$el.find("#product_name").val();

        this.collection.create({
            product_name: product_name
        }, {
            success: _.bind(function () {
                toastr.success("products.product-created");
                this.close();

                this.collection.fetch({
                    reset: true
                });
            }, this),
            error: _.bind(function () {
                toastr.error("products.product-creation-failed");
            }, this)
        });
    }
});
