#!/bin/bash

# Store the current directory in a variable
original_dir=$(pwd)

# Initialize an empty array to store the selected stack names
stacksToDeploy=()

# Read values from deploymentOptions.json
if [ -f "deploymentOptions.json" ]; then
    L2KMSStackName=$(jq -r '.L2KMSStackName' deploymentOptions.json)
    L2DynamoStackName=$(jq -r '.L2DynamoStackName' deploymentOptions.json)
    IPVStackName=$(jq -r '.IPVStackName' deploymentOptions.json)
    DevStackName=$(jq -r '.DevStackName' deploymentOptions.json)
    TestHarnessStackName=$(jq -r '.TestHarnessStackName' deploymentOptions.json)
    YotiStubStackName=$(jq -r '.YotiStubStackName' deploymentOptions.json)
    GovNotifyStackName=$(jq -r '.GovNotifyStackName' deploymentOptions.json)
else
    echo "deploymentOptions.json file not found. Please make sure it exists."
    exit 1
fi

# Function to prompt the user for deployment
prompt_for_deployment() {
    local stack_name="$1"
    echo ""
    read -p "🤔 Do you wish to deploy $stack_name? (y/n): " deploy_choice
    if [[ "$deploy_choice" == "y" || "$deploy_choice" == "Y" ]]; then
        stacksToDeploy+=("$stack_name")
        echo "Marked $stack_name for deployment ✅"
    else
        echo "Skipping deployment for $stack_name ⏭️"
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
echo "🛠️ Deploying the following stacks: ${stacksToDeploy[*]}! 🛠️"

# Function to create and run deployment command in parallel
run_deployment_in_parallel() {
    local stack_name="$1"
    local dir="$2"
    local deploy_command="$3"  # Pass the 'sam deploy' command as a parameter

    echo ""
    echo "⏳ Deploying $stack_name ⏳"
    echo ""

    cd "$dir"
    sam build
    if eval "$deploy_command"; then
        echo "$stack_name deployment succeeded ✅"
    else
        echo "❌ $stack_name deployment failed"
        exit 1  # Terminate the script with an error code
    fi
    cd "$original_dir"
}

# Deploy L2KMSStackName and L2DynamoStackName in parallel
if [[ " ${stacksToDeploy[@]} " =~ " $L2KMSStackName " && " ${stacksToDeploy[@]} " =~ " $L2DynamoStackName " ]]; then
    deploy_command="sam build && sam deploy --config-env dev --resolve-s3 --stack-name $L2KMSStackName"
    run_deployment_in_parallel "$L2KMSStackName" "../infra-l2-kms" "$deploy_command" &
    
    deploy_command="sam build && sam deploy --config-env dev --resolve-s3 --stack-name $L2DynamoStackName"
    run_deployment_in_parallel "$L2DynamoStackName" "../infra-l2-dynamo" "$deploy_command" &
fi

# Wait for Layer 2 deployments to finish
wait

# Deploy IPVStackName and DevStackName in parallel
if [[ " ${stacksToDeploy[@]} " =~ " $IPVStackName " && " ${stacksToDeploy[@]} " =~ " $DevStackName " ]]; then
    deploy_command="sam build && sam deploy --stack-name $IPVStackName --resolve-s3 --capabilities CAPABILITY_IAM"
    run_deployment_in_parallel "$IPVStackName" "../f2f-ipv-stub" "$deploy_command" &
    
    deploy_command="sam build && sam deploy --config-env dev --resolve-s3 --stack-name $DevStackName --parameter-overrides \"CodeSigningConfigArn=none Environment=dev PermissionsBoundary=none SecretPrefix=none VpcStackName=vpc-cri L2DynamoStackName=$L2DynamoStackName L2KMSStackName=$L2KMSStackName\" --capabilities CAPABILITY_IAM"
    run_deployment_in_parallel "$DevStackName" "../deploy" "$deploy_command" &
fi

# Wait for Layer 3 deployments to finish
wait

# Loop through the selected stack names and create deployment commands for the rest
for stack_name in "${stacksToDeploy[@]}"; do
    case "$stack_name" in
        "$L2KMSStackName" | "$L2DynamoStackName" | "$IPVStackName" | "$DevStackName")
            # Skip L2KMSStackName, L2DynamoStackName, IPVStackName, and DevStackName as they were deployed earlier
            continue
            ;;
        "$TestHarnessStackName" | "$YotiStubStackName" | "$GovNotifyStackName")
            # Pass the 'sam deploy' command for TestHarnessStackName, YotiStubStackName, and GovNotifyStackName
            
            # Pass the correct directory to run_deployment_in_parallel based on the stack name
            case "$stack_name" in
                "$TestHarnessStackName")
                    dir="../test-harness"
                    deploy_command="sam build && sam deploy --config-env dev --resolve-s3 --stack-name $TestHarnessStackName --parameter-overrides \"CodeSigningConfigArn=none Environment=dev PermissionsBoundary=none SecretPrefix=none VpcStackName=vpc-cri BackendStack=$DevStackName\" --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM"
                    ;;
                "$YotiStubStackName")
                    dir="../yoti-stub"
                    deploy_command="sam build && sam deploy --config-env dev --resolve-s3 --stack-name $YotiStubStackName --parameter-overrides \"CodeSigningConfigArn=none Environment=dev PermissionsBoundary=none SecretPrefix=none VpcStackName=vpc-cri L2DynamoStackName=$L2DynamoStackName L2KMSStackName=$L2KMSStackName\" --capabilities CAPABILITY_IAM"
                    ;;
                "$GovNotifyStackName")
                    dir="../gov-notify-stub"
                    deploy_command="sam build && sam deploy --config-env dev --resolve-s3 --stack-name $GovNotifyStackName --parameter-overrides \"CodeSigningConfigArn=none Environment=dev PermissionsBoundary=none SecretPrefix=none VpcStackName=vpc-cri L2DynamoStackName=$L2DynamoStackName L2KMSStackName=$L2KMSStackName\" --capabilities CAPABILITY_IAM"
                    ;;
            esac
            
            # Create deployment commands for TestHarnessStackName, YotiStubStackName, and GovNotifyStackName and run them in parallel
            run_deployment_in_parallel "$stack_name" "$dir" "$deploy_command" &
            ;;
    esac
done

# Wait for all deployments to finish
wait

echo ""
echo "🎉 Following Stacks Deployed Successfully: ${stacksToDeploy[*]}!"
