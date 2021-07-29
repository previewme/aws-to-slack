# cloudwatch-events-to-slack

[![CI Workflow](https://github.com/previewme/cloudwatch-events-to-slack/actions/workflows/ci.yml/badge.svg)](https://github.com/previewme/cloudwatch-events-to-slack/actions/workflows/ci.yml)
[![Coverage](https://sonarcloud.io/api/project_badges/measure?project=previewme_cloudwatch-events-to-slack&metric=coverage)](https://sonarcloud.io/dashboard?id=previewme_cloudwatch-events-to-slack)
[![Vulnerabilities](https://sonarcloud.io/api/project_badges/measure?project=previewme_cloudwatch-events-to-slack&metric=vulnerabilities)](https://sonarcloud.io/dashboard?id=previewme_cloudwatch-events-to-slack)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=previewme_cloudwatch-events-to-slack&metric=alert_status)](https://sonarcloud.io/dashboard?id=previewme_cloudwatch-events-to-slack)

Based on [aws-to-slack](https://github.com/arabold/aws-to-slack).

This AWS lambda function processes the following AWS events from Amazon SNS and forwards them to a Slack App webhook.

* Cloudwatch Alarms

## Build

To build the lambda function run the following.

```
npm install
npm build
```

## Test

To run the tests.

```
npm test
```

## Package

The following will package the lambda function into a zip bundle to allow manual deployment.

```
zip -q -r dist/lambda.zip node_modules dist
```
