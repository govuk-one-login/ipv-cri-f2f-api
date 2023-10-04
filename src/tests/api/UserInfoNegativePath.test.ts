import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId, authorizationGet, tokenPost, userInfoPost } from "../utils/ApiTestSteps";
import f2fStubPayload from "../data/exampleStubPayload.json";
import { constants } from "../utils/ApiConstants";

describe("Negative Path /userInfo Endpoint", () => {
	let sessionId: any;
	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
	});

	it("Negative Path Journey - Invalid Signature", async () => {
		const response = await postDocumentSelection(dataPassport, sessionId);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		// // Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer ");
		expect(userInfoResponse.status).toBe(400);
		expect(userInfoResponse.data).toBe("Failed to Validate - Authentication header: Failed to verify signature");
	});

	it("Negative Path Journey - Invalid Authorization Header", async () => {
		const response = await postDocumentSelection(dataPassport, sessionId);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		// Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		// Post User Info
		const userInfoResponse = await userInfoPost(tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(400);
		expect(userInfoResponse.data).toBe("Failed to Validate - Authentication header: Missing header: Authorization header is not of Bearer type access_token");
	});


	it.skip("Negative Path Journey - Expired Authorization Header", async () => {
		const response = await postDocumentSelection(dataPassport, sessionId);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		// Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + constants.DEV_F2F_EXPIRED_ACCESS_TOKEN);
		expect(userInfoResponse.status).toBe(400);
		expect(userInfoResponse.data).toBe("Failed to Validate - Authentication header: Verification of exp failed"); 
	});

	it.skip("Negative Path Journey - Missing Sub Authorization Header", async () => {
		const response = await postDocumentSelection(dataPassport, sessionId);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		// Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + constants.DEV_F2F_MISSING_SUB_ACCESS_TOKEN);
		console.log("Bearer " + constants.DEV_F2F_MISSING_SUB_ACCESS_TOKEN);
		expect(userInfoResponse.status).toBe(400);
	});
});

