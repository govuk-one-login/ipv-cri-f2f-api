#!/bin/bash

# Store the current directory in a variable
original_dir=$(pwd)

# Initialize an empty array to store the selected stack names
stacksToDelete=()

# Prompt the user to enter values for the variables
read -p "Enter GovNotifyStackName: " GovNotifyStackName
read -p "Enter YotiStubStackName: " YotiStubStackName
read -p "Enter TestHarnessStackName: " TestHarnessStackName
read -p "Enter DevStackName: " DevStackName
read -p "Enter IPVStackName: " IPVStackName
read -p "Enter L2DynamoStackName: " L2DynamoStackName
read -p "Enter L2KMSStackName: " L2KMSStackName

# Function to prompt the user for deployment
prompt_for_deletion() {
    local stack_name="$1"
		echo ""
    read -p "🤔 Do you wish to delete $stack_name?(y/n): " delete_choice
    if [[ "$delete_choice" == "y" || "$delete_choice" == "Y" ]]; then
        stacksToDelete+=("$stack_name")
				echo "Marked $stack_name for deletion ✅"
    else
        echo "Skipping deletion for $stack_name ⏭️"
    fi
}

# Prompt the user for each stack deletion
prompt_for_deletion "$GovNotifyStackName"
prompt_for_deletion "$YotiStubStackName"
prompt_for_deletion "$TestHarnessStackName"
prompt_for_deletion "$DevStackName"
prompt_for_deletion "$IPVStackName"
prompt_for_deletion "$L2DynamoStackName"
prompt_for_deletion "$L2KMSStackName"

echo ""
echo "💥 Deleting the following stacks: ${stacksToDelete[*]}! 💥"

# Loop through the selected stack names and delete them
for stack_name in "${stacksToDelete[@]}"; do
    case "$stack_name" in
        "$L2KMSStackName")
            cd ../infra-l2-kms
            sam delete --config-env dev --resolve-s3 --stack-name "$L2KMSStackName"
            cd "$original_dir"
            ;;
        "$L2DynamoStackName")
            cd ../infra-l2-dynamo
            sam delete --config-env dev --resolve-s3 --stack-name "$L2DynamoStackName"
            cd "$original_dir"
            ;;
        "$IPVStackName")
            cd ../f2f-ipv-stub
            sam delete --stack-name "$IPVStackName" --resolve-s3 --capabilities CAPABILITY_IAM
            cd "$original_dir"
            ;;
        "$DevStackName")
            cd ../deploy
            sam delete --config-env dev --resolve-s3 --stack-name "$DevStackName" --parameter-overrides "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" L2DynamoStackName=\"$L2DynamoStackName\" L2KMSStackName=\"$L2KMSStackName\"" --capabilities CAPABILITY_IAM
            cd "$original_dir"
            ;;
        "$TestHarnessStackName")
            cd ../test-harness
            sam delete --config-env dev --resolve-s3 --stack-name "$TestHarnessStackName" --parameter-overrides "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" BackendStack=\"$DevStackName\"" --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
            cd "$original_dir"
            ;;
				"$YotiStubStackName")
            cd ../yoti-stub
            sam delete --config-env dev --resolve-s3 --stack-name "$YotiStubStackName" --parameter-overrides "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" L2DynamoStackName=\"$L2DynamoStackName\" L2KMSStackName=\"$L2KMSStackName\"" --capabilities CAPABILITY_IAM
            cd "$original_dir"
            ;;
        "$GovNotifyStackName")
            cd ../gov-notify-stub
            sam delete --config-env dev --resolve-s3 --stack-name "$GovNotifyStackName" --parameter-overrides "CodeSigningConfigArn=\"none\" Environment=\"dev\" PermissionsBoundary=\"none\" SecretPrefix=\"none\" VpcStackName=\"vpc-cri\" L2DynamoStackName=\"$L2DynamoStackName\" L2KMSStackName=\"$L2KMSStackName\"" --capabilities CAPABILITY_IAM
            cd "$original_dir"
            ;;
    esac
done

echo ""
echo "🎉 Following Stacks Deleted Successfully: ${stacksToDelete[*]}! 🎉"