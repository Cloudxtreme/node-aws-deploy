var config = require('config');
var async = require('async');
var crypto = require('crypto');
var request = require('request');

var schema = require('../../server/schema');
var SchemaError = schema.SchemaError;
var db = require("../../server/db")
var filters = require('../filters');

schema.on('read', '/github/:callback_id',
    filters.authCheck,
function (callback_id, callback, info) {
    async.waterfall([
        function (callback) {
            db.querySingle("SELECT * FROM awd_products" +
            " JOIN awd_auth_states ON awd_auth_states.product_id = awd_products.product_id" +
            " WHERE state_id = ? LIMIT 1", [info.request.query["state"]], function (err, product) {
                if (err || !product) {
                    callback(err || new SchemaError("Product not found"));
                    return;
                }

                callback(null, product);
            });
        }, function (product, callback) {
            request.post({
                url: config.github.endpoint.auth + "/login/oauth/access_token",
                json: true,
                body: {
                    client_id: config.github.client,
                    client_secret: config.github.secret,
                    code: info.request.query["code"]
                },
                headers: {
                    "accept": "application/json"
                }
            }, function (err, response, body) {
                if (err || response.statusCode != 200 || !body.hasOwnProperty("access_token")) {
                    callback(err ||new SchemaError("Request failed"));
                    return;
                }

                db.query("UPDATE awd_products SET product_repo_access_token = ? WHERE product_id = ? LIMIT 1", [body.access_token, product.product_id], function (err) {
                    callback(err, product.product_id);
                });
            });
        }
    ], function (err, product_id) {
        info.response.redirect(err ? "/" : "/#product/" + product_id);
    });
});

schema.on('emit', '/github',
    filters.authCheck, filters.productWriteCheck,
function (method, data, callback) {
    if (!config.github.client) {
        callback("github not configured");
        return;
    }

    switch (method) {
        case 'link': {
            async.waterfall([
                function (callback) {
                    db.querySingle("SELECT * FROM awd_products WHERE product_id = ? LIMIT 1", [data.product_id], function (err, product) {
                        if (err || !product) {
                            callback(err || new SchemaError("Product not found"));
                            return;
                        }
                        callback(null, product);
                    });
                }, function (product, callback) {
                    crypto.pseudoRandomBytes(30, function (err, buf) {
                        if (err) {
                            callback(err);
                            return;
                        }

                        db.query("INSERT INTO awd_auth_states (state_id, product_id) VALUES (:state_id, :product_id)", {
                            state_id: buf.toString('base64'),
                            product_id: product.product_id
                        }, function (err) {
                            callback(err, {
                                state: buf.toString('base64'),
                                client: config.github.client,
                                endpoint: config.github.endpoint.auth
                            });
                        });
                    });
                }
            ], callback);
        } break;

        case 'unlink': {
        } break;

        default: {
            callback(new SchemaError("Invalid method"));
        } break;
    }
});