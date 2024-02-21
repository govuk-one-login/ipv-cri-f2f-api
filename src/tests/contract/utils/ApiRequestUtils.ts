import { APIGatewayProxyEventHeaders } from "aws-lambda";
import { randomUUID } from "crypto";
import { IncomingHttpHeaders } from "http";

export const eventRequest = {
	body: "",
	requestContext: {
		requestId: randomUUID(),
		accountId: "",
		apiId: "",
		authorizer: undefined,
		protocol: "",
		httpMethod: "",
		identity: {
			accessKey: "",
			accountId: "",
			apiKey: "",
			apiKeyId: "",
			caller: "",
			clientCert: {
				clientCertPem: "",
				issuerDN: "",
				serialNumber: "",
				subjectDN: "",
				validity: { notAfter: "", notBefore: "" },
			},
			cognitoAuthenticationProvider: "",
			cognitoAuthenticationType: "",
			cognitoIdentityId: "",
			cognitoIdentityPoolId: "",
			principalOrgId: "",
			sourceIp: "",
			user: "",
			userAgent: "",
			userArn: "",
		},
		path: "",
		stage: "",
		requestTimeEpoch: 0,
		resourceId: "",
		resourcePath: "",
	},
	headers: {},
	multiValueHeaders: {},
	httpMethod: "",
	isBase64Encoded: false,
	path: "",
	pathParameters: null,
	queryStringParameters: null,
	multiValueQueryStringParameters: null,
	stageVariables: null,
	resource: "",
};

export function convertUrlEncodedRequestBodyToString(body: { [key: string]: string }): string {
	const params = new URLSearchParams(body);
	const formDataString = params.toString();
	const jsonString = decodeURIComponent(formDataString);
	const jsonObject = JSON.parse(jsonString);
	const urlEncodedString = Object.keys(jsonObject).map(key => `${encodeURIComponent(key)}=${encodeURIComponent(jsonObject[key])}`).join("&");
	return urlEncodedString;
}

export function convertIncomingHeadersToAPIGatewayHeaders(incomingHeaders: IncomingHttpHeaders): APIGatewayProxyEventHeaders {
	const apiGatewayHeaders: APIGatewayProxyEventHeaders = {};

	for (const [key, value] of Object.entries(incomingHeaders)) {
		apiGatewayHeaders[key] = value!.toString();
	}
	return apiGatewayHeaders;
}

