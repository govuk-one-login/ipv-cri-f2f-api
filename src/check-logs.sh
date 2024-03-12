#!/usr/bin/env bash

test_data="./tests/data/exampleStubPayload.json"
firstName=$(jq -r '.shared_claims.name[0].nameParts[0].value' "$test_data")
firstName1=$(jq -r '.shared_claims.name[0].nameParts[1].value' "$test_data")
lastName=$(jq -r '.shared_claims.name[0].nameParts[2].value' "$test_data")
birthDate=$(jq -r '.shared_claims.birthDate[0].value' "$test_data")
emailAddress=$(jq -r '.shared_claims.emailAddress' "$test_data")
address_postalCode=$(jq -r '.shared_claims.address[0].postalCode' "$test_data")

query="fields @timestamp, @message, @logStream, @log | filter @message like \"$firstName\""

function update_query_string() {
  # Get the array of search strings as arguments  
  local searchStrings=("$@")

  for value in "${searchStrings[@]}"
  do
    query+=" or @message like \"$value\""
  done

  # Return the updated query string
  echo $query
}

query=$(update_query_string $firstName1 $lastName $birthDate $emailAddress $address_postalCode)
echo $query

stack_name="f2f-cri-api"
log_groups=(
    "/aws/lambda/F2F-Authorization-$stack_name"
    "/aws/lambda/Access-Token-$stack_name"
    "/aws/lambda/Document-Selection-$stack_name"
    "/aws/lambda/F2F-ReminderEmail-$stack_name"
    "/aws/lambda/F2F-Session-$stack_name"
    "/aws/lambda/F2F-SessionConfig-$stack_name"
    "/aws/lambda/F2F-GovNotify-$stack_name"
    "/aws/lambda/F2F-YotiCallback-$stack_name"
    "/aws/lambda/F2F-TriggerYotiCallbackStateMachine-$stack_name"
    "/aws/lambda/F2F-ThankYouEmail-$stack_name"
    "/aws/lambda/Abort-$stack_name"
    "/aws/lambda/User-Info-$stack_name"
)

current_epoch=$(date +%s)
fifteen_mins_ago_epoch=$((current_epoch - (15 * 60)))

start_time=$fifteen_mins_ago_epoch
end_time=$current_epoch

query_id=$(aws logs start-query \
    --log-group-names "${log_groups[@]}" \
    --start-time "$start_time" \
    --end-time "$end_time" \
    --query-string "$query" \
    --output text --query 'queryId')

status="Running"
while [ "$status" = "Running" ]; do
    echo "Waiting for query to complete..."
    sleep 1
    query_status=$(aws logs get-query-results --query-id "$query_id")
    status=$(echo "$query_status" | grep -o '"status": "[^"]*"' | cut -d '"' -f 4)
done

if echo "$query_status" | grep -q '"results": \[\]'; then
    echo "Query found no PII 🎉"
    exit 0
else
    echo "Query returned results:"
    echo "$query_status" | jq -r '.results[] | @json'
    exit 1
fi