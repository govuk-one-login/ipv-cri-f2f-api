import axios from "axios";

const AUTHORIZATION_CODE = "0328ba66-a1b5-4314-acf8-f4673f1f05a2";
const ENCODED_REDIRECT_URI = encodeURIComponent("https://f2f-ipv-stub-ipvstub.review-o.dev.account.gov.uk/redirect");
export const VALID_ACCESSTOKEN = {
	body:`code=${AUTHORIZATION_CODE}&grant_type=authorization_code&redirect_uri=${ENCODED_REDIRECT_URI}`,
	httpMethod: "POST",
	headers: {},
	isBase64Encoded: false,
	multiValueHeaders: {},
	multiValueQueryStringParameters: {},
	pathParameters: {},
	queryStringParameters: {},
	path: "/token",
	requestContext:{
		accountId: "",
		apiId: "",
		authorizer: {},
		httpMethod: "post",
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
		path: "/token",
		protocol: "HTTP/1.1",
		requestId: "ba9b369a-ab98-11ed-afa1-0242ac120002",
		requestTimeEpoch: 1428582896000,
		resourceId: "123456",
		resourcePath: "/token",
		stage: "dev",
	},
	resource: "/token",
	stageVariables: {},
};

// Note this will be replaced with pact syntax
// new Verifier({
// 	providerBaseUrl: 'http://localhost:8081', // <- location of your running provider
// 	pactUrls: [ path.resolve(process.cwd(), "./pacts/SomeConsumer-SomeProvider.json") ],
// })

const runTest = async () => {
	try {
		const accessTokenResponse = await axios.post("http://localhost:3000/token", VALID_ACCESSTOKEN);
		console.log("================================");
		console.log("status", accessTokenResponse.status);
		console.log("data", accessTokenResponse.data);
	} catch (e) {
		console.log("error", e);
	}
};

void runTest();
