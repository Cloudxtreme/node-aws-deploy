var SchemaError = require("server-core").errors.SchemaError;
var _ = require('lodash');

exports.authCheck = {
    call: function authCheck(data, next) {
        var session = data.info.session;
        next((!_.isUndefined(session) && !_.isUndefined(session.user_id)) ? null : new SchemaError("Not Authenticated"));
    }
};

exports.deploymentReadCheck = {
    call: function deploymentReadCheck(data, next) {
        next(null);
    }
};

exports.deploymentWriteCheck = {
    call: function deploymentWriteCheck(data, next) {
        next(null);
    }
};
