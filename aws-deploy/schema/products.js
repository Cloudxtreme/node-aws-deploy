var schema = require('../../server/schema');
var filters = require('../filters');
var db = require('../../server/db');
var async = require('async');
var _ = require('lodash');

schema.on('create', '/products',
    filters.authCheck,
function createProduct(data, callback, info) {
    data.product_created_by = info.session.user_id;
    db.query("INSERT INTO awd_products" +
    " (product_name,product_created_at,product_created_by,product_application,product_environment,product_repo_type,product_repo_url)" +
    " VALUES" +
    " (:product_name,NOW(),:product_created_by,:product_application,:product_environment,:product_repo_type,:product_repo_url)", data, function (err, result) {
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
    db.query("SELECT " +
    " product_id,product_name,product_created_at,product_created_by," +
    " product_application,product_environment," +
    " product_repo_type,product_repo_url, IF(ISNULL(product_repo_access_token),0,1) AS product_repo_auth" +
    " FROM awd_products" +
    " ORDER BY product_name", function (err, rows) {
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
            " product_name = :product_name," +
            " product_application = :product_application," +
            " product_environment = :product_environment," +
            " product_repo_type = :product_repo_type," +
            " product_repo_url = :product_repo_url" +
            " WHERE product_id = :product_id" +
            " LIMIT 1", data, callback);
        }
    ], callback);
});

schema.on('destroy', '/products/:product_id',
    filters.authCheck, filters.productWriteCheck,
function destroyProduct(product_id, callback) {
    db.query("DELETE FROM awd_products WHERE product_id = ? LIMIT 1", [product_id], callback);
});
