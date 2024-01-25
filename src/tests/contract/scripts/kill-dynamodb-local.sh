#!/bin/bash

# Step 1: Identify the Running DynamoDB Local Container
echo "Identifying the running DynamoDB Local container..."
container_id=$(docker ps -q --filter ancestor=amazon/dynamodb-local)

# Check if the container is running
if [ -z "$container_id" ]
then
    echo "No DynamoDB Local container is currently running."
else
    # Step 2: Stop the DynamoDB Local Container
    echo "Stopping the DynamoDB Local container..."
    docker stop $container_id

    # Optional: Remove the stopped container
    echo "Removing the stopped container..."
    docker rm $container_id

    echo "DynamoDB Local container has been stopped and removed."
fi