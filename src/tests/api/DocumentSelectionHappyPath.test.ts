import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataDriversLicense from "../data/docSelectionPayloadDriversLicenceValid.json";
import dataBrp from "../data/docSelectionPayloadBrpValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import { prepareForCallback, postDocumentSelection, startStubServiceAndReturnSessionId, getSessionById } from "../utils/ApiTestSteps";
import { constants } from "../utils/ApiConstants";

describe("E2E Happy Path /documentSelection Endpoint", () => {
	let sessionId: any;
	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
	});

	it("E2E Happy Path Journey - Passport", async () => {
		await prepareForCallback(dataPassport, sessionId);
	});

	it("E2E Happy Path Journey - Drivers Licence", async () => {
		await prepareForCallback(dataDriversLicense, sessionId);
	});

	it("E2E Happy Path Journey - Biometric Residence Permit", async () => {
		await prepareForCallback(dataBrp, sessionId);
	});

	// Test Suspended - additional engineering work is required to facilitate the validation of BE systems, designs and US to follow	
	it("Happy Path Journey - Validate Session Expiray is Updated after Document Selection", async () => {
		//Get yoti expiry time
		const initinalSessionRecord = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const initinalYotiSessionExpiry: any = initinalSessionRecord?.expiryDate;
		console.log(initinalYotiSessionExpiry);

		//Wait for 5 seconds to lapse
		await new Promise(res => setTimeout(res, 5000));

		//Post document selection
		const response = await postDocumentSelection(dataPassport, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");

		//Get updated yoti expiry time
		const updatedSessionRecord = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const updatedYotiSessionExpiry: any = updatedSessionRecord?.expiryDate;
		console.log(updatedYotiSessionExpiry);

		expect(Number(updatedYotiSessionExpiry)).toBeGreaterThan(Number(initinalYotiSessionExpiry));
	});
});

