import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataDriversLicense from "../data/docSelectionPayloadDriversLicenceValid.json";
import dataBrp from "../data/docSelectionPayloadBrpValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId, authorizationGet, tokenPost, userInfoPost, stubStartPostNoSharedClaims, sessionPost } from "../utils/ApiTestSteps";

describe("E2E Happy Path /documentSelection Endpoint", () => {
	let sessionId: any;
	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
	});

	it("E2E Happy Path Journey - Passport", async () => {
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataPassport, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		expect(authResponse.status).toBe(200);
		expect(authResponse.data.authorizationCode.value).toBeTruthy();
		expect(authResponse.data.redirect_uri).toBeTruthy();
		expect(authResponse.data.state).toBeTruthy();

		// // Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		expect(tokenResponse.status).toBe(201);
		console.log(tokenResponse.data);
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(202);
		console.log(userInfoResponse.data);
	});

	it("E2E Happy Path Journey - Drivers Licence", async () => {
		const response = await postDocumentSelection(dataDriversLicense, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		expect(authResponse.status).toBe(200);
		expect(authResponse.data.authorizationCode.value).toBeTruthy();
		expect(authResponse.data.redirect_uri).toBeTruthy();
		expect(authResponse.data.state).toBeTruthy();
		// // Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		expect(tokenResponse.status).toBe(201);
		console.log(tokenResponse.data);
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(202);
		console.log(userInfoResponse.data);
	});

	it("E2E Happy Path Journey - Biometric Residence Permit", async () => {
		const response = await postDocumentSelection(dataBrp, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
		// Authorization
		const authResponse = await authorizationGet(sessionId);
		expect(authResponse.status).toBe(200);
		expect(authResponse.data.authorizationCode.value).toBeTruthy();
		expect(authResponse.data.redirect_uri).toBeTruthy();
		expect(authResponse.data.state).toBeTruthy();
		// // Post Token
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		expect(tokenResponse.status).toBe(201);
		console.log(tokenResponse.data);
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(202);
		console.log(userInfoResponse.data);
	});
});


