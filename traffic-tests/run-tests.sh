#!/usr/bin/env bash

set -eu

echo "RUNNING TRAFFIC TEST SCRIPT"

remove_quotes() {
    echo "$1" | tr -d '"'
}

run_tests() {
    local error_code=0

    for test_script in "${@}"; do
        npm run "$test_script"
        local test_result=$?
        [ $test_result -ne 0 ] && error_code=$test_result
    done

    return $error_code
}

# Navigate to script directory
cd /src

echo "RUNNING NEW SCRIPT"

# Configuration based on SAM_STACK_NAME
case "$SAM_STACK_NAME" in
    "f2f-yoti-stub")
        echo "Running Yoti Stub Test Suite"
        export DEV_F2F_YOTI_STUB_URL=$(remove_quotes "$CFN_F2FYotiStubURL")
        run_tests "test:yoti"
        error_code=$?
        ;;

    "f2f-cri-api")
        echo "Running API Test Suite"
        export DEV_CRI_F2F_API_URL=$(remove_quotes "$CFN_F2FBackendURL")
        export DEV_IPV_F2F_STUB_URL=$(remove_quotes "$CFN_F2FIPVStubExecuteURL")start
        export DEV_F2F_TEST_HARNESS_URL=$(remove_quotes "$CFN_F2FTestHarnessURL")
        export GOV_NOTIFY_API=$(remove_quotes "$CFN_F2FGovNotifyURL")
        export DEV_F2F_PO_STUB_URL=$(remove_quotes "$CFN_F2FPostOfficeStubURL")
        export VC_SIGNING_KEY_ID=$(remove_quotes "$CFN_VcSigningKeyId")
        export DNS_SUFFIX=$(remove_quotes "$CFN_DNSSuffix")
        export DEV_F2F_SESSION_TABLE_NAME=$(remove_quotes "$CFN_SessionTableName")
        export DEV_EXPIRED_SESSIONS_LAMBDA_NAME=$(remove_quotes "$CFN_ExpiredSessionsLambdaName")

        export DEV_F2F_PERSON_IDENTITY_TABLE_NAME=$(remove_quotes "$CFN_PersonIdentityTableName")

        run_tests "test:api-traffic" "test:api-third-party-traffic"
        sleep 300
        run_tests "test:api-traffic" "test:api-third-party-traffic"

        error_code=$?
        ;;

    *)
        echo "No matching API Test Suite for $SAM_STACK_NAME"
        exit 0
        ;;
esac

