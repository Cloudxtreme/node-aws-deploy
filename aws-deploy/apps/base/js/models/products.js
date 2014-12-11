ProductModel = AwsDeploy.Model.extend({
    idAttribute: "product_id"
});

ProductCollection = AwsDeploy.Collection.extend({
    model: ProductModel,
    url: "/products"
});
