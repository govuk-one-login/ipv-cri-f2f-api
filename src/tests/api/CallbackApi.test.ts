import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataUkDrivingLicence from "../data/docSelectionPayloadDriversLicenceValid.json";
import dataEuDrivingLicence from "../data/docSelectionPayloadEuDriversLicenceValid.json";
import dataNonUkPassport from "../data/docSelectionPayloadNonUkPassportValid.json";
import dataBrp from "../data/docSelectionPayloadBrpValid.json";
import dataEeaIdCard from "../data/docSelectionPayloadEeaIdCardValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import integrationHappyPayload from "../data/integrationHappyPathPayload.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId, getSessionById, callbackPost, authorizationGet, tokenPost, userInfoPost, receiveJwtTokenFromSqsMessage, validateJwtToken } from "../utils/ApiTestSteps";
import "dotenv/config";

describe("Callback API", () => {
	jest.setTimeout(60000);

	it.each([
		["0000", dataUkDrivingLicence],
		// ["0001", dataUkDrivingLicence],
		// ["0101", dataPassport],
		// ["0102", dataPassport],
		// ["0103", dataPassport],
		// ["0108", dataPassport],
		// ["0109", dataPassport],
		// ["0110", dataPassport],
		// ["0111", dataPassport],
		// ["0112", dataPassport],
		// ["0113", dataPassport],
		// ["0114", dataPassport],
		// ["0115", dataPassport],
		// ["0116", dataPassport],
		// ["0117", dataPassport],
		// ["0118", dataPassport],
		// ["0119", dataPassport],
		// ["0120", dataPassport],
		// ["0121", dataPassport],
		// ["0122", dataPassport],
		// ["0123", dataPassport],
		// ["0124", dataPassport],
		// ["0125", dataPassport],
		// ["0200", dataNonUkPassport],
		// ["0201", dataNonUkPassport],
		// ["0202", dataNonUkPassport],
		// ["0203", dataNonUkPassport],
		// ["0204", dataNonUkPassport],
		// ["0205", dataNonUkPassport],
		// ["0300", dataBrp],
		// ["0301", dataBrp],
		// ["0302", dataBrp],
		// ["0303", dataBrp],
		// ["0400", dataEuDrivingLicence],
		// ["0401", dataEuDrivingLicence],
		// ["0500", dataEeaIdCard],
		// ["0501", dataEeaIdCard],
		// ["0502", dataEeaIdCard],
		// ["0503", dataEeaIdCard]
	])("F2F CRI Callback Endpoint - yotiMockId: '%s'", async (yotiMockId: string, docSelectionData:any) => {
		f2fStubPayload.yotiMockID = yotiMockId;
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		const sessionId = sessionResponse.data.session_id;
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
		expect(userInfoResponse.status).toBe(202);
		// Verifiable Credential Validation
		//await setTimeout(10000);
		//const jwtToken = await receiveJwtTokenFromSqsMessage();
		//validateJwtToken(jwtToken, vcResponseData, yotiMockId);
	});

	it("F2F CRI Callback Endpoint Integration HappyPath - yotiMockId: '%s'", async () => {

		const sessionResponse = await startStubServiceAndReturnSessionId(integrationHappyPayload);
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
		// Get Yoti Session Id
		const session = await getSessionById(sessionId, "session-f2f-cri-ddb");
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);
		// Yoti Callback
		const callbackResponse = await callbackPost(yotiSessionId);
		expect(userInfoResponse.status).toBe(202);
		// Verifiable Credential Validation
		//await setTimeout(10000);
		//const jwtToken = await receiveJwtTokenFromSqsMessage();
		//validateJwtToken(jwtToken, vcResponseData, yotiMockId);
	});
});
