#!/usr/bin/env bash

set -eu

remove_quotes () {
  echo "$1" | tr -d '"'
}

set +e
cd /src

if [ "$SAM_STACK_NAME" == "f2f-yoti-stub" ]; then
  export DEV_F2F_YOTI_STUB_URL=$(remove_quotes "$CFN_F2FYotiStubURL")
  npm run test:yoti
  test_yoti_error_code=$?
elif [ "$SAM_STACK_NAME" == "f2f-cri-api" ]; then
  echo "SAM_STACK_NAME is f2f-cri-api"
  
  export DEV_CRI_F2F_API_URL=$(remove_quotes "$CFN_F2FBackendURL")
  export DEV_IPV_F2F_STUB_URL=$(remove_quotes "$CFN_F2FIPVStubExecuteURL")start
  export DEV_F2F_TEST_HARNESS_URL=$(remove_quotes "$CFN_F2FTestHarnessURL")
  export GOV_NOTIFY_API=$(remove_quotes "$CFN_F2FGovNotifyURL")
  export DEV_F2F_PO_STUB_URL=$(remove_quotes "$CFN_F2FPostOfficeStubURL")
  export VC_SIGNING_KEY_ID=$(remove_quotes "$CFN_VcSigningKeyId")
  export DNS_SUFFIX=$(remove_quotes "$CFN_DNSSuffix")
  export DEV_F2F_SESSION_TABLE_NAME=$(remove_quotes "$CFN_SessionTableName")
  
  npm run test:api
  test_api_error_code=$?
  
  npm run test:api-third-party
  test_api_third_party_error_code=$?
  
  # Combine error codes to ensure script fails if either test fails
  if [ $test_api_error_code -ne 0 ] || [ $test_api_third_party_error_code -ne 0 ]; then
    error_code=1
  else
    error_code=0
  fi
else 
  echo "No BackEnd Regression Tests being Ran"
  exit 0
fi

# Disabling error_check to allow report generation for successful + failed tests
cp -rf results $TEST_REPORT_ABSOLUTE_DIR
if [ $error_code -ne 0 ]; then
  exit $error_code
fi

sleep 2m

set -e
apt-get install jq -y
npm run test:pii
error_code=$?

exit $error_code
