import axios from "axios";
import { constants } from "../utils/ApiConstants";
const API_INSTANCE = axios.create({ baseURL:constants.DEV_CRI_F2F_API_URL });

export async function stubStartPost():Promise<any> {
	const path = constants.DEV_IPV_F2F_STUB_URL;
	console.log(path);
	try {
		const postRequest = await axios.post(`${path}`, { target:constants.DEV_CRI_F2F_API_URL });
		expect(postRequest.status).toBe(201);
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	} 
}

export async function stubStartPostNoSharedClaims(requestBody:any):Promise<any> {
	const path = constants.DEV_IPV_F2F_STUB_URL;
	console.log(path);
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
	try {
		const postRequest = await API_INSTANCE.post( "/documentSelection", userData, { headers:{ "x-govuk-signin-session-id": sessionId } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from endpoint: ${error}`);
		return error.response;
	} 
}
