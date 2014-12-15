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
        this.listenTo(this.applications, 'reset', this.update);
        this.listenTo(this.applications, 'reset', this.refreshEnvironments);

        this.environments = new AwsEnvironmentCollection();
        this.listenTo(this.environments, 'reset', this.update);

        this.refresh();
    },

    events: {
        "submit form": "submit",
        "change #product_application": "refresh",
        "change #product_environment": "refresh"
    },

    render: function () {
        this.$el.html(this.template());
        return this;
    },

    refresh: function () {
        this.refreshApplications();
        this.refreshEnvironments();
    },

    refreshApplications: function () {
        if (this._refreshingApplications) {
            return;
        }

        if (this.applications.length > 0) {
            return;
        }

        this._refreshingApplications = true;
        this.applications.fetch({
            reset: true,
            success: _.bind(function () {
                delete this._refreshingApplications;
            }, this),
            error: _.bind(function () {
                delete this._refreshingApplications;
            }, this)
        });
    },

    refreshEnvironments: function () {
        if (this._refreshingEnvironments) {
            return;
        }

        var product_application = this.$el.find("#product_application").val();
        if (!product_application || product_application == this.environments.application_name) {
            return;
        }

        this._refreshingEnvironments = true;
        this.environments.app_name = product_application;
        this.environments.fetch({
            reset: true,
            success: _.bind(function () {
                delete this._refreshingEnvironments;
            }, this),
            error: _.bind(function () {
                delete this._refreshingEnvironments;
            }, this)
        })
    },

    update: function () {
        var product_application = this.$el.find("#product_application");
        var applications = this.$el.find("datalist#applications");
        if (applications) {
            applications.empty();
            this.applications.each(function (app) {
                var node = $("<option>").attr("value", app.get("app_name")).html(app.get("app_description"));
                applications.append(node);
            });
        }
        product_application.parent().toggleClass("has-error", !(!product_application.val() || !!this.applications.get(product_application.val())));
        product_application.parent().toggleClass("has-success", !!this.applications.get(product_application.val()));

        var product_environment = this.$el.find("#product_environment");
        var environments = this.$el.find("datalist#environments");
        if (environments) {
            environments.empty();
            this.environments.each(function (env) {
                var node = $("<option>").attr("value", env.get("env_id")).html(env.get("env_name"));
                environments.append(node);
            });
        }
        product_environment.parent().toggleClass("has-error", !(!product_environment.val() || !!this.environments.get(product_environment.val())));
        product_environment.parent().toggleClass("has-success", !!this.environments.get(product_environment.val()));
    },

    submit: function (event) {
        event.preventDefault();

        var product_name = this.$el.find("#product_name").val();
        var product_application = this.$el.find("#product_application").val();
        var product_environment = this.$el.find("#product_environment").val();

        this.collection.create({
            product_name: product_name,
            product_application: product_application,
            product_environment: product_environment
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

ProductView = AwsDeploy.View.extend({
    initialize: function (options) {
        this.options = options;
        this.template = Templates.get("main/product");

        this.listenTo(this.model, 'change', this.render);

        this.versions = new AwsApplicationVersionCollection();
        if (!!this.model.get("product_application")) {
            this.versions.app_name = this.model.get("product_application");
            this.listenTo(this.versions, 'reset', this.render);
            this.versions.fetch({
                reset: true
            });
        }

        this.environments = new AwsEnvironmentCollection();
        if (!!this.model.get("product_environment")) {
            this.environments.app_name = this.model.get("product_application");
            this.listenTo(this.environments, 'reset', this.render);
            this.environments.fetch({
                reset: true
            });
        }
    },

    events: {
        "submit form#product": "saveProduct",
        "click button#link": "linkProduct",
        "click button#delete": "destroyProduct"
    },

    render: function () {
        this.$el.html(this.template(this.model.toJSON()));

        this.$el.find("#product_name").val(this.model.get("product_name"));
        this.$el.find("#product_application").val(this.model.get("product_application"));
        this.$el.find("#product_environment").val(this.model.get("product_environment"));
        this.$el.find("#product_repo_type").val(this.model.get("product_repo_type"));
        this.$el.find("#product_repo_url").val(this.model.get("product_repo_url"));

        this.setEditMode(!!this.options.edit);
        this.delegateEvents();
        return this;
    },

    environment: function () {
        if (!this.model.get("product_environment")) {
            return null;
        }

        return this.environments.get(this.model.get("product_environment"));
    },

    saveProduct: function (event) {
        event.preventDefault();

        var product_name = this.$el.find("#product_name").val();
        var product_application = this.$el.find("#product_application").val();
        var product_environment = this.$el.find("#product_environment").val();
        var product_repo_type = this.$el.find("#product_repo_type").val();
        var product_repo_url = this.$el.find("#product_repo_url").val();

        this.model.save({
            product_name: product_name,
            product_application: product_application,
            product_environment: product_environment,
            product_repo_type: !!product_repo_type ? product_repo_type : null,
            product_repo_url: product_repo_url
        }, {
            wait: true,
            success: _.bind(function () {
                toastr.success("product.saved");
                app.navigate("#product/" + this.model.id, {trigger: true});
            }, this),
            error: _.bind(function () {
                toastr.error("product.save-failed");
            }, this)
        })
    },

    linkProduct: function (event) {
        event.preventDefault();

        switch (this.model.get("product_repo_type")) {
            case 'github': {
                var github = new GithubApi();
                github.link(this.model.id, function (err) {
                    if (err) {
                        toastr.error("product.repo-link-failed");
                    }
                });
            } break;

            default: {
                toastr.error("product.repo-type-invalid");
            } break;
        }

    },

    destroyProduct: function (event) {
        event.preventDefault();

        this.confirm("product.delete-product-confirm", function (ok) {
        });
    }
});
