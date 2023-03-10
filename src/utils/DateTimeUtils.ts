/**
 * Unix timestamp in seconds
 * The unix timestamp represents seconds elapsed since 01/01/1970
 *
 * @return Example output: 1657099344
 */
export function absoluteTimeNow(): number {
	return Math.floor(Date.now() / 1000);
}

const DEFAULT_AUTHORIZATION_CODE_TTL_IN_SECS = 600;
export function getAuthorizationCodeExpirationEpoch(authCodeTtl: string | undefined): number {

	let authorizationCodeTtlInMillis: number;
	if (authCodeTtl) {
		const authCodeTtlNo = Number(authCodeTtl);
		authorizationCodeTtlInMillis = (Number.isInteger(authCodeTtlNo) ? authCodeTtlNo : DEFAULT_AUTHORIZATION_CODE_TTL_IN_SECS) * 1000;
	} else {
		authorizationCodeTtlInMillis = DEFAULT_AUTHORIZATION_CODE_TTL_IN_SECS * 1000;
	}

	return Date.now() + authorizationCodeTtlInMillis;
}
