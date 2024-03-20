#!/usr/bin/env bash

set -eu

remove_quotes () {
  echo "$1" | tr -d '"'
}

#The CFN variables seem to include quotes when used in tests these must be removed before assigning them.
# shellcheck disable=SC2154
export DEV_CRI_F2F_API_URL=$(remove_quotes "$CFN_F2FBackendURL")
# shellcheck disable=SC2154
export DEV_IPV_F2F_STUB_URL=$(remove_quotes "$CFN_F2FIPVStubExecuteURL")start
# shellcheck disable=SC2154
export DEV_F2F_YOTI_STUB_URL=$(remove_quotes "$CFN_F2FYotiStubURL")
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
export DEV_F2F_SESSION_TABLE_NAME=$(remove_quotes "$CFN_SessionTableName")

cd /src; npm run test:api
cp -rf results $TEST_REPORT_ABSOLUTE_DIR

sleep 2m

apt-get install jq -y
cd /src; npm run test:pii
error_code=$?

exit $error_code

