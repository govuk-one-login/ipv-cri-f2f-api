#!/bin/bash

# Step 1: Run DynamoDB Local in Docker

# Pull the DynamoDB Local Docker Image
echo "Pulling DynamoDB Local Docker Image..."
docker pull amazon/dynamodb-local

# Start the DynamoDB Local Container
echo "Starting DynamoDB Local Docker Container..."
docker run -d -p 8000:8000 amazon/dynamodb-local

# Wait a bit to ensure DynamoDB Local starts
echo "Waiting for DynamoDB Local to start..."
sleep 5

# Step 2: Create the Table

# Configure AWS CLI for local use
echo "Configuring AWS CLI for local use..."
aws configure set default.region us-west-2
aws configure set output json

# Create the session Table
echo "Creating the DynamoDB session-table..."
aws dynamodb create-table \
    --table-name session-table \
    --attribute-definitions AttributeName=sessionId,AttributeType=S \
    --key-schema AttributeName=sessionId,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --endpoint-url http://localhost:8000

# Step 3: Add the Record to the Table

# Insert the session-items to session-table
echo "Inserting a record into the session-table..."
aws dynamodb batch-write-item \
    --request-items file://data/session-items.json \
    --return-consumed-capacity TOTAL \
    --endpoint-url http://localhost:8000 

# Create the person-identity Table
echo "Creating the DynamoDB person-identity-table..."
aws dynamodb create-table \
    --table-name person-identity-table \
    --attribute-definitions AttributeName=sessionId,AttributeType=S \
    --key-schema AttributeName=sessionId,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --endpoint-url http://localhost:8000

# Step 3: Add the Record to the Table

# Insert the person-identity-items to person-identity-table
echo "Inserting a record into the person-identity-table..."
aws dynamodb put-item \
    --table-name person-identity-table \
    --item file://data/person-identity-items.json \
    --return-consumed-capacity TOTAL \
    --endpoint-url http://localhost:8000 

echo "DynamoDB Local setup complete."
