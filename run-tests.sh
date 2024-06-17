#!/usr/bin/env bash

set -eu

remove_quotes () {
  echo "$1" | tr -d '"'
}

if [ "$SAM_STACK_NAME" == "f2f-yoti-stub" ]; then
 export DEV_F2F_YOTI_STUB_URL=$(remove_quotes "$CFN_F2FYotiStubURL")
  npm run test:yoti    
elif [ "$SAM_STACK_NAME" == "f2f-cri-api" ]; then
  echo "SAM_STACK_NAME is f2f-cri-api"
#The CFN variables seem to include quotes when used in tests these must be removed before assigning them.
# shellcheck disable=SC2154
export DEV_CRI_F2F_API_URL=$(remove_quotes "$CFN_F2FBackendURL")
# shellcheck disable=SC2154
export DEV_IPV_F2F_STUB_URL=$(remove_quotes "$CFN_F2FIPVStubExecuteURL")start
# shellcheck disable=SC2154
export DEV_F2F_TEST_HARNESS_URL=$(remove_quotes "$CFN_F2FTestHarnessURL")
# shellcheck disable=SC2154
export GOV_NOTIFY_API=$(remove_quotes "$CFN_F2FGovNotifyURL")
# shellcheck disable=SC2154
export DEV_F2F_PO_STUB_URL=$(remove_quotes "$CFN_F2FPostOfficeStubURL")
# shellcheck disable=SC2154
export VC_SIGNING_KEY_ID=$(remove_quotes "$CFN_VcSigningKeyId")
# shellcheck disable=SC2154
export DNS_SUFFIX=$(remove_quotes "$CFN_DNSSuffix")
# shellcheck disable=SC2154
export DEV_F2F_SESSION_TABLE_NAME=$(remove_quotes "$CFN_SessionTableName")else
  npm run test:api   
fi

# disabling error_check to allow report generation for successful + failed tests
set +e
cd /src; npm run test:api
error_code=$?
cp -rf results $TEST_REPORT_ABSOLUTE_DIR
if [ $error_code -ne 0 ]
then
  exit $error_code
fi

sleep 2m

set -e
apt-get install jq -y
cd /src; npm run test:pii
error_code=$?

exit $error_code

