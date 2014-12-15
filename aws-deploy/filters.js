var SchemaError = require("../server/schema").SchemaError;
var _ = require('lodash');

exports.authCheck = {
    call: function (data, next) {
        var session = data.info.session;
        next((!_.isUndefined(session) && !_.isUndefined(session.user_id)) ? null : new SchemaError("Not Authenticated"));
    }
};

exports.deploymentReadCheck = {
    call: function (data, next) {
        next(null);
    }
};

exports.deploymentWriteCheck = {
    call: function (data, next) {
        next(null);
    }
};
