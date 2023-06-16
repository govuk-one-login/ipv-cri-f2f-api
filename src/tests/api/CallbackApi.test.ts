import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import integrationHappyPayload from "../data/integrationHappyPathPayload.json";
import vcResponseData from "../data/vcValidationData.json";
import { setTimeout } from "timers/promises";
import { postDocumentSelection, startStubServiceAndReturnSessionId, getSessionById, callbackPost, authorizationGet, tokenPost, userInfoPost, receiveJwtTokenFromSqsMessage, validateJwtToken } from "../utils/ApiTestSteps";


describe("Callback API", () => {
	jest.setTimeout(60000);
	const mockIdParams = [
		// ["0000"],
		// ["0001"],
		// ["0101"],
		// ["0102"],
		// ["0103"],
		// ["0108"],
		// ["0109"],
		// ["0110"],
		// ["0111"],
		// ["0112"],
		//["0113"],
		// ["0114"],
		// ["0115"],
		// ["0116"],
		// ["0117"],
		// ["0118"],
		// ["0119"],
		// ["0120"],
		// ["0121"],
		// ["0122"],
		// ["0123"],
		// ["0124"],
		// ["0125"],
		// ["0200"],
		// ["0201"],
		// ["0202"],
		// ["0203"],
		 ["0204"],
		["0113"],
		// ["0300"],
		// ["0301"],
		// ["0302"],
		// ["0303"],
		// ["0400"],
		// ["0401"],
		// ["0500"],
		// ["0501"],
		// ["0502"],
		// ["0503"],
	];

	it.each(mockIdParams)("F2F CRI Callback Endpoint - yotiMockId: '%s'", async (yotiMockId) => {
		f2fStubPayload.yotiMockID = yotiMockId;
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
		// Get Yoti Session Id
		const session = await getSessionById(sessionId, "session-f2f-cri-ddb");
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);
		// Yoti Callback
		const callbackResponse = await callbackPost(yotiSessionId);
		expect(userInfoResponse.status).toBe(202);
		// Verifiable Credential Validation
		await setTimeout(10000);
		const jwtToken = await receiveJwtTokenFromSqsMessage();
		validateJwtToken(jwtToken, vcResponseData, yotiMockId);
	});

	// it("F2F CRI Callback Endpoint Integration HappyPath - yotiMockId: '%s'", async () => {
	//
	// 	const sessionResponse = await startStubServiceAndReturnSessionId(integrationHappyPayload);
	// 	const sessionId = sessionResponse.data.session_id;
	// 	// Document Selection
	// 	const response = await postDocumentSelection(dataPassport, sessionId);
	// 	expect(response.status).toBe(200);
	// 	// Authorization
	// 	const authResponse = await authorizationGet(sessionId);
	// 	expect(authResponse.status).toBe(200);
	// 	// // Post Token
	// 	const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
	// 	expect(tokenResponse.status).toBe(200);
	// 	// Post User Info
	// 	const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
	// 	expect(userInfoResponse.status).toBe(202);
	// 	// Get Yoti Session Id
	// 	const session = await getSessionById(sessionId, "session-f2f-cri-ddb");
	// 	const yotiSessionId: any = session?.yotiSessionId;
	// 	console.log(yotiSessionId);
	// 	// Yoti Callback
	// 	const callbackResponse = await callbackPost(yotiSessionId);
	// 	expect(userInfoResponse.status).toBe(202);
	// 	// Verifiable Credential Validation
	// 	//await setTimeout(10000);
	// 	//const jwtToken = await receiveJwtTokenFromSqsMessage();
	// 	//validateJwtToken(jwtToken, vcResponseData, yotiMockId);
	// });
});
