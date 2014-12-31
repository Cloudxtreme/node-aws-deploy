*node-aws-deploy*
===============

Simple service to automate deploying Node.JS applications into AWS Elastic
Beanstalk environments.

Usage
-----

Configuration
-------------

Application packages
--------------------

Repository Triggers
-------------------

Any repository can be associated with a secret which can be used to do verified
requests to refresh repository status.

For Github, the secret is used to verify the HMAC signature of the request. The
trigger URL should be set to: /api/1/repository/github/trigger and the secret
be inserted into the webook configuration. It only respects push events.
