import axios from "axios";
import { constants } from "../utils/ApiConstants";
import { DynamoDBDocument, GetCommand, QueryCommandInput, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createDynamoDbClient } from "../../utils/DynamoDBFactory";
import { ISessionItem } from "../../models/ISessionItem";
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
			"topic": "session_completion"
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
	const result = Math.random().toString(36).substring(substringStart,substringEnd);
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
