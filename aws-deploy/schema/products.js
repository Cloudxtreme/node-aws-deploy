var schema = require('../../server/schema');
var filters = require('../filters');
var db = require('../../server/db');
var async = require('async');

schema.on('create', '/products',
    filters.authCheck,
function createProduct(data, callback, info) {
    data.product_creator = info.session.user_id;
    db.query("INSERT INTO awd_products (product_name) VALUES (:product_name)", data, function (err, results) {
        if (err) {
            callback(err);
            return;
        }

        data.product_id = result.insertId.toString();
        callback(null, data);
    });
});

schema.on('read', '/products',
    filters.authCheck,
function getProducts(callback) {
    db.query("SELECT * FROM awd_products ORDER BY product_name", function (err, rows) {
        callback(err, rows);
    });
});

schema.on('update', '/products/:product_id',
    filters.authCheck, filters.productWriteCheck,
function updateProduct(product_id, data, callback, info) {
    async.series([
        function (callback) {
            db.querySingle("SELECT * FROM awd_products WHERE product_id = ? LIMIT 1", [product_id], function (err, product) {
                if (err || !product) {
                    callback(err || new SchemaError("Could not find product"));
                    return;
                }

                data.product_id = product_id;
                _.defaults(data, product);

                callback(null);
            });
        }, function (callback) {
            db.query("UPDATE awd_products SET" +
            " product_name = :product_name" +
            " WHERE product_id = :product_id", data, callback);
        }
    ], callback);
});

schema.on('destroy', '/products/:product_id',
    filters.authCheck, filters.productWriteCheck,
function destroyProduct(product_id, callback) {
    db.query("DELETE FROM awd_products WHERE product_id = ? LIMIT 1", [product_id], callback);
});
