import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId, getSessionById, callbackPost, authorizationGet, tokenPost, userInfoPost, receiveSqsMessage } from "../utils/ApiTestSteps";


describe("Yoti /sessions endpoint", () => {

	const mockIdParams = [		
		["0000"],
		["0001"],
		["0101"],
		["0102"],
		["0103"],
		["0104"],
		["0105"],
		["0106"],
		["0107"],
		["0108"],
		["0109"],
		["0110"],
		["0111"],
		["0112"],
		["0113"],
		["0114"],
		["0115"],
		["0116"],
		["0117"],
		["0118"],
		["0119"],
		["0120"],
		["0121"],
		["0122"],
		["0123"],
		["0124"],
		["0125"],
		["0126"],
		["0127"],
		["0128"],
		["0200"],
		["0201"],
		["0202"],
		["0203"],

	];
	it.each(mockIdParams)("F2F CRI Callback Endpoint - yotiMockId:", async (yotiMockId) => {
		f2fStubPayload.yotiMockID = yotiMockId;
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		const sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
		// Document Selection
		const response = await postDocumentSelection(dataPassport, sessionId);
		console.log(response.data);
		expect(response.status).toBe(200);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		expect(authResponse.status).toBe(200);
		// // Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		expect(tokenResponse.status).toBe(201);
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
	});
});  
