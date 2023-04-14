import axios from "axios";
import { constants } from "../utils/ApiConstants";
const API_INSTANCE = axios.create({ baseURL:constants.DEV_CRI_F2F_API_URL });

export async function startStubServiceAndReturnSessionId(): Promise<any> {
	const stubResponse = await stubStartPost();
	const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);

	return postRequest;
}

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
		const postRequest = await API_INSTANCE.post( "/documentSelection", {
			"document_selection":{
		   "document_selected":userData.document_selected,
		   "date_of_expiry":userData.date_of_expiry,
			},
			"post_office_selection":{
		   "address":userData.address,
		   "location":{
			  "latitude":userData.latitude,
			  "longitude":userData.longitude,
		   },
		   "post_code":userData.post_code,
			},
	 }, { headers:{ "x-govuk-signin-session-id": sessionId } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from endpoint: ${error}`);
		return error.response;
	} 
}
