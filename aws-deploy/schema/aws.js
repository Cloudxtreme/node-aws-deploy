var AWS = require('../aws-sdk');

var schema = require('server-core').schema;
var filters = require('../filters');

var EB = new AWS.ElasticBeanstalk();
var S3 = new AWS.S3();

schema.on('read', '/aws/apps',
filters.authCheck,
function (callback) {
    EB.describeApplications({}, function (err, data) {
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

    EB.describeEnvironments({
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

schema.on('read', '/aws/s3/buckets',
filters.authCheck,
function (callback) {
    S3.listBuckets({}, function (err, data) {
        if (err) {
            callback(err);
            return;
        }

        callback(null, data.Buckets.map(function (bucket) {
            return {
                bucket_name: bucket.Name,
                bucket_created_at: bucket.CreationDate
            };
        }));
    });
});
