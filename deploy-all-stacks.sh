#!/bin/bash

# Store the current directory in a variable
original_dir=$(pwd)

# Initialize an empty array to store the selected stack names
stacksToDeploy=()

# Prompt the user to enter values for the variables
read -p "Enter L2KMSStackName: " L2KMSStackName
read -p "Enter L2DynamoStackName: " L2DynamoStackName
read -p "Enter IPVStackName: " IPVStackName
read -p "Enter DevStackName: " DevStackName
read -p "Enter TestHarnessStackName: " TestHarnessStackName
read -p "Enter YotiStubStackName: " YotiStubStackName
read -p "Enter GovNotifyStackName: " GovNotifyStackName


# Function to prompt the user for deployment
prompt_for_deployment() {
    local stack_name="$1"
		echo ""
    read -p "Do you wish to deploy $stack_name?(y/n): " deploy_choice
    if [[ "$deploy_choice" == "y" || "$deploy_choice" == "Y" ]]; then
        stacksToDeploy+=("$stack_name")
				echo "Marked $stack_name for deployment"
    else
        echo "Skipping deployment for $stack_name"
    fi
}

# Prompt the user for each stack deployment
prompt_for_deployment "$L2KMSStackName"
prompt_for_deployment "$L2DynamoStackName"
prompt_for_deployment "$IPVStackName"
prompt_for_deployment "$DevStackName"
prompt_for_deployment "$TestHarnessStackName"
prompt_for_deployment "$YotiStubStackName"
prompt_for_deployment "$GovNotifyStackName"

echo ""
echo "Deploying the following stacks: ${stacksToDeploy[*]}!"

# Loop through the selected stack names and deploy them
for stack_name in "${stacksToDeploy[@]}"; do
    case "$stack_name" in
        "$L2KMSStackName")
            cd infra-l2-kms
            sam build ; sam deploy --config-env dev --resolve-s3 --stack-name "$L2KMSStackName"
            cd "$original_dir"
            ;;
        "$L2DynamoStackName")
            cd infra-l2-dynamo
            sam build ; sam deploy --config-env dev --resolve-s3 --stack-name "$L2DynamoStackName"
            cd "$original_dir"
            ;;
        "$IPVStackName")
            cd f2f-ipv-stub
            sam build ; sam deploy --stack-name "$IPVStackName" --resolve-s3 --capabilities CAPABILITY_IAM
            cd "$original_dir"
            ;;
        "$DevStackName")
            cd deploy
            sam build ; sam deploy --config-env dev --resolve-s3 --stack-name "$DevStackName" --parameter-overrides "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" L2DynamoStackName=\"$L2DynamoStackName\" L2KMSStackName=\"$L2KMSStackName\"" --capabilities CAPABILITY_IAM
            cd "$original_dir"
            ;;
        "$TestHarnessStackName")
            cd test-harness
            sam build ; sam deploy --config-env dev --resolve-s3 --stack-name "$TestHarnessStackName" --parameter-overrides "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" BackendStack=\"$DevStackName\"" --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
            cd "$original_dir"
            ;;
				"$YotiStubStackName")
            cd yoti-stub
            sam build; sam deploy --config-env dev --resolve-s3 --stack-name "$YotiStubStackName" --parameter-overrides "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" L2DynamoStackName=\"$L2DynamoStackName\" L2KMSStackName=\"$L2KMSStackName\"" --capabilities CAPABILITY_IAM
            cd "$original_dir"
            ;;
        "$GovNotifyStackName")
            cd gov-notify-stub
            sam build; sam deploy --config-env dev --resolve-s3 --stack-name "$GovNotifyStackName" --parameter-overrides "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" L2DynamoStackName=\"$L2DynamoStackName\" L2KMSStackName=\"$L2KMSStackName\"" --capabilities CAPABILITY_IAM
            cd "$original_dir"
            ;;
    esac
done

echo ""
echo "Following Stacks Deployed Successfully: ${stacksToDeploy[*]}!"