import { ISessionItem } from "../models/ISessionItem";

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

type SupportedLocale = "en-GB" | "cy-GB";

export function formatPostOfficeExpiryDate(
    f2fSessionInfo: ISessionItem,
    locale: SupportedLocale,
): string {
    const { createdDate } = f2fSessionInfo;
    const expiryDate = createdDate + 15 * 86400; // Users have 15 days to go to the Post Office

    const dateObject = new Date(expiryDate * 1000); // Convert this timestamp from seconds to milliseconds
    const formattedDate = dateObject.toLocaleDateString(locale, {
        month: "long",
        day: "numeric",
    });
    return formattedDate;
}
