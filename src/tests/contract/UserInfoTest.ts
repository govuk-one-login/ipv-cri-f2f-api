import axios from "axios";

export const VALID_USERINFO = {
	body:"",
	httpMethod: "POST",
	headers: { Authorization: "Bearer eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtpZCJ9.eyJzdWIiOiI3NDY1NWNlMy1hNjc5LTRjMDktYTNiMC0xZDBkYzJlZmYzNzMiLCJhdWQiOiJpc3N1ZXIiLCJpc3MiOiJpc3N1ZXIiLCJleHAiOjE3MDY1NDk0Njh9.KClzxkHU35ck5Wck7jECzt0_TAkiy4iXRrUg_aftDg2uUpLOC0Bnb-77lyTlhSTuotEQbqB1YZqV3X_SotEQbg" },
	isBase64Encoded: false,
	multiValueHeaders: {},
	multiValueQueryStringParameters: {},
	pathParameters: {},
	queryStringParameters: {},
	path: "/userinfo",
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
		path: "/userinfo",
		protocol: "HTTP/1.1",
		requestId: "ba9b369a-ab98-11ed-afa1-0242ac120002",
		requestTimeEpoch: 1428582896000,
		resourceId: "123456",
		resourcePath: "/userinfo",
		stage: "dev",
	},
	resource: "/userinfo",
	stageVariables: {},
};

// Note this will be replaced with pact syntax
// new Verifier({
// 	providerBaseUrl: 'http://localhost:8081', // <- location of your running provider
// 	pactUrls: [ path.resolve(process.cwd(), "./pacts/SomeConsumer-SomeProvider.json") ],
// })

const runTest = async () => {
	try {
		const userInfoResponse = await axios.post("http://localhost:3000/userinfo", VALID_USERINFO);
		console.log("================================");
		console.log("status", userInfoResponse.status);
		console.log("data", userInfoResponse.data);
	} catch (e) {
		console.log("error", e);
	}
};

void runTest();
