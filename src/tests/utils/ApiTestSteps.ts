import axios, { AxiosInstance } from "axios";
import { aws4Interceptor } from "aws4-axios";
import { constants } from "../utils/ApiConstants";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { createDynamoDbClient } from "../../utils/DynamoDBFactory";
import { sqsClient } from "../../utils/SqsClient";
import { ISessionItem } from "../../models/ISessionItem";
import { ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { jwtUtils } from "../../utils/JwtUtils";
import { XMLParser } from "fast-xml-parser";

const API_INSTANCE = axios.create({ baseURL:constants.DEV_CRI_F2F_API_URL });
const YOTI_INSTANCE = axios.create({ baseURL:constants.DEV_F2F_YOTI_STUB_URL });
const HARNESS_API_INSTANCE : AxiosInstance = axios.create({baseURL: "https://uboz0e1cvi.execute-api.eu-west-2.amazonaws.com/dev/"});
const awsSigv4Interceptor = aws4Interceptor({
	options: {
		region: "eu-west-2",
		service: "execute-api",
	},
});
HARNESS_API_INSTANCE.interceptors.request.use(awsSigv4Interceptor);

const xmlParser = new XMLParser();

export async function startStubServiceAndReturnSessionId(stubPayload: any): Promise<any> {
	const stubResponse = await stubStartPost(stubPayload);
	const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
	postRequest.data.sub = stubResponse.data.sub
	return postRequest;
}

export async function stubStartPost(stubPayload: any):Promise<any> {
	const path = constants.DEV_IPV_F2F_STUB_URL;
	try {
		const postRequest = await axios.post(`${path}`, stubPayload);
		expect(postRequest.status).toBe(201);
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function stubStartPostNoSharedClaims(requestBody:any):Promise<any> {
	const path = constants.DEV_IPV_F2F_STUB_URL;
	try {
		const postRequest = await axios.post(`${path}`, requestBody);
		expect(postRequest.status).toBe(201);
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function sessionPost(clientId?: string, request?: string):Promise<any> {
	const path = "/session";
	try {
		const postRequest = await API_INSTANCE.post(path, { client_id: clientId, request });
		expect(postRequest.status).toBe(200);
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function postDocumentSelection(userData:any, sessionId:any): Promise<any> {
	const path = "/documentSelection";
	try {
		const postRequest = await API_INSTANCE.post(path, userData, { headers:{ "x-govuk-signin-session-id": sessionId } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}


export async function authorizationGet(sessionId: any):Promise<any> {
	const path = "/authorization";
	try {
		const getRequest = await API_INSTANCE.get(path, { headers:{ "session-id": sessionId } });
		return getRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function tokenPost(authCode?: any, redirectUri?: any ):Promise<any> {
	const path = "/token";
	try {
		const postRequest = await API_INSTANCE.post( path, `code=${authCode}&grant_type=authorization_code&redirect_uri=${redirectUri}`, { headers:{ "Content-Type" : "text/plain" } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function userInfoPost(accessToken?: any):Promise<any> {
	const path = "/userinfo";
	try {
		const postRequest = await API_INSTANCE.post( path, null, { headers: { "Authorization": `${accessToken}` } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function callbackPost(sessionId: any):Promise<any> {
	const path = "/callback";
	try {
		const postRequest = await API_INSTANCE.post(path, {
			"session_id": sessionId,
			"topic": "session_completion",
		});
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function postYotiSession(trackingId: any, userData: any): Promise<any> {
	const path = "/sessions";
	try {
		// update fullName to contain trackingId - this determines the behaviour of the Yoti mock
		userData.resources.applicant_profile.full_name = "Fred" + trackingId;

		const postRequest = await YOTI_INSTANCE.post(path, userData);
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function getYotiSessionsConfiguration(sessionId:any): Promise<any> {
	const path = constants.DEV_F2F_YOTI_STUB_URL + "/sessions/" + sessionId + "/configuration";
	console.log(path);
	try {
		const postRequest = await YOTI_INSTANCE.get(path);
		return postRequest;

	} catch (error: any) {
		console.log(`Error response from endpoint: ${error}`);
		return error.response;
	}
}

export async function putYotiSessionsInstructions(sessionId:any): Promise<any> {
	const path = constants.DEV_F2F_YOTI_STUB_URL + "/sessions/" + sessionId + "/instructions";
	console.log(path);
	try {
		const postRequest = await YOTI_INSTANCE.put(path);
		return postRequest;

	} catch (error: any) {
		console.log(`Error response from endpoint: ${error}`);
		return error.response;
	}
}


export async function getYotiSessionsInstructions(sessionId:any): Promise<any> {
	const path = constants.DEV_F2F_YOTI_STUB_URL + "/sessions/" + sessionId + "/instructions/pdf";
	console.log(path);
	try {
		const postRequest = await YOTI_INSTANCE.get(path);
		return postRequest;

	} catch (error: any) {
		console.log(`Error response from endpoint: ${error}`);
		return error.response;
	}
}

export function generateRandomAlphanumeric(substringStart: number, substringEnd: number): string {
	const result = Math.random().toString(36).substring(substringStart, substringEnd);
	return result;
}

export async function getSessionById(sessionId: string, tableName: string): Promise<ISessionItem | undefined> {
	const dynamoDB = createDynamoDbClient();

	const getSessionCommand = new GetCommand({
		TableName: tableName,
		Key: {
			sessionId,
		},
	});

	let session;
	try {
		session = await dynamoDB.send(getSessionCommand);
	} catch (e: any) {
		console.error({ message: "getSessionById - failed executing get from dynamodb:", e });
	}

	return session.Item as ISessionItem;
}

// export async function updateYotiSessionId(sessionId: string, yotiSessionId: any, updatedYotiSessionId: string): Promise<void> {
// 	const dynamoDB = createDynamoDbClient();
//
// 	const updateSessionCommand = new UpdateCommand({
// 		TableName: "session-f2f-cri-ddb",
// 		Key: { sessionId },
// 		UpdateExpression: "SET yotiSessionId=:yotiSessionId",
// 		ExpressionAttributeValues: {
// 			":yotiSessionId": updatedYotiSessionId,
// 		},
// 	});
// 	try {
// 		dynamoDB.send(updateSessionCommand);
// 		console.info({ message: "updated yotiSessionId in dynamodb" });
// 	} catch (e: any) {
// 		console.error({ message: "got error updating yotiSessionId", e });
// 	}
// }

/**
 * Retrieves an object from the bucket with the specified prefix, which is the latest message dequeued from the SQS
 * queue under test
 * @param prefix
 * @returns {any} - returns either the body of the SQS message or undefined if no such message found
 */
export async function getDequeuedSqsMessage(prefix: string): Promise<any>{
	const listObjectsResponse = await HARNESS_API_INSTANCE.get("bucket/", {
		params: {
			prefix: "ipv-core/" + prefix,
		}
	});
	const listObjectsParsedResponse = xmlParser.parse(listObjectsResponse.data);
	if(!listObjectsParsedResponse?.ListBucketResult?.Contents) {
		return undefined;
	}
	let key: string;
	if(Array.isArray(listObjectsParsedResponse?.ListBucketResult?.Contents)) {
		key = listObjectsParsedResponse.ListBucketResult.Contents.at(-1).Key;
	} else {
		key = listObjectsParsedResponse.ListBucketResult.Contents.Key;
	}

	const getObjectResponse = await HARNESS_API_INSTANCE.get("object/"+key, {});
	return getObjectResponse.data
}

export async function receiveJwtTokenFromSqsMessage(): Promise<any> {
	const queueURL = constants.DEV_F2F_IPV_CORE_QUEUE_URL;

	const receiveMessage = () => sqsClient.send(
		new ReceiveMessageCommand({
			AttributeNames: ["SentTimestamp"],
			MaxNumberOfMessages: 10,
			MessageAttributeNames: ["All"],
			QueueUrl: queueURL,
			VisibilityTimeout: 40,
			WaitTimeSeconds: 20,
		}),
	);

	let jwtToken;

	try {
		const { Messages } = await receiveMessage();
		for (const m of Messages) {
			const parsedResponse = JSON.parse(m.Body);
			const array = Object.values(parsedResponse);
			jwtToken = array[2];
			await sqsClient.send(
				new DeleteMessageCommand({
				  QueueUrl: queueURL,
				  ReceiptHandle: m.ReceiptHandle,
				}),
			  );
		}
	} catch (e: any) {
		console.error({ message: "got error receiving messages: ", e });
	}

	return jwtToken;
}

export function validateJwtToken(jwtToken:any, vcData: any, yotiId?: string):void {
	const [rawHead, rawBody, signature] = jwtToken.split(".");
	const decodedBody = JSON.parse(jwtUtils.base64DecodeToString(rawBody.replace(/\W/g, "")));
	// Strength Score
	const expecedStrengthScore = eval("vcData.s" + yotiId + ".strengthScore");
	if (expecedStrengthScore) {
		expect(decodedBody.vc.evidence[0].strengthScore).toBe(eval("vcData.s" + yotiId + ".strengthScore"));
	}
	// Validity Score
	const expecedValidityScore = eval("vcData.s" + yotiId + ".validityScore");
	if (expecedStrengthScore) {
		expect(decodedBody.vc.evidence[0].validityScore).toBe(eval("vcData.s" + yotiId + ".validityScore"));
	}
	// Verification Score
	const expecedVerificationScore = eval("vcData.s" + yotiId + ".verificationScore");
	if (expecedStrengthScore) {
		expect(decodedBody.vc.evidence[0].verificationScore).toBe(eval("vcData.s" + yotiId + ".verificationScore"));
	}
	// Check Methods
	const expecedCheckMethod = eval("vcData.s" + yotiId + ".checkMethod");
	if (expecedCheckMethod) {

		const actualCheckMethods = [];
		for (let i = 0; i < expecedCheckMethod.split(",").length; i++) {
			actualCheckMethods.push(decodedBody.vc.evidence[0].checkDetails[i].checkMethod);
		}
		expect(expecedCheckMethod.split(",")).toStrictEqual(actualCheckMethods);
	}
	// FailedChecks
	const failedCheckPresent = eval("vcData.s" + yotiId + ".failedCheck");
	if (failedCheckPresent) {
		expect(decodedBody.vc.evidence[0].failedCheckDetails).toBeTruthy();
	}
	// Contra Indicators
	const expectedContraIndicatiors = eval("vcData.s" + yotiId + ".ci");
	if (expectedContraIndicatiors) {
		expectedContraIndicatiors.split(",").length;
		const actualContraIndicatiors = [];
		for (let i = 0; i < expectedContraIndicatiors.split(",").length; i++) {
			actualContraIndicatiors.push(decodedBody.vc.evidence[0].ci[i]);
		}
		console.log(actualContraIndicatiors);
		expect(expectedContraIndicatiors.split(",")).toStrictEqual(actualContraIndicatiors);
	}
}

	export async function postAbortSession(reasion:any, sessionId:any): Promise<any> {
		const path = constants.DEV_CRI_F2F_API_URL + "/abort";
		console.log(path);
		try {
			const postRequest = await API_INSTANCE.post(path, reasion, { headers:{ "x-govuk-signin-session-id": sessionId } });
			return postRequest;
	
		} catch (error: any) {
			console.log(`Error response from endpoint: ${error}`);
			return error.response;
		}
	}
