import dataDriversLicenseInvalid from "../data/docSelectionPayloadDriversLicenceInvalid.json";
import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId, authorizationGet, tokenPost, userInfoPost, stubStartPost, sessionPost } from "../utils/ApiTestSteps";
import f2fStubPayload from "../data/exampleStubPayload.json";
import { constants } from "../utils/ApiConstants";

describe("E2E Negative Path /session Endpoint", () => {
	let sessionId: any;
	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
	});

	it("E2E Negative Path Journey - No Given Name Field", async () => {
		f2fStubPayload.shared_claims.name[0].nameParts[0].value = "";
		f2fStubPayload.shared_claims.name[0].nameParts[1].value = "";
		const stubResponse = await stubStartPost(f2fStubPayload);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toEqual("Unauthorized");
	});

	it("E2E Happy Path Journey - No Family Name Field", async () => {
		f2fStubPayload.shared_claims.name[0].nameParts[2].value = "";
		const stubResponse = await stubStartPost(f2fStubPayload);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toEqual("Unauthorized");
	});

	it("E2E Happy Path Journey - No Email Address", async () => {
		f2fStubPayload.shared_claims.emailAddress = "";
		const stubResponse = await stubStartPost(f2fStubPayload);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toEqual("Unauthorized");
	});
});


describe("E2E Negative Path /documentSelection Endpoint", () => {
	let sessionId: any;
	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
	});

	it("E2E Negative Path Journey - Invalid Request Payload", async () => {
		const response = await postDocumentSelection(dataDriversLicenseInvalid, sessionId);
		expect(response.status).toBe(400);
		expect(response.data).toEqual({ "message": "Invalid request body" });

	});

	it("E2E Happy Path Journey - Incorrect Session Id", async () => {
		const response = await postDocumentSelection(dataPassport, "sessionId");
		expect(response.status).toBe(401);
		expect(response.data).toBe("Unauthorized");
	});
});

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

