import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataUkDrivingLicence from "../data/docSelectionPayloadDriversLicenceValid.json";
import dataEuDrivingLicence from "../data/docSelectionPayloadEuDriversLicenceValid.json";
import dataNonUkPassport from "../data/docSelectionPayloadNonUkPassportValid.json";
import dataBrp from "../data/docSelectionPayloadBrpValid.json";
import dataEeaIdCard from "../data/docSelectionPayloadEeaIdCardValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import vcResponseData from "../data/vcValidationData.json";
import integrationHappyPayload from "../data/integrationHappyPathPayload.json";
import {
	postDocumentSelection,
	startStubServiceAndReturnSessionId,
	getSessionById,
	callbackPost,
	authorizationGet,
	tokenPost,
	userInfoPost,
	validateJwtToken,
	getDequeuedSqsMessage,
	validateTxMAEventData,
	validateJwtTokenNamePart,
} from "../utils/ApiTestSteps";
import "dotenv/config";
import { constants } from "../utils/ApiConstants";

describe("Callback API", () => {
	jest.setTimeout(60000);

	it.each([
		["0000", dataUkDrivingLicence],
	])("F2F CRI Callback Endpoint - yotiMockId: '%s'", async (yotiMockId: string, docSelectionData:any) => {
		f2fStubPayload.yotiMockID = yotiMockId;
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		const sessionId = sessionResponse.data.session_id;
		const sub = sessionResponse.data.sub;

		// Document Selection
		const response = await postDocumentSelection(docSelectionData, sessionId);
		expect(response.status).toBe(200);

		// Authorization
		const authResponse = await authorizationGet(sessionId);
		expect(authResponse.status).toBe(200);

		// // Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		expect(tokenResponse.status).toBe(200);

		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(202);

		// Get Yoti Session Id
		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);

		// Yoti Callback
		const callbackResponse = await callbackPost(yotiSessionId);
		expect(callbackResponse.status).toBe(202);

		// Retrieve Verifiable Credential from dequeued SQS queue
		let sqsMessage;
		do {
			sqsMessage = await getDequeuedSqsMessage(sub);
		} while (!sqsMessage);
		const jwtToken = sqsMessage["https://vocab.account.gov.uk/v1/credentialJWT"][0];
		validateJwtToken(jwtToken, vcResponseData, yotiMockId);

	}, 20000);

	it("F2F CRI Callback Endpoint Integration HappyPath - yotiMockId: '%s'", async () => {
		f2fStubPayload.yotiMockID = "0000";
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		const sessionId = sessionResponse.data.session_id;
		const sub = sessionResponse.data.sub;

		// Document Selection
		const response = await postDocumentSelection(docSelectionData, sessionId);
		expect(response.status).toBe(200);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		expect(authResponse.status).toBe(200);
		// // Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		expect(tokenResponse.status).toBe(200);
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(202);

		// Get Yoti Session Id
		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);

		// Yoti Callback
		const callbackResponse = await callbackPost(yotiSessionId);
		expect(callbackResponse.status).toBe(202);

		// Retrieve Verifiable Credential from dequeued SQS queue
		let sqsMessage;
		do {
			sqsMessage = await getDequeuedSqsMessage(sub);
		} while (!sqsMessage);
		const jwtToken = sqsMessage["https://vocab.account.gov.uk/v1/credentialJWT"][0];

		validateJwtToken(jwtToken, vcResponseData, "0000");
	}, 20000);

	it.each([
		["0150", dataPassport, "FRANK", "JACOB", "JAMES", "SMITH"],
		["0151", dataPassport,  "FRANK", "JACOB", "JAMES", "SMITH"],
		["0152", dataPassport,  "FRANK", "JACOB", "JAMES", "SMITH"],
	])("F2F CRI Callback Endpoint Given Names in Yoti Response- yotiMockId: '%s'", async (yotiMockId: string, docSelectionData:any, givenName1:any, givenName2:any, givenName3:any, familyName:any ) => {
		f2fStubPayload.yotiMockID = yotiMockId;
		f2fStubPayload.shared_claims.name[0].nameParts[0].value = givenName1;
		f2fStubPayload.shared_claims.name[0].nameParts[1].value = givenName2 + " " + givenName3;
		f2fStubPayload.shared_claims.name[0].nameParts[2].value = familyName;

		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		const sessionId = sessionResponse.data.session_id;
		const sub = sessionResponse.data.sub;

		// Document Selection
		const response = await postDocumentSelection(docSelectionData, sessionId);
		expect(response.status).toBe(200);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		expect(authResponse.status).toBe(200);
		// // Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		expect(tokenResponse.status).toBe(200);
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(202);

		// Get Yoti Session Id
		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);

		// Yoti Callback
		const callbackResponse = await callbackPost(yotiSessionId);
		console.log(callbackResponse.data);

		// Retrieve Verifiable Credential from dequeued SQS queue
		let sqsMessage;
		do {
			sqsMessage = await getDequeuedSqsMessage(sub);
		} while (!sqsMessage);
		const jwtToken = sqsMessage["https://vocab.account.gov.uk/v1/credentialJWT"][0];
		validateJwtTokenNamePart(jwtToken, givenName1, givenName2, givenName3, familyName + yotiMockId);
	}, 20000);

	it("F2F CRI Callback Endpoint TxMA Validation", async () => {
		f2fStubPayload.yotiMockID = "0000";
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		const sessionId = sessionResponse.data.session_id;
		const sub = sessionResponse.data.sub;

		// Document Selection
		const response = await postDocumentSelection(dataPassport, sessionId);
		expect(response.status).toBe(200);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		expect(authResponse.status).toBe(200);
		// // Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		expect(tokenResponse.status).toBe(200);
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(202);

		// Get Yoti Session Id
		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);

		// Yoti Callback
		const callbackResponse = await callbackPost(yotiSessionId);
		expect(callbackResponse.status).toBe(202);

		// Retrieve Verifiable Credential from dequeued SQS queue
		let sqsMessage;
		do {
			sqsMessage = await getSqsEventList("txma/", sessionId, 6);
		} while (!sqsMessage);
		await validateTxMAEventData(sqsMessage);

	}, 20000);
});
