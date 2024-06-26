#!/usr/bin/env bash

set -eu

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
        export DEV_IPV_F2F_STUB_URL=$(remove_quotes "$CFN_F2FIPVStubExecuteURL")
        export DEV_F2F_TEST_HARNESS_URL=$(remove_quotes "$CFN_F2FTestHarnessURL")
        export GOV_NOTIFY_API=$(remove_quotes "$CFN_F2FGovNotifyURL")
        export DEV_F2F_PO_STUB_URL=$(remove_quotes "$CFN_F2FPostOfficeStubURL")
        export VC_SIGNING_KEY_ID=$(remove_quotes "$CFN_VcSigningKeyId")
        export DNS_SUFFIX=$(remove_quotes "$CFN_DNSSuffix")
        export DEV_F2F_SESSION_TABLE_NAME=$(remove_quotes "$CFN_SessionTableName")
        
        run_tests "test:api" "test:api-third-party"
        error_code=$?
        ;;

    *)
        echo "No matching API Test Suite for $SAM_STACK_NAME"
        exit 0
        ;;
esac

# Results and error handling
cp -rf results $TEST_REPORT_ABSOLUTE_DIR
[ $error_code -ne 0 ] && exit $error_code

# Installation and additional testing if all prior tests succeeded
apt-get install jq -y
run_tests "test:pii"
exit $?
