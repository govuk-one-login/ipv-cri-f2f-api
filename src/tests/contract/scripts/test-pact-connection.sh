#!/bin/bash

# Read environment variables for authentication
username="$PACT_BROKER_USER"
password="$PACT_BROKER_PASSWORD"
pact_url="$PACT_BROKER_URL"

# Perform a GET request with Basic Authentication using curl
# Required to connect to PactBroker as Pact libraries don't allow testSource parameter to be passed in TS
response=$(curl -s -o /dev/null -w "%{http_code}" --user "$username:$password" "$pact_url")

# Check the HTTP status code of the response
if [ "$response" -eq 200 ]; then
    echo "PACT BROKER AUTHORIZED SUCCESSFULLY VIA PROVIDER"
else
    echo "Response code: $response"
fi
