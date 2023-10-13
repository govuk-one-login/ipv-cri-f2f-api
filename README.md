# di-ipv-cri-f2f-api

# Gov Notify Templates
The gov-notify-templates directory contains the templates required for sending email notification to the user. The name of the file matches the name of the template in the Gov notify portal for Face to Face Production service. The content of the file has the subject line and the message which should be copied without any changes as it includes gov notify formatting markdown.


## Stack deployment in DEV

To deploy an individual stack in the DEV account from a local branch with full DEBUG logging in the lambdas:

```shell
cd ./deploy
sam build --parallel
sam deploy --resolve-s3 --stack-name "YOUR_STACK_NAME" --confirm-changeset --config-env dev --parameter-overrides \
  "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" L2DynamoStackName=\"infra-l2-dynamo\" L2KMSStackName=\"infra-l2-kms\" PowertoolsLogLevel=\"DEBUG\""
```

If you need the reserved concurrencies set in DEV then add `ApplyReservedConcurrencyInDev=\"true\"` in to the `--parameter-overrides`.
Please only do this whilst you need them, if lots of stacks are deployed with these in DEV then deployments will start failing.

Stack Deployment Script
=======================

This is a Bash script designed to simplify the deployment process for multiple AWS CloudFormation stacks using AWS SAM (Serverless Application Model) for different components of your application. This script prompts the user to specify which stacks they want to deploy and then deploys them accordingly.

Prerequisites
-------------

Before running this script, make sure you have the following prerequisites:

-  Exported your AWS credentials from ControlTower for the F2F CRI AWS Account

Usage
-----

1.  Clone or download this repository to your local machine.

2.  Navigate to the directory containing the script.

3.  Make the script executable:

    `chmod +x deploy_stacks.sh`

4.  Run the script:

    `./deploy_stacks.sh`

5.  Follow the prompts to enter the names of the stacks you want to deploy. You can specify 'y' (yes) or 'n' (no) for each stack.

6.  Once you have made your selections, the script will deploy the selected stacks one by one.

Stack Descriptions
------------------

-   L2KMSStackName: Name of the Layer 2 KMS Stack stack.

-   L2DynamoStackName: Name of the Layer 2 DynamoDB stack.

-   IPVStackName: Name of the IPV stack.

-   DevStackName: Name of the Dev API stack.

-   TestHarnessStackName: Name of the Test Harness stack.

-   YotiStubStackName: Name of the Yoti Stub stack.

-   GovNotifyStackName: Name of the Gov Notify stack.

Deployment Details
------------------

The script will deploy the selected stacks with the following details:

-   L2KMSStackName: Deployed from the `infra-l2-kms` directory.

-   L2DynamoStackName: Deployed from the `infra-l2-dynamo` directory.

-   IPVStackName: Deployed from the `f2f-ipv-stub` directory.

-   DevStackName: Deployed from the `deploy` directory.

-   TestHarnessStackName: Deployed from the `test-harness` directory using AWS SAM. Configuration environment: `dev`. Additional parameters: `CodeSigningConfigArn`, `Environment`, `PermissionsBoundary`, `SecretPrefix`, `VpcStackName`, `BackendStack`. Capabilities: `CAPABILITY_IAM`, `CAPABILITY_NAMED_IAM`.

-   YotiStubStackName: Deployed from the `yoti-stub` directory.

-   GovNotifyStackName: Deployed from the `gov-notify-stub` directory.