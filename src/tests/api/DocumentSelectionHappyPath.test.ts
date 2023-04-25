import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataDriversLicense from "../data/docSelectionPayloadDriversLicenceValid.json";
import dataBrp from "../data/docSelectionPayloadBrpValid.json";
import claimedIdentityTemplate from "../data/claimedIdentityTemplate.json";
import { postDocumentSelection, sessionPost, stubStartPost, stubStartPostNoSharedClaims } from "../utils/ApiTestSteps";

describe("Happy Path /documentSelection Endpoint", () => {
	let sessionId: any;
	beforeEach(async () => {
		const stubResponse = await stubStartPost();
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		sessionId = sessionResponse.data.session_id;
	});

	it("Happy Path Journey - Passport", async () => {
		console.log(sessionId);
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataPassport, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});

	it("Happy Path Journey - Drivers Licence", async () => {
		console.log(sessionId);
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataDriversLicense, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});
});

describe("Happy Path /documentSelection Endpoint No Shared Claims", () => {

	it("Happy Path Journey - Biometric Residence Permit - No Shared Claims", async () => {
		const stubResponse = await stubStartPostNoSharedClaims(claimedIdentityTemplate);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		const sessionId = sessionResponse.data.session_id;
		console.log(sessionId);
		expect(sessionId).toBeTruthy();
		const response = await postDocumentSelection(dataBrp, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});
});
