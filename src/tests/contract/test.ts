import axios from "axios";

export const VALID_AUTH = {
	httpMethod: "GET",
	body: "",
	headers: { "session-id": "732075c8-08e6-4b25-ad5b-d6cb865a18e5" },
	// headers: { "session-id": "" },
	isBase64Encoded: false,
	multiValueHeaders: {},
	multiValueQueryStringParameters: {},
	path: "/authorization",
	pathParameters: {},
	queryStringParameters: {},
	requestContext: {
		accountId: "",
		apiId: "",
		authorizer: {},
		httpMethod: "get",
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
		path: "/authorization",
		protocol: "HTTP/1.1",
		requestId: "c6af9ac6-7b61-11e6-9a41-93e8deadbeef",
		requestTimeEpoch: 1428582896000,
		resourceId: "123456",
		resourcePath: "/authorization",
		stage: "dev",
	},
	resource: "/authorization",
	stageVariables: {},
};

// Note this will be replaced with pact syntax
// new Verifier({
// 	providerBaseUrl: 'http://localhost:8081', // <- location of your running provider
// 	pactUrls: [ path.resolve(process.cwd(), "./pacts/SomeConsumer-SomeProvider.json") ],
// })

const runTest = async () => {
	try {
		const authResponse = await axios.post("http://localhost:3000/authorize", VALID_AUTH);
		console.log("================================");
		console.log("status", authResponse.status);
		console.log("data", authResponse.data);
	} catch (e) {
		console.log("error", e);
	}
};

void runTest();
