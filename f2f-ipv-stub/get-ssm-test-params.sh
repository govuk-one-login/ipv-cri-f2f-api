#! /bin/bash
set -eu

get_parameters_by_path() { aws ssm get-parameters-by-path --with-decryption --path "${1}" --query "Parameters[*].[join('=', [Name, Value])]" --output text; }

if [[ "${1}" = "-h" || "${1}" = "--help" || ( -z "${1}" && -z "${2}" ) ]]
then
  echo -e 'Example usage:\n  ./get-ssm-test-params.sh [OUTPUT_FILE] [SSM_PARAMETER_PREFIX]'
  exit 0
fi

OUTPUT_FILE="${1}"
SSM_PARAMETER_PREFIX="$(echo "${2}" | sed -E 's/^\/?/\//g; s/\/?$/\//g;')"

:> "${OUTPUT_FILE}"

get_parameters_by_path "${SSM_PARAMETER_PREFIX}" |
while IFS="" read -r LINE || [ -n "${LINE}" ]
do
  ESCAPED_KEY_AND_VALUE="$(echo "${LINE}" | sed -E "s/${SSM_PARAMETER_PREFIX//\//\\/}([0-9A-Za-z_]+)=(.+)$/\1='\2'/g; s/\'([^$])/\\\'\1/g; s/\\\'/\'/1;")"

  echo "${ESCAPED_KEY_AND_VALUE}" >> "${OUTPUT_FILE}"
done