#!/bin/bash

# Store the current directory in a variable
original_dir=$(pwd)

# Initialize an empty array to store the selected stack names
stacksToDelete=()

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

# Function to prompt the user for deletion
prompt_for_deletion() {
    local stack_name="$1"
    echo ""
    read -p "🤔 Do you wish to delete $stack_name? (y/n): " delete_choice
    if [[ "$delete_choice" == "y" || "$delete_choice" == "Y" ]]; then
        stacksToDelete+=("$stack_name")
        echo "Marked $stack_name for deletion ✅"
    else
        echo "Skipping deletion for $stack_name ⏭️"
    fi
}

# Prompt the user for each stack deletion
prompt_for_deletion "$L2KMSStackName"
prompt_for_deletion "$L2DynamoStackName"
prompt_for_deletion "$IPVStackName"
prompt_for_deletion "$DevStackName"
prompt_for_deletion "$TestHarnessStackName"
prompt_for_deletion "$YotiStubStackName"
prompt_for_deletion "$GovNotifyStackName"

echo ""
echo "💥 Deleting the following stacks: ${stacksToDelete[*]}! 💥"

# Function to create and run deletion command in parallel
run_deletion_in_parallel() {
    local stack_name="$1"
    local dir="$2"
    local delete_command="$3"  # Pass the 'sam delete' command as a parameter

    echo ""
    echo "⏳ Deleting $stack_name ⏳"
    echo ""

    cd "$dir"
    eval "$delete_command"  # Execute the 'sam delete' command passed as a parameter
    cd "$original_dir"
}

# Loop through the selected stack names and create deletion commands for the rest
for stack_name in "${stacksToDelete[@]}"; do
    case "$stack_name" in
        "$L2KMSStackName" | "$L2DynamoStackName" | "$IPVStackName" | "$DevStackName")
            # Skip L2KMSStackName, L2DynamoStackName, IPVStackName, and DevStackName as they were deleted earlier
            continue
            ;;
        "$TestHarnessStackName" | "$YotiStubStackName" | "$GovNotifyStackName")
            # Pass the 'sam delete' command for TestHarnessStackName, YotiStubStackName, and GovNotifyStackName
            
            # Pass the correct directory to run_deletion_in_parallel based on the stack name
            case "$stack_name" in
                "$TestHarnessStackName")
										eval "./delete-s3-bucket.sh $TestHarnessStackName-f2f-event-test-dev"
                    dir="../test-harness"
                    delete_command="sam delete --stack-name $TestHarnessStackName --no-prompts --region eu-west-2"
                    ;;
                "$YotiStubStackName")
                    dir="../yoti-stub"
                    delete_command="sam delete --stack-name $YotiStubStackName --no-prompts --region eu-west-2"
                    ;;
                "$GovNotifyStackName")
                    dir="../gov-notify-stub"
                    delete_command="sam delete --stack-name $GovNotifyStackName --no-prompts --region eu-west-2"
                    ;;
            esac
            
            # Create deletion commands for TestHarnessStackName, YotiStubStackName, and GovNotifyStackName and run them in parallel
            run_deletion_in_parallel "$stack_name" "$dir" "$delete_command" &
            ;;
    esac
done

# Wait for Layer 3 deletions to finish
wait

# Delete IPVStackName and DevStackName in parallel
if [[ " ${stacksToDelete[@]} " =~ " $IPVStackName " && " ${stacksToDelete[@]} " =~ " $DevStackName " ]]; then
    delete_command="sam delete --stack-name $IPVStackName --no-prompts --region eu-west-2"
    run_deletion_in_parallel "$IPVStackName" "../f2f-ipv-stub" "$delete_command" &
    
		eval "./delete-s3-bucket.sh $DevStackName-jwks-f2f-dev"
    delete_command="sam delete --stack-name $DevStackName --no-prompts --region eu-west-2"
    run_deletion_in_parallel "$DevStackName" "../deploy" "$delete_command" &
fi

# Wait for Layer 2 deletions to finish
wait

# Delete L2KMSStackName and L2DynamoStackName in parallel
if [[ " ${stacksToDelete[@]} " =~ " $L2KMSStackName " && " ${stacksToDelete[@]} " =~ " $L2DynamoStackName " ]]; then
    delete_command="sam delete --stack-name $L2KMSStackName --no-prompts --region eu-west-2"
    run_deletion_in_parallel "$L2KMSStackName" "../infra-l2-kms" "$delete_command" &
    
    delete_command="sam delete --stack-name $L2DynamoStackName --no-prompts --region eu-west-2"
    run_deletion_in_parallel "$L2DynamoStackName" "../infra-l2-dynamo" "$delete_command" &
fi

# Wait for all deletions to finish
wait

echo ""
echo "🎉 Following Stacks Deleted Successfully: ${stacksToDelete[*]}! 🎉"
echo ""