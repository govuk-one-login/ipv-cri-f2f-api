#!/usr/bin/env bash

set -eu

remove_quotes () {
  echo "$1" | tr -d '"'
}

#The CFN variables seem to include quotes when used in tests these must be removed before assigning them.
#CFN_F2FBackendURL_NoQuotes=$(remove_quotes "$CFN_F2FBackendURL")
#export DEV_CRI_F2F_API_URL=$(echo ${CFN_F2FBackendURL_NoQuotes%/})
# shellcheck disable=SC2154
export DEV_CRI_F2F_API_URL=$(remove_quotes "$CFN_F2FBackendURL")
# shellcheck disable=SC2154
export DEV_IPV_F2F_STUB_URL=$(remove_quotes "$CFN_F2FIPVStubExecuteURL")start
export DEV_F2F_EXPIRED_ACCESS_TOKEN=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImY0NWNkMzM4LTRmY2MtNDM2OS05NDBlLTg2ZjJiMDk1OTFjNyJ9.eyJzdWIiOiI2Y2QwYTk2My00Y2VhLTQ2NDUtOWE3NC05Y2QwODRiNzMxYmYiLCJhdWQiOiJodHRwczovL3Jldmlldy1vLmRldi5hY2NvdW50Lmdvdi51ayIsImlzcyI6Imh0dHBzOi8vcmV2aWV3LW8uZGV2LmFjY291bnQuZ292LnVrIiwiZXhwIjoxNjg0NDEzMDkyfQ.ZKrmFiBu5Ui0t4E0h17H8QPELE1V3FjeO7EQ-SF2-bYnmLfNTjCLvqjMrIgm5_fPDRCFU1N327VVMwHjQWzojw
export DEV_F2F_MISSING_SUB_ACCESS_TOKEN=eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImY0NWNkMzM4LTRmY2MtNDM2OS05NDBlLTg2ZjJiMDk1OTFjNyJ9.eyJhdWQiOiJodHRwczovL3Jldmlldy1vLmRldi5hY2NvdW50Lmdvdi51ayIsImlzcyI6Imh0dHBzOi8vcmV2aWV3LW8uZGV2LmFjY291bnQuZ292LnVrIiwiZXhwIjoxNjg0NDQ2NjQwfQ.qPRn-DWRUv-prYyZvWfV9wWkoCOQYw9iwZgpvDmX9Vic8McJp2rxO2rKdpAOtewgcUsV3enHz1-ewZ-kaSxidw
# shellcheck disable=SC2154
export DEV_F2F_YOTI_STUB_URL=$(remove_quotes "$CFN_F2FYotiStubURL")

cd src; npm run test:api
cp -rf results $TEST_REPORT_ABSOLUTE_DIR
