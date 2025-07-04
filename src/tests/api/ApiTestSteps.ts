/* eslint-disable max-lines */
import { fromNodeProviderChain } from "@aws-sdk/credential-providers";
import axios, { AxiosInstance, AxiosResponse } from "axios";
import { aws4Interceptor } from "aws4-axios";
import { XMLParser } from "fast-xml-parser";
import { ISessionItem } from "../../models/ISessionItem";
import { PersonIdentityItem } from "../../models/PersonIdentityItem";
import * as NodeRSA from "node-rsa";
import { constants } from "./ApiConstants";
import { Constants } from "../../utils/Constants";
import { jwtUtils } from "../../utils/JwtUtils";
import crypto from "node:crypto";
import { sleep } from "../../utils/Sleep";
import {
	StubStartRequest,
	StubStartResponse,
	SessionResponse,
	DocSelectionData,
	AuthorizationResponse,
	TokenResponse,
	UserInfoResponse,
	SessionConfigResponse,
} from "./types";

const GOV_NOTIFY_INSTANCE = axios.create({ baseURL: constants.GOV_NOTIFY_API });
const API_INSTANCE = axios.create({ baseURL: constants.DEV_CRI_F2F_API_URL });
const YOTI_INSTANCE = axios.create({ baseURL: constants.DEV_F2F_YOTI_STUB_URL });
export const HARNESS_API_INSTANCE: AxiosInstance = axios.create({ baseURL: constants.DEV_F2F_TEST_HARNESS_URL });
const PO_INSTANCE = axios.create({ baseURL: constants.DEV_F2F_PO_STUB_URL });

const customCredentialsProvider = {
	getCredentials: fromNodeProviderChain({
		timeout: 1000,
		maxRetries: 0,
	}),
};
const awsSigv4Interceptor = aws4Interceptor({
	options: {
		region: "eu-west-2",
		service: "execute-api",
	},
	credentials: customCredentialsProvider,
});

HARNESS_API_INSTANCE.interceptors.request.use(awsSigv4Interceptor);

const xmlParser = new XMLParser();

export async function startStubServiceAndReturnSessionId(stubPayload: StubStartRequest): Promise<{
	sessionId: string; sub: string;
}> {
	const stubResponse = await stubStartPost(stubPayload);
	const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);

	return {
		sessionId: postRequest.data.session_id,
		sub: stubResponse.data.sub,
	};
}

interface KidOptions {
	journeyType: 'invalidSigningKid' | 'missingSigningKid';
}

export async function stubStartPost(stubPayload: StubStartRequest, options?: KidOptions): Promise<AxiosResponse<StubStartResponse>> {
	const path = constants.DEV_IPV_F2F_STUB_URL! + "start";
  
	if (constants.THIRD_PARTY_CLIENT_ID) {
		stubPayload.clientId = constants.THIRD_PARTY_CLIENT_ID;
	}
  
	if (constants.THIRD_PARTY_CLIENT_ID === "SandboxJourneyFlow") {
	  delete stubPayload.yotiMockID;
	}
  
	if (options) {
	  stubPayload[options.journeyType] = true;
	}
  
	try {
	  const postRequest = await axios.post(path, stubPayload);
	  expect(postRequest.status).toBe(200);
	  return postRequest;
	} catch (error: any) {
	  console.error(`Error response from ${path} endpoint: ${error}`);
	  return error.response;
	}
}

export async function startTokenPost(options?: KidOptions): Promise<AxiosResponse<string>> {
	const path = constants.DEV_IPV_F2F_STUB_URL! + "generate-token-request";
	let postRequest: AxiosResponse<string>;

	if (options) {
		const payload = { [options.journeyType]: true };

		try {
			postRequest = await axios.post(path, payload);
		} catch (error: any) {
			console.error(`Error response from ${path} endpoint: ${error}`);
			return error.response;
		}
	} else {
		try {
			postRequest = await axios.post(path);
		} catch (error: any) {
			console.error(`Error response from ${path} endpoint: ${error}`);
			return error.response;
		}
	}

	expect(postRequest.status).toBe(200);
	return postRequest;
}

export async function sessionPost(clientId: string, request: string): Promise<AxiosResponse<SessionResponse>> {
	const path = "/session";
	try {
		const postRequest = await API_INSTANCE.post(path, { client_id: clientId, request }, { headers: { "x-forwarded-for": "ip-address", "txma-audit-encoded": "encoded-header" } });
		expect(postRequest.status).toBe(200);
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function personInfoGet(sessionId: string): Promise<AxiosResponse<string>> {
	const path = "/person-info";
	try {
		const getRequest = await API_INSTANCE.get(path, { headers: { "x-govuk-signin-session-id": sessionId, "txma-audit-encoded": "encoded-header" } });
		expect(getRequest.status).toBe(200);
		return getRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function personInfoKeyGet(): Promise<AxiosResponse<{ key: string }>> {
	const path = "/person-info-key";
	try {
		const getRequest = await API_INSTANCE.get(path);
		expect(getRequest.status).toBe(200);
		return getRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}.`);
		return error.response;
	}
}
export function validatePersonInfoResponse(personInfoKey: string, personInfoResponse: string, address_line1: string, address_line2: string, town_city: string, postalCode: string): void {
	const privateKey = new NodeRSA.default(personInfoKey);
	const encryptedValue = personInfoResponse;
	const decryptedValue = privateKey.decrypt(encryptedValue, "utf8");
	expect(decryptedValue).toBe("{\"address_line1\":\"" + address_line1 + "\",\"address_line2\":\"" + address_line2 + "\",\"town_city\":\"" + town_city + "\",\"postal_code\":\"" + postalCode + "\"}");

}


export async function postDocumentSelection(userData: DocSelectionData, sessionId: string): Promise<AxiosResponse<string>> {
	const path = "/documentSelection";
	try {
		const postRequest = await API_INSTANCE.post(path, userData, { headers: { "x-govuk-signin-session-id": sessionId, "txma-audit-encoded": "encoded-header" } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}


export async function authorizationGet(sessionId: string): Promise<AxiosResponse<AuthorizationResponse>> {
	const path = "/authorization";
	try {
		const getRequest = await API_INSTANCE.get(path, { headers: { "session-id": sessionId } });
		return getRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function tokenPost(authCode: string, redirectUri: string, clientAssertionJwt: string, clientAssertionType?: string): Promise<AxiosResponse<TokenResponse>> {
	const path = "/token";
	const assertionType = clientAssertionType || Constants.CLIENT_ASSERTION_TYPE_JWT_BEARER;
	try {
		const postRequest = await API_INSTANCE.post(path, `code=${authCode}&grant_type=authorization_code&redirect_uri=${redirectUri}&client_assertion_type=${assertionType}&client_assertion=${clientAssertionJwt}`, { headers: { "Content-Type": "text/plain" } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function userInfoPost(accessToken: string): Promise<AxiosResponse<UserInfoResponse>> {
	const path = "/userinfo";
	try {
		const postRequest = await API_INSTANCE.post(path, null, { headers: { "Authorization": `${accessToken}` } });
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function callbackPost(sessionId?: string, topic = "session_completion"): Promise<void> {
	const path = "/callback";
	if (!sessionId) throw new Error("no yoti session ID provided");
	try {
		await API_INSTANCE.post(path, {
			session_id: sessionId,
			topic,
		});
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function sessionConfigurationGet(sessionId: string): Promise<AxiosResponse<SessionConfigResponse>> {
	const path = "/sessionConfiguration";
	try {
		const getRequest = await API_INSTANCE.get(path, { headers: { "x-govuk-signin-session-id": sessionId } });
		return getRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}
export async function postYotiSession(trackingId: string, userData: any): Promise<AxiosResponse<string>> {
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

export async function getYotiSessionsConfiguration(sessionId: string): Promise<AxiosResponse<string>> {
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

export async function putYotiSessionsInstructions(
	sessionId: string,
	fadcodePayload: { branch: { fad_code: string } },
): Promise<AxiosResponse<string>> {
	const path = constants.DEV_F2F_YOTI_STUB_URL + "/sessions/" + sessionId + "/instructions";
	console.log(path);
	try {
		const postRequest = await YOTI_INSTANCE.put(path, fadcodePayload);
		return postRequest;

	} catch (error: any) {
		console.log(`Error response from endpoint: ${error}`);
		return error.response;
	}
}


export async function getYotiSessionsInstructions(sessionId: string): Promise<AxiosResponse<string>> {
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
		BOOL?: boolean;
	}

	interface OriginalSessionItem {
		[key: string]: OriginalValue;
	}

	let session: ISessionItem | undefined;
	try {
		const response = await HARNESS_API_INSTANCE.get<{ Item: OriginalSessionItem }>(`getRecordBySessionId/${tableName}/${sessionId}`, {});
		const originalSession = response.data.Item;

		session = Object.fromEntries(
			Object.entries(originalSession).map(([key, value]) => {
				if (value.N !== undefined) {
					return [key, Number(value.N)];
				} else if (value.S !== undefined) {
					return [key, value.S];
				} else if (value.BOOL !== undefined) {
					return [key, value.BOOL];
				} else {
					return [key, undefined];
				}
			}),
		) as unknown as ISessionItem;
	} catch (e: any) {
		console.error({ message: "getSessionById - failed getting session from Dynamo", e });
	}

	return session;
}

export async function getPersonIdentityRecordById(
	sessionId: string,
	tableName: string,
): Promise<PersonIdentityItem | undefined> {
	interface OriginalValue {
		N?: number;
		S?: string;
		BOOL?: boolean;
		L?: OriginalValue[];
		M?: { [key: string]: OriginalValue };
	}

	interface OriginalSessionItem {
		[key: string]: OriginalValue;
	}

	let session: PersonIdentityItem | undefined;

	const unwrapValue = (key: string, value: OriginalValue): any => {
		// Check for 'uprn' FIRST
		if (key === "uprn" && value.S !== undefined) {
			const num = Number(value.S); 
			if (Number.isInteger(num)) { 
				return num;
			}
		}

		// Then handle other types
		if (value.N !== undefined) {
			return value.N;
		}
		if (value.S !== undefined) {
			return value.S;
		}
		if (value.BOOL !== undefined) {
			return value.BOOL;
		}
		if (value.L !== undefined) {
			return value.L.map((v) => unwrapValue(key, v));
		}
		if (value.M !== undefined) {
			return Object.fromEntries(
				Object.entries(value.M).map(([k, v]) => [k, unwrapValue(k, v)]),
			);
		}
		return value;
	};

	try {
		const response = await HARNESS_API_INSTANCE.get<{ Item: OriginalSessionItem }>(
			`getRecordBySessionId/${tableName}/${sessionId}`,
			{},
		);
		const originalSession = response.data.Item;
		session = Object.fromEntries(
			Object.entries(originalSession).map(([key, value]) => [key, unwrapValue(key, value)]),
		) as unknown as PersonIdentityItem;
	} catch (e: any) {
		console.error({ message: "getSessionById - failed getting session from Dynamo", e });
	}

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

export async function getMergedYotiPdf(yotiSessionId: string | undefined): Promise<any> {
	let pdfData;
	try {
		// Wait for  pdf to appear tin S3
		await new Promise(f => setTimeout(f, 5000));

		const response = await HARNESS_API_INSTANCE.get(`yotiletterbucket/merged-pdf-${yotiSessionId}`, {
			responseType: "arraybuffer" });
		pdfData = response;
	} catch (e: any) {
		console.error({ message: "getMergedYotiPdf - failed getting pdf from bucket", e });
	}

	return pdfData;
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

export async function updateDynamoDbRecord(sessionId: string, tableName: string, attributeName: string, newValue: any, newValueType: any): Promise<void> {
	try {
		const requestBody = {
			attributeName,
			newValue,
			newValueType,
		};

		const url = `updateRecord/${tableName}`;
		const queryParams = { sessionId };

		await HARNESS_API_INSTANCE.patch(url, requestBody, {
			params: queryParams,
		});

		console.log(`Record updated successfully for table ${tableName}`);

	} catch (e: any) {
		console.error({ message: "updateDynamoDbRecord - failed updating record in DynamoDB", e });
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
	await sleep(1000);

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

export async function validateJwtToken(jwtToken: any, vcData: any, yotiId?: string): Promise<void> {
	const [rawHead, rawBody] = jwtToken.split(".");
	// Validate Header
	const decodedHeader = JSON.parse(jwtUtils.base64DecodeToString(rawHead.replace(/\W/g, "")));
	expect(decodedHeader.typ).toBe("JWT");
	const msgBuffer = new TextEncoder().encode(constants.VC_SIGNING_KEY_ID);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
	expect(decodedHeader.kid).toBe("did:web:" + constants.DNS_SUFFIX + "#" + hashHex);

	// Validate Body 
	const decodedBody = JSON.parse(jwtUtils.base64DecodeToString(rawBody.replace(/\W/g, "")));

	expect(decodedBody.jti).toBeTruthy();
	// Strength Score
	const expecedStrengthScore = eval("vcData.s" + yotiId + ".strengthScore");
	if (expecedStrengthScore) {
		expect(decodedBody.vc.evidence[0].strengthScore).toBe(eval("vcData.s" + yotiId + ".strengthScore"));
	}
	// Validity Score
	const expecedValidityScore = eval("vcData.s" + yotiId + ".validityScore");
	if (expecedValidityScore) {
		expect(decodedBody.vc.evidence[0].validityScore).toBe(eval("vcData.s" + yotiId + ".validityScore"));
	}
	// Verification Score
	const expecedVerificationScore = eval("vcData.s" + yotiId + ".verificationScore");
	if (expecedVerificationScore) {
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
		const actualContraIndicatiors = [];
		for (let i = 0; i < expectedContraIndicatiors.split(",").length; i++) {
			actualContraIndicatiors.push(decodedBody.vc.evidence[0].ci[i]);
		}
		expect(expectedContraIndicatiors.split(",")).toStrictEqual(actualContraIndicatiors);
	}
}

export function validateJwtTokenNamePart(jwtToken: any, givenName1: any, givenName2: any, givenName3: any, familyName: any): void {
	const rawBody = jwtToken.split(".")[1];
	const decodedBody = JSON.parse(jwtUtils.base64DecodeToString(rawBody.replace(/\W/g, "")));
	expect(decodedBody.vc.credentialSubject.name[0].nameParts[0].value).toBe(givenName1);
	expect(decodedBody.vc.credentialSubject.name[0].nameParts[1].value).toBe(givenName2);
	expect(decodedBody.vc.credentialSubject.name[0].nameParts[2].value).toBe(givenName3);
	expect(decodedBody.vc.credentialSubject.name[0].nameParts[3].value).toBe(familyName);

}

export async function postAbortSession(reasonPayload: { reason: string }, sessionId: string): Promise<AxiosResponse<string>> {
	const path = constants.DEV_CRI_F2F_API_URL + "/abort";
	console.log(path);
	try {
		const postRequest = await API_INSTANCE.post(path, reasonPayload, { headers: { "x-govuk-signin-session-id": sessionId, "txma-audit-encoded": "encoded-header" } });
		return postRequest;

	} catch (error: any) {
		console.log(`Error response from endpoint: ${error}`);
		return error.response;
	}
}

export async function postGovNotifyRequestEmail(
	mockDelimitator: number,
	userData: { template_id: string; email_address: string },
): Promise<AxiosResponse<string>> {
	const path = "/v2/notifications/email";
	try {
		// update email to contain mock delimitator before the @ - this determines the behaviour of the GovNotify mock
		userData.email_address = insertBeforeLastOccurrence(userData.email_address, "@", mockDelimitator.toString());
		const postRequest = await GOV_NOTIFY_INSTANCE.post(path, userData);
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}

	function insertBeforeLastOccurrence(strToSearch: string, strToFind: string, strToInsert: string): string {
		const n = strToSearch.lastIndexOf(strToFind);
		if (n < 0) return strToSearch;
		return strToSearch.substring(0, n) + strToInsert + strToSearch.substring(n);
	}
}

export async function postGovNotifyRequestLetter(
	mockDelimitator: number,
	userData: { reference: string; pdfFile: string },
): Promise<AxiosResponse<string>> {
	const path = "/v2/notifications/letter";
	try {
		// update letter reference to include mock delimatator after last char - this determines the behaviour of the GovNotify mock
		userData.reference = insertBeforeLastOccurrence(userData.reference, "x", mockDelimitator.toString());
		const postRequest = await GOV_NOTIFY_INSTANCE.post(path, userData);
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}

	function insertBeforeLastOccurrence(strToSearch: string, strToFind: string, strToInsert: string): string {
		const n = strToSearch.lastIndexOf(strToFind);
		if (n < 0) return strToSearch;
		return strToSearch.substring(0, n) + strToInsert + strToSearch.substring(n);
	}
}

export async function postPOCodeRequest(
	mockDelimitator: string,
	userData: { searchString: string; productFilter: string },
): Promise<AxiosResponse<string>> {
	const path = "/v1/locations/search";
	try {
		const searchUserData = structuredClone(userData);
		searchUserData.searchString = userData.searchString + " " + mockDelimitator;
		console.log("userData in try statement: ", userData);
		const postRequest = await PO_INSTANCE.post(path, searchUserData);
		return postRequest;
	} catch (error: any) {
		console.log(`Error response from ${path} endpoint: ${error}`);
		return error.response;
	}
}

export async function initiateUserInfo(docSelectionData: DocSelectionData, sessionId: string): Promise<void> {
	const documentSelectionResponse = await postDocumentSelection(docSelectionData, sessionId);
	expect(documentSelectionResponse.status).toBe(200);
	expect(documentSelectionResponse.data).toBe("Instructions PDF Generated");

	const authResponse = await authorizationGet(sessionId);
	expect(authResponse.status).toBe(200);

	const startTokenResponse = await startTokenPost();
	const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri, startTokenResponse.data);
	expect(tokenResponse.status).toBe(200);

	const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
	expect(userInfoResponse.status).toBe(202);

}

export async function getSessionAndVerifyKey(sessionId: string, tableName: string, key: string, expectedValue: string | boolean | number): Promise<void> {
	const sessionInfo = await getSessionById(sessionId, tableName);
	try {
		expect(sessionInfo![key as keyof ISessionItem]).toBe(expectedValue);
	} catch (error: any) {
		throw new Error("getSessionAndVerifyKey - Failed to verify " + key + " value: " + error);
	}
}

export function getEpochTimestampXDaysAgo(days: number): string {
	const now = new Date();
	const pastDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
	const epochTimestampInSeconds = Math.floor(pastDate.getTime() / 1000);
	return epochTimestampInSeconds.toString();
}
