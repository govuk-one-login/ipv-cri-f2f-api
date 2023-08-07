import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataUkDrivingLicence from "../data/docSelectionPayloadDriversLicenceValid.json";
import dataEuDrivingLicence from "../data/docSelectionPayloadEuDriversLicenceValid.json";
import dataNonUkPassport from "../data/docSelectionPayloadNonUkPassportValid.json";
import dataBrp from "../data/docSelectionPayloadBrpValid.json";
import dataEeaIdCard from "../data/docSelectionPayloadEeaIdCardValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
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
	getDequeuedSqsMessage
} from "../utils/ApiTestSteps";
import "dotenv/config";

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
		const session = await getSessionById(sessionId, "session-f2f-cri-ddb");
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

		expect(jwtToken).toBeTruthy();  // TODO: replace this with validateJwtToken below
		// validateJwtToken(jwtToken, vcResponseData, yotiMockId);

	}, 20000);

	it("F2F CRI Callback Endpoint Integration HappyPath - yotiMockId: '%s'", async () => {
		f2fStubPayload.yotiMockID = "0000";
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		const sessionId = sessionResponse.data.session_id;
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

		// Test Suspended - additional engineering work is required to facilitate the validation of BE systems, designs and US to follow
		// Get Yoti Session Id
		// const session = await getSessionById(sessionId, "session-f2f-cri-ddb");
		// const yotiSessionId: any = session?.yotiSessionId;
		// console.log(yotiSessionId);
		// Yoti Callback
		// const callbackResponse = await callbackPost(yotiSessionId);
		// expect(userInfoResponse.status).toBe(202);
		// Verifiable Credential Validation
		//await setTimeout(10000);
		//const jwtToken = await receiveJwtTokenFromSqsMessage();
		//validateJwtToken(jwtToken, vcResponseData, yotiMockId);
	});
});
