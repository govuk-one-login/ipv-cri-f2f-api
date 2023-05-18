import dataDriversLicense from "../data/docSelectionPayloadDriversLicenceInvalid.json";
import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import { constants } from "../utils/ApiConstants";
import { postDocumentSelection, startStubServiceAndReturnSessionId, authorizationGet, tokenPost, userInfoPost } from "../utils/ApiTestSteps";

describe("Negative Path /documentSelection Endpoint", () => {
	let sessionId: any;
	beforeEach(async () => {
		const sessionResponse = await startStubServiceAndReturnSessionId();
		sessionId = sessionResponse.data.session_id;
	});

	it("E2E Negative Path Journey - Invalid Request Payload", async () => {
		console.log(sessionId);
		const response = await postDocumentSelection(dataDriversLicense, sessionId);
		expect(response.status).toBe(400);
		expect(response.data).toEqual({ "message": "Invalid request body" });

	});

	it("E2E Happy Path Journey - Incorrect Session Id", async () => {
		const response = await postDocumentSelection(dataPassport, "sessionId");
		expect(response.status).toBe(400);
		expect(response.data).toEqual("Session id must be a valid uuid");
	});
});

describe("Negative Path /userInfo Endpoint", () => {
	let sessionId: any;
	beforeEach(async () => {
		const sessionResponse = await startStubServiceAndReturnSessionId();
		sessionId = sessionResponse.data.session_id;
	});

	it("Negative Path Journey - Invalid Signature", async () => {
		const response = await postDocumentSelection(dataPassport, sessionId);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		// Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer ");
		expect(userInfoResponse.status).toBe(400); 
		expect(userInfoResponse.data).toEqual("Failed to Validate - Authentication header: Failed to verify signature"); 
	});

	it("Negative Path Journey - Invalid Authorization Header", async () => {
		const response = await postDocumentSelection(dataPassport, sessionId);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		// Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		console.log(tokenResponse.data.access_token);
		// Post User Info
		const userInfoResponse = await userInfoPost(tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(400); 
		expect(userInfoResponse.data).toEqual("Failed to Validate - Authentication header: Missing header: Authorization header is not of Bearer type access_token"); 
	});


	it("Negative Path Journey - Expired Authorization Header", async () => {
		const response = await postDocumentSelection(dataPassport, sessionId);
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		// Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		console.log(tokenResponse.data.access_token);
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + constants.EXPIRED_ACCESS_TOKEN);
		console.log("Bearer " + constants.EXPIRED_ACCESS_TOKEN)
		expect(userInfoResponse.status).toBe(400); 
		expect(userInfoResponse.data).toEqual("Failed to Validate - Authentication header: Verification of exp failed"); 
	});
});