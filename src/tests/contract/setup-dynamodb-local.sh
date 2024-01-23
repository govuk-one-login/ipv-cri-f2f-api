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
aws configure set aws_access_key_id dummy
aws configure set aws_secret_access_key dummy
aws configure set default.region us-west-2
aws configure set output json

# Create the Table
echo "Creating the DynamoDB table..."
aws dynamodb create-table \
    --table-name session-table \
    --attribute-definitions AttributeName=sessionId,AttributeType=S \
    --key-schema AttributeName=sessionId,KeyType=HASH \
    --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1 \
    --endpoint-url http://localhost:8000

# Step 3: Add the Record to the Table

# Insert the Record
echo "Inserting a record into the table..."
aws dynamodb put-item \
    --table-name session-table \
    --item '{
      "sessionId": {"S": "732075c8-08e6-4b25-ad5b-d6cb865a18e5"},
      "attemptCount": {"N": "0"},
      "authSessionState": {"S": "F2F_YOTI_SESSION_CREATED"},
      "clientId": {"S": "5C584572"},
      "clientSessionId": {"S": "ab8a26249a268c7d678b713c51d70fe5"},
      "createdDate": {"N": "1686070173439"},
      "expiryDate": {"N": "1687020573439"},
      "redirectUri": {"S": "https://f2f-ipv-stub-ipvstub.review-o.dev.account.gov.uk/redirect"},
      "reminderEmailSent": {"BOOL": true},
      "state": {"S": "236a9875d6baf2c3fcc651feadda3340"},
      "subject": {"S": "8bce6c9f-6840-448c-a2f6-212ecc77e2f7"},
      "yotiSessionId": {"S": "7af57b1e-740e-4ee2-8721-602a56440029"}
    }' \
    --endpoint-url http://localhost:8000

echo "DynamoDB Local setup complete."
