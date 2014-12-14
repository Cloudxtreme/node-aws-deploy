var config = require('config');
var AWS = require('aws-sdk');

var schema = require('../../server/schema');
var filters = require('../filters');

AWS.config.update({
    "accessKeyId": config.aws.key,
    "secretAccessKey": config.aws.secret,
    "region": config.aws.region
});

var ELB = new AWS.ElasticBeanstalk();

schema.on('read', '/aws-applications',
filters.authCheck,
function (callback) {
    ELB.describeApplications({}, function (err, data) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, data.Applications.map(function (app) {
            return {
                app_name: app.ApplicationName,
                app_templates: app.ConfigurationTemplates,
                app_created_at: app.DateCreated,
                app_updated_at: app.DateUpdated,
                app_description: app.Description,
                app_versions: app.Versions
            };
        }));
    });
});

schema.on('read', '/aws-environments',
filters.authCheck,
function (callback) {
    ELB.describeEnvironments({}, function (err, data) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, data.Environments.map(function (env) {
            return {
                env_id: env.EnvironmentId,
                env_name: env.EnvironmentName,
                env_application: env.ApplicationName,
                env_version: env.VersionLabel,
                env_solution: env.SolutionStackName,
                env_description: env.Description,
                env_endpoint: env.EndpointURL,
                env_cname: env.CNAME,
                env_created_at: env.DateCreated,
                env_updated_at: env.DateUpdated,
                env_status: env.Status,
                env_health: env.Health
            };
        }));
    });
});

schema.on('read', '/aws-versions/:app_name',
filters.authCheck,
function (app_name, callback) {
    ELB.describeApplicationVersions({
        "ApplicationName": app_name
    }, function (err, data) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, data.ApplicationVersion.map(function (version) {
            return {
                app_name: version.ApplicationName,
                version_description: version.Description,
                version_label: version.VersionLabel,
                version_s3_bucket: version.SourceBundle.S3Bucket,
                version_s3_key: version.SourceBundle.S3Key,
                version_created_at: version.DateCreated,
                version_updated_at: version.DateUpdated
            };
        }));
    });
});