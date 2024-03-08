import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataDriversLicense from "../data/docSelectionPayloadDriversLicenceValid.json";
import dataBrp from "../data/docSelectionPayloadBrpValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import { initiateUserInfo, postDocumentSelection, startStubServiceAndReturnSessionId, getSessionById } from "./ApiTestSteps";
import { constants } from "./ApiConstants";

// eslint-disable-next-line max-lines-per-function
describe("E2E Happy Path /documentSelection Endpoint", () => {
	let sessionId: string;

	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
		const { sessionId: newSessionId } = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = newSessionId;
		console.log("session id: " + sessionId);
	});

	it("E2E Happy Path Journey - Passport", async () => {
		expect(sessionId).toBeTruthy();
		await initiateUserInfo(dataPassport, sessionId);
	});

	it("E2E Happy Path Journey - Drivers Licence", async () => {
		expect(sessionId).toBeTruthy();
		await initiateUserInfo(dataDriversLicense, sessionId);
	});

	it("E2E Happy Path Journey - Biometric Residence Permit", async () => {
		expect(sessionId).toBeTruthy();
		await initiateUserInfo(dataBrp, sessionId);
	});

	it("Happy Path Journey - Validate Session Expiray is Updated after Document Selection", async () => {
		// Get yoti expiry time
		const initinalSessionRecord = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const initinalYotiSessionExpiry = initinalSessionRecord?.expiryDate;

		// Wait for 5 seconds to lapse
		await new Promise(res => setTimeout(res, 5000));

		//Post document selection
		const response = await postDocumentSelection(dataPassport, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");

		// Get updated yoti expiry time
		const updatedSessionRecord = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const updatedYotiSessionExpiry: any = updatedSessionRecord?.expiryDate;

		expect(Number(updatedYotiSessionExpiry)).toBeGreaterThan(Number(initinalYotiSessionExpiry));
	});
});

