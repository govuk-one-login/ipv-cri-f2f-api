export const SECURITY_HEADERS = {
	"Cache-Control": "no-store",
	"Content-Type": "application/json",
	"Strict-Transport-Security": "max-age=31536000",
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
};

type Headers = {
	[header: string]: boolean | number | string;
};

const mergeHeaders = (
	baseHeaders: Headers,
	newHeaders?: Headers,
) => {
	if (!newHeaders) return baseHeaders;
	const mergedHeaders = { ...baseHeaders };
	for (const key in newHeaders) {
		if (!Object.prototype.hasOwnProperty.call(mergedHeaders, key)) {
			mergedHeaders[key] = newHeaders[key];
		}
	}
	return mergedHeaders;
};

export const Response = (
	statusCode: number,
	body: string,
	headers?: { [header: string]: boolean | number | string } | undefined,
) => {
	const finalHeaders = mergeHeaders(SECURITY_HEADERS, headers);

	return {
		statusCode,
		headers: finalHeaders,
		body,
	};
};
