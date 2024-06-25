#!/usr/bin/env bash

set -eu

remove_quotes() {
    echo "$1" | tr -d '"'
}

run_tests() {
    local error_code=0
    for test_script in "$@"; do
        npm run "$test_script" || error_code=$?
    done
    return $error_code
}

# Navigate to script directory
cd /src

# Initialize error_code
error_code=0

# Configuration and test execution based on SAM_STACK_NAME
case "$SAM_STACK_NAME" in
    "f2f-yoti-stub")
        echo "Running Yoti Stub Test Suite"
        export DEV_F2F_YOTI_STUB_URL=$(remove_quotes "$CFN_F2FYotiStubURL")
        run_tests "test:yoti"
        ;;

    "f2f-cri-api")
        echo "Running Backend API Test Suite"
        
        # Define the environment variables to export
        env_vars=(
            "DEV_CRI_F2F_API_URL=CFN_F2FBackendURL"
            "DEV_IPV_F2F_STUB_URL=CFN_F2FIPVStubExecuteURL"
            "DEV_F2F_TEST_HARNESS_URL=CFN_F2FTestHarnessURL"
            "GOV_NOTIFY_API=CFN_F2FGovNotifyURL"
            "DEV_F2F_PO_STUB_URL=CFN_F2FPostOfficeStubURL"
            "VC_SIGNING_KEY_ID=CFN_VcSigningKeyId"
            "DNS_SUFFIX=CFN_DNSSuffix"
            "DEV_F2F_SESSION_TABLE_NAME=CFN_SessionTableName"
        )
        
        # Loop through and export each variable
        for var in "${env_vars[@]}"; do
            key=${var%=*}
            value=${var#*=}
            export "$key"=$(remove_quotes "${!value}")
        done

        run_tests "test:api" "test:api-third-party"
        ;;
        
    *)
        echo "No matching API Test Suite for $SAM_STACK_NAME"
        exit 0
        ;;
esac

# Results and error handling
cp -rf results $TEST_REPORT_ABSOLUTE_DIR || true

# Installation and additional testing if all prior tests succeeded
apt-get install jq -y
run_tests "test:pii"
exit $?
