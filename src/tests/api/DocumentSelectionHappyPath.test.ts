import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataDriversLicense from "../data/docSelectionPayloadDriversLicenceValid.json";
import dataBrp from "../data/docSelectionPayloadBrpValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId, authorizationGet, tokenPost, userInfoPost, stubStartPostNoSharedClaims, sessionPost, getSessionById } from "../utils/ApiTestSteps";

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
		expect(tokenResponse.status).toBe(200);
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
		expect(tokenResponse.status).toBe(200);
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
		expect(tokenResponse.status).toBe(200);
		console.log(tokenResponse.data);
		// Post User Info
		const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(202);
		console.log(userInfoResponse.data);
	});

	it(" Happy Path Journey - Validate Session Expiray is Updated after Document Selection ", async () => {
		//Get yoti expiry time
		const initinalSessionRecord = await getSessionById(sessionId, "session-f2f-cri-ddb");
		const initinalYotiSessionExpiry: any = initinalSessionRecord?.expiryDate;
		console.log(initinalYotiSessionExpiry);

		//Wait for 5 seconds to lapse
		await new Promise(res => setTimeout(res, 5000));

		//Post document selection
		const response = await postDocumentSelection(dataPassport, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");

		//Get updated yoti expiry time
		const updatedSessionRecord = await getSessionById(sessionId, "session-f2f-cri-ddb");
		const updatedYotiSessionExpiry: any = updatedSessionRecord?.expiryDate;
		console.log(updatedYotiSessionExpiry);

		expect(updatedYotiSessionExpiry).toBeGreaterThan(initinalYotiSessionExpiry);
	});
});

