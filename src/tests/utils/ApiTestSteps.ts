import axios from "axios";
import { constants } from "../utils/ApiConstants";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { createDynamoDbClient } from "../../utils/DynamoDBFactory";
import { sqsClient } from "../../utils/SqsClient";
import { ISessionItem } from "../../models/ISessionItem";
import { ReceiveMessageCommand, DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { jwtUtils } from "../../utils/JwtUtils";
const API_INSTANCE = axios.create({ baseURL:constants.DEV_CRI_F2F_API_URL });
const YOTI_INSTANCE = axios.create({ baseURL:constants.DEV_F2F_YOTI_STUB_URL });


export async function startStubServiceAndReturnSessionId(stubPayload: any): Promise<any> {
	const stubResponse = await stubStartPost(stubPayload);
	const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
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
	const path = "/userInfo";
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

export async function updateYotiSessionId(sessionId: string, yotiSessionId: any, updatedYotiSessionId: string): Promise<void> {
	const dynamoDB = createDynamoDbClient();

	const updateSessionCommand = new UpdateCommand({
		TableName: "session-f2f-cri-ddb",
		Key: { sessionId },
		UpdateExpression: "SET yotiSessionId=:yotiSessionId",
		ExpressionAttributeValues: {
			":yotiSessionId": updatedYotiSessionId,
		},
	});

	// this.logger.info({ message: "updating authorizationCode dynamodb", updateSessionCommand });

	try {
		dynamoDB.send(updateSessionCommand);
		console.info({ message: "updated yotiSessionId in dynamodb" });
	} catch (e: any) {
		console.error({ message: "got error updating yotiSessionId", e });
	}
}

export async function receiveSqsMessage(): Promise<void> {

	const queueURL = "https://sqs.eu-west-2.amazonaws.com/440208678480/f2f-cri-api-IPVCoreSQSQueue-RZMtPmFpB6WO";

	const receiveMessage = (queueURL: any) => sqsClient.send(
		new ReceiveMessageCommand({
			AttributeNames: ["SentTimestamp"],
			MaxNumberOfMessages: 10,
			MessageAttributeNames: ["All"],
			QueueUrl: queueURL,
			VisibilityTimeout: 40,
			WaitTimeSeconds: 20,
		}),
	);

	try {
		const { Messages } = await receiveMessage(queueURL);
		Messages.forEach(async (m: any) => {
			const parsedResponse = JSON.parse(m.Body);
			const array = Object.values(parsedResponse);
			validateJwtToken(array[2]);
			await sqsClient.send(
				new DeleteMessageCommand({
				  QueueUrl: queueURL,
				  ReceiptHandle: m.ReceiptHandle,
				}),
			  );
		});
	} catch (e: any) {
		console.error({ message: "got error receiving messages: ", e });
	}
}

export function validateJwtToken(jwtToken:any):void {
	const [rawHead, rawBody, signature] = jwtToken.split(".");
	console.log(JSON.parse(jwtUtils.base64DecodeToString(rawHead.replace(/\W/g, ""))));
	const decodedBody = JSON.parse(jwtUtils.base64DecodeToString(rawBody.replace(/\W/g, "")));
	console.log("First Name: " + decodedBody.vc.credentialSubject.name[0].nameParts[0].value);
	console.log("Middle Name: " + decodedBody.vc.credentialSubject.name[0].nameParts[1].value);
	console.log("Last Name: " + decodedBody.vc.credentialSubject.name[0].nameParts[2].value);
	console.log("Strength Score: " + decodedBody.vc.evidence[0].strengthScore);
	console.log("Validity Score: " + decodedBody.vc.evidence[0].validityScore);
	console.log("Verification Score: " + decodedBody.vc.evidence[0].verificationScore);
	console.log("Contra Indicator: " + decodedBody.vc.evidence[0].ci);
}
