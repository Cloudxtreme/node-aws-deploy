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

schema.on('read', '/aws/apps',
filters.authCheck,
function (callback) {
    ELB.describeApplications({}, function (err, data) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, data.Applications.map(function (app) {
            return {
                application_name: app.ApplicationName,
                application_templates: app.ConfigurationTemplates,
                application_created_at: app.DateCreated,
                application_updated_at: app.DateUpdated,
                application_description: app.Description,
                application_versions: app.Versions
            };
        }));
    });
});

schema.on('read', '/aws/apps/:app_name/environments',
filters.authCheck,
function (app_name,callback) {
    if (!app_name) {
        callback("No app specified");
        return;
    }

    ELB.describeEnvironments({
        "ApplicationName": app_name
    }, function (err, data) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, data.Environments.map(function (env) {
            return {
                environment_id: env.EnvironmentId,
                environment_name: env.EnvironmentName,
                environment_application: env.ApplicationName,
                environment_version: env.VersionLabel,
                environment_solution: env.SolutionStackName,
                environment_description: env.Description,
                environment_endpoint: env.EndpointURL,
                environment_cname: env.CNAME,
                environment_created_at: env.DateCreated,
                environment_updated_at: env.DateUpdated,
                environment_status: env.Status,
                environment_health: env.Health
            };
        }));
    });
});

schema.on('read', '/aws/:app_name/versions',
filters.authCheck,
function (app_name, callback) {
    if (!app_name) {
        callback("No app specified");
        return;
    }

    ELB.describeApplicationVersions({
        "ApplicationName": app_name
    }, function (err, data) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, data.ApplicationVersions.map(function (version) {
            return {
                application_name: version.ApplicationName,
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