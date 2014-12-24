var AWS = require('aws-sdk');
var config = require('config');

AWS.config.update({
    "accessKeyId": config.aws.key,
    "secretAccessKey": config.aws.secret,
    "region": config.aws.region
});

module.exports = AWS;
