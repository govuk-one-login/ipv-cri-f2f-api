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