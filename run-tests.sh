#!/usr/bin/env bash

set -eu

remove_quotes() {
  echo "$1" | tr -d '"'
}

set +e
cd /src

run_tests_for_yoti_stub() {
  export DEV_F2F_YOTI_STUB_URL=$(remove_quotes "$CFN_F2FYotiStubURL")
  npm run test:yoti
  return $?
}

run_tests_for_cri_api() {
  export DEV_CRI_F2F_API_URL=$(remove_quotes "$CFN_F2FBackendURL")
  export DEV_IPV_F2F_STUB_URL=$(remove_quotes "$CFN_F2FIPVStubExecuteURL")
  export DEV_F2F_TEST_HARNESS_URL=$(remove_quotes "$CFN_F2FTestHarnessURL")
  export GOV_NOTIFY_API=$(remove_quotes "$CFN_F2FGovNotifyURL")
  export DEV_F2F_PO_STUB_URL=$(remove_quotes "$CFN_F2FPostOfficeStubURL")
  export VC_SIGNING_KEY_ID=$(remove_quotes "$CFN_VcSigningKeyId")
  export DNS_SUFFIX=$(remove_quotes "$CFN_DNSSuffix")
  export DEV_F2F_SESSION_TABLE_NAME=$(remove_quotes "$CFN_SessionTableName")
  
  npm run test:api
  local test_api_error_code=$?
  
  npm run test:api-third-party
  local test_api_third_party_error_code=$?
  
  # Combine error codes to ensure script fails if either test fails
  if [ $test_api_error_code -ne 0 ] || [ $test_api_third_party_error_code -ne 0 ]; then
    return 1
  else
    return 0
  fi
}

handle_test_results() {
  cp -rf results $TEST_REPORT_ABSOLUTE_DIR
  if [ $1 -ne 0 ]; then
    exit $1
  fi
}

install_dependencies_and_run_pii_tests() {
  sleep 2m

  set -e
  apt-get install jq -y
  npm run test:pii
  return $?
}

main() {
  local error_code=0

  if [ "$SAM_STACK_NAME" == "f2f-yoti-stub" ]; then
    run_tests_for_yoti_stub
    error_code=$?
  elif [ "$SAM_STACK_NAME" == "f2f-cri-api" ]; then
    echo "SAM_STACK_NAME is f2f-cri-api"
    run_tests_for_cri_api
    error_code=$?
  else 
    echo "No BackEnd Regression Tests being Ran"
    exit 0
  fi

  handle_test_results $error_code

  install_dependencies_and_run_pii_tests
  error_code=$?

  exit $error_code
}

main
