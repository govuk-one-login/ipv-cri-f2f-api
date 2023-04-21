import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataDriversLicense from "../data/docSelectionPayloadDriversLicenceValid.json";
import dataBrp from "../data/docSelectionPayloadBrpValid.json";
import claimedIdentityTemplate from "../data/claimedIdentityTemplate.json";
import { postDocumentSelection, sessionPost, stubStartPost, stubStartPostNoSharedClaims } from "../utils/ApiTestSteps";

describe("E2E Happy Path /documentSelection Endpoint", () => {
	let sessionId: any;
	beforeAll(async () => {
		const stubResponse = await stubStartPost();
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		sessionId = sessionResponse.data.session_id;
	});

	it("E2E Happy Path Journey - Passport", async () => {
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataPassport, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});

	it("E2E Happy Path Journey - Drivers Licence", async () => {
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataDriversLicense, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});

	it("E2E Happy Path Journey - Biometric Residence Permit", async () => {
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataBrp, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});
});

describe("E2E Happy Path /documentSelection Endpoint No Shared Claims", () => {
	let sessionId: any;
	beforeAll(async () => {
		const stubResponse = await stubStartPostNoSharedClaims(claimedIdentityTemplate);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		sessionId = sessionResponse.data.session_id;
	});

	it("E2E Happy Path Journey - Passport - No Shared Claims", async () => {
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataPassport, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});

	it("E2E Happy Path Journey - Drivers Licence - No Shared Claims", async () => {
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataDriversLicense, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});

	it("E2E Happy Path Journey - Biometric Residence Permit - No Shared Claims", async () => {
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataBrp, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});
});
