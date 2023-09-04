import axios, { AxiosInstance } from "axios";
import Ajv from "ajv";
import { aws4Interceptor } from "aws4-axios";
import { constants } from "../utils/ApiConstants";
import { sqsClient } from "../../utils/SqsClient";
import { ISessionItem } from "../../models/ISessionItem";
import { ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { jwtUtils } from "../../utils/JwtUtils";
const GOV_NOTIFY_INSTANCE = axios.create({ baseURL: constants.GOVUKNOTIFYAPI });
import { XMLParser } from "fast-xml-parser";

const API_INSTANCE = axios.create({ baseURL:constants.DEV_CRI_F2F_API_URL });
const YOTI_INSTANCE = axios.create({ baseURL:constants.DEV_F2F_YOTI_STUB_URL });
const HARNESS_API_INSTANCE : AxiosInstance = axios.create({ baseURL: constants.DEV_F2F_TEST_HARNESS_URL });
const awsSigv4Interceptor = aws4Interceptor({
	options: {
		region: "eu-west-2",
		service: "execute-api",
	},
});
HARNESS_API_INSTANCE.interceptors.request.use(awsSigv4Interceptor);

const xmlParser = new XMLParser();
const ajv = new Ajv({ strictTuples: false });


export async function startStubServiceAndReturnSessionId(stubPayload: any): Promise<any> {
	const stubResponse = await stubStartPost(stubPayload);
	const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
	postRequest.data.sub = stubResponse.data.sub;
	return postRequest;
}

export async function stubStartPost(stubPayload: any): Promise<any> {
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

export async function stubStartPostNoSharedClaims(requestBody: any): Promise<any> {
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

export async function sessionPost(clientId?: string, request?: string): Promise<any> {
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

export async function postDocumentSelection(userData: any, sessionId: any): Promise<any> {
	const path = "/documentSelection";
	try {
		const postRequest = await API_INSTANCE.post(path, userData, { headers: { "x-govuk-signin-session-id": sessionId } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}


export async function authorizationGet(sessionId: any): Promise<any> {
	const path = "/authorization";
	try {
		const getRequest = await API_INSTANCE.get(path, { headers: { "session-id": sessionId } });
		return getRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function tokenPost(authCode?: any, redirectUri?: any): Promise<any> {
	const path = "/token";
	try {
		const postRequest = await API_INSTANCE.post(path, `code=${authCode}&grant_type=authorization_code&redirect_uri=${redirectUri}`, { headers: { "Content-Type": "text/plain" } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function userInfoPost(accessToken?: any): Promise<any> {
	const path = "/userinfo";
	try {
		const postRequest = await API_INSTANCE.post(path, null, { headers: { "Authorization": `${accessToken}` } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function callbackPost(sessionId: any): Promise<any> {
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

export async function sessionConfigurationGet(sessionId: any):Promise<any> {
	const path = "/sessionConfiguration";
	try {
		const getRequest = await API_INSTANCE.get(path, { headers:{ "x-govuk-signin-session-id": sessionId } });
		return getRequest;
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

export async function getYotiSessionsConfiguration(sessionId: any): Promise<any> {
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

export async function putYotiSessionsInstructions(sessionId: any): Promise<any> {
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


export async function getYotiSessionsInstructions(sessionId: any): Promise<any> {
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
	interface OriginalValue {
		N?: string;
		S?: string;
	}

	interface OriginalSessionItem {
		[key: string]: OriginalValue;
	}

	let session: ISessionItem | undefined;
	try {
		const response = await HARNESS_API_INSTANCE.get<{ Item: OriginalSessionItem }>(`getRecordBySessionId/${tableName}/${sessionId}`, {});
		const originalSession = response.data.Item;
		session = Object.fromEntries(
			Object.entries(originalSession).map(([key, value]) => [key, value.N ?? value.S]),
		) as unknown as ISessionItem;
		console.log("transformedData", session);
	} catch (e: any) {
		console.error({ message: "getSessionById - failed getting session from Dynamo", e });
	}

	console.log("getSessionById Response", session);
	return session;
}

export async function getSessionByYotiId(sessionId: string, tableName: string): Promise<ISessionItem | undefined> {
	let session;
	try {
		const response = await HARNESS_API_INSTANCE.get(`getSessionByYotiId/${tableName}/${sessionId}`, {});
		session = response.data;
	} catch (e: any) {
		console.error({ message: "getSessionByYotiId - failed getting session from Dynamo", e });
	}

	console.log("getSessionByYotiId Response", session.Items[0]);
	return session.Items[0] as ISessionItem;
}

export async function getSessionByAuthCode(sessionId: string, tableName: string): Promise<ISessionItem | undefined> {
	let session;
	try {
		const response = await HARNESS_API_INSTANCE.get(`getSessionByAuthCode/${tableName}/${sessionId}`, {});
		session = response.data;
	} catch (e: any) {
		console.error({ message: "getSessionByAuthCode - failed getting session from Dynamo", e });
	}

	console.log("getSessionByAuthCode Response", session.Items[0]);
	return session.Items[0] as ISessionItem;
}


/**
 * Retrieves an object from the bucket with the specified prefix, which is the latest message dequeued from the SQS
 * queue under test
 *
 * @param prefix
 * @returns {any} - returns either the body of the SQS message or undefined if no such message found
 */
export async function getSqsEventList(folder: string, prefix: string, txmaEventSize:number): Promise<any> {
	let keys: any[];
	let keyList: any[];
	let i:any;
	do {
		const listObjectsResponse = await HARNESS_API_INSTANCE.get("/bucket/", {
			params: {
				prefix: folder + prefix,
			},
		});
		const listObjectsParsedResponse = xmlParser.parse(listObjectsResponse.data);
		if (!listObjectsParsedResponse?.ListBucketResult?.Contents) {
			return undefined;
		}
		keys = listObjectsParsedResponse?.ListBucketResult?.Contents;
		console.log(listObjectsParsedResponse?.ListBucketResult?.Contents);
		keyList = [];
		for (i = 0; i < keys.length; i++) {
			keyList.push(listObjectsParsedResponse?.ListBucketResult?.Contents.at(i).Key);
		}
	} while (keys.length < txmaEventSize );
	return keyList;
}


export async function validateTxMAEventData(keyList: any): Promise<any> {
	let i:any;
	for (i = 0; i < keyList.length; i++) {
		const getObjectResponse = await HARNESS_API_INSTANCE.get("/object/" + keyList[i], {});
		console.log(JSON.stringify(getObjectResponse.data, null, 2));
		let valid = true;
		import("../data/" + getObjectResponse.data.event_name + "_SCHEMA.json" )
			.then((jsonSchema) => {
				const validate = ajv.compile(jsonSchema);
				valid = validate(getObjectResponse.data);
				if (!valid) {
					console.error(getObjectResponse.data.event_name + " Event Errors: " + JSON.stringify(validate.errors));
				}
			})
			.catch((err) => {
				console.log(err.message);
			})
			.finally(() => {
				expect(valid).toBe(true);
			});
	}
}

export async function validateTxMAEvent(txmaEvent: any, keyList: any, yotiMockId: any): Promise<any> {
	let i:any;
	for (i = 0; i < keyList.length; i++) {
		const getObjectResponse = await HARNESS_API_INSTANCE.get("/object/" + keyList[i], {});
	
		if (getObjectResponse.data.event_name === txmaEvent) {
			console.log(JSON.stringify(getObjectResponse.data, null, 2));
			validateCriVcIssuedTxMAEvent(getObjectResponse.data, yotiMockId);
		}
	}
}


/**
 * Retrieves an object from the bucket with the specified prefix, which is the latest message dequeued from the SQS
 * queue under test
 *
 * @param prefix
 * @returns {any} - returns either the body of the SQS message or undefined if no such message found
 */
export async function getDequeuedSqsMessage(prefix: string): Promise<any> {
	const listObjectsResponse = await HARNESS_API_INSTANCE.get("/bucket/", {
		params: {
			prefix: "ipv-core/" + prefix,
		},
	});
	const listObjectsParsedResponse = xmlParser.parse(listObjectsResponse.data);
	if (!listObjectsParsedResponse?.ListBucketResult?.Contents) {
		return undefined;
	}
	let key: string;
	if (Array.isArray(listObjectsParsedResponse?.ListBucketResult?.Contents)) {
		key = listObjectsParsedResponse.ListBucketResult.Contents.at(-1).Key;
	} else {
		key = listObjectsParsedResponse.ListBucketResult.Contents.Key;
	}

	const getObjectResponse = await HARNESS_API_INSTANCE.get("/object/" + key, {});
	return getObjectResponse.data;
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

export function validateJwtToken(jwtToken: any, vcData: any, yotiId?: string): void {
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

export function validateJwtTokenNamePart(jwtToken:any, givenName1:any, givenName2:any, givenName3:any, familyName:any):void {
	const [rawHead, rawBody, signature] = jwtToken.split(".");
	const decodedBody = JSON.parse(jwtUtils.base64DecodeToString(rawBody.replace(/\W/g, "")));
	expect(decodedBody.vc.credentialSubject.name[0].nameParts[0].value).toBe(givenName1);
	expect(decodedBody.vc.credentialSubject.name[0].nameParts[1].value).toBe(givenName2);
	expect(decodedBody.vc.credentialSubject.name[0].nameParts[2].value).toBe(givenName3);
	expect(decodedBody.vc.credentialSubject.name[0].nameParts[3].value).toBe(familyName);

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

export async function postGovNotifyRequest(mockDelimitator: any, userData: any): Promise<any> {
	const path = "/v2/notifications/email";
	try {
		// update email to contain mock delimitator before the @ - this determines the behaviour of the GovNotify mock
		userData.email_address = insertBeforeLastOccurrence(userData.email_address, "@", mockDelimitator);
		const postRequest = await GOV_NOTIFY_INSTANCE.post(path, userData);
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}

	function insertBeforeLastOccurrence(strToSearch: string, strToFind: string, strToInsert: string) {
		var n = strToSearch.lastIndexOf(strToFind);
		if (n < 0) return strToSearch;
		return strToSearch.substring(0, n) + strToInsert + strToSearch.substring(n);
	}
}

export function validateCriVcIssuedTxMAEvent(txmaEvent: any, yotiMockId: any): any {
	const yotiMockIdPrefix = yotiMockId.slice(0, 2);
	switch (yotiMockIdPrefix) {
		case "00":
			expect(txmaEvent.restricted.drivingPermit[0].documentType).toBe("DRIVING_LICENCE");
			break;
		case "01":
			expect(txmaEvent.restricted.passport[0].documentType).toBe("PASSPORT");
			break;
		case "02":
			expect(txmaEvent.restricted.passport[0].documentType).toBe("PASSPORT");
			break;
		case "03":
			expect(txmaEvent.restricted.residencePermit[0].documentType).toBe("RESIDENCE_PERMIT");
			break;
		case "04":
			expect(txmaEvent.restricted.drivingPermit[0].documentType).toBe("DRIVING_LICENCE");
			break;
		case "05":
			expect(txmaEvent.restricted.idCard[0].documentType).toBe("NATIONAL_ID");
			break;
		default:
			console.warn("Yoti Mock Id provided does not match expected list");
	}
} 
