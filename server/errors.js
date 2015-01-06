function SchemaError(message) {
    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);

    this.name = this.constructor.name;
    this.message = message;
}
require('util').inherits(SchemaError, Error);
exports.SchemaError = SchemaError;

function ApiError(statusCode, message) {
    Error.call(this);
    Error.captureStackTrace(this, arguments.callee);

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.message = message;
}
require('util').inherits(ApiError, Error);
exports.ApiError = ApiError;
