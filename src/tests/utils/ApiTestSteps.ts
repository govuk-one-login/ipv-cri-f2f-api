import axios from "axios";
import { constants } from "../utils/ApiConstants";
const API_INSTANCE = axios.create({ baseURL:constants.DEV_CRI_F2F_API_URL });
const YOTI_INSTANCE = axios.create({ baseURL:constants.DEV_F2F_YOTI_STUB_URL });

export async function startStubServiceAndReturnSessionId(): Promise<any> {
	const stubResponse = await stubStartPost();
	const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);

	return postRequest;
}

export async function stubStartPost():Promise<any> {
	const path = constants.DEV_IPV_F2F_STUB_URL;
	console.log("session id path: " + path);
	try {
		const postRequest = await axios.post(`${path}`, { target:constants.DEV_CRI_F2F_API_URL });
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
	try {
		const postRequest = await API_INSTANCE.post( "/documentSelection", userData, { headers:{ "x-govuk-signin-session-id": sessionId } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from endpoint: ${error}`);
		return error.response;
	} 
}

export async function postYotiSession(trackingId: any, userData: any): Promise<any> {
	const path = "/sessions";
	try {
		//update the last 4 chars of the user_tracker_id
		const requestTrackingId = userData.user_tracking_id;
		userData.user_tracking_id = requestTrackingId.slice(0, -4) + trackingId;

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
