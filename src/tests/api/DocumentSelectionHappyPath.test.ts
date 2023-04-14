import * as dataPassport from "../data/docSelectionPayloadPassportValid.json";
import * as dataDriversLicense from "../data/docSelectionPayloadDriversLicenceValid.json";
import * as dataBrp from "../data/docSelectionPayloadBrpValid.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId } from "../utils/ApiTestSteps";

describe("E2E Happy Path /documentSelection Endpoint", () => {
	// Add logic to fetch sessionId eventually
	let sessionId: any;
	beforeAll(async () => {
		const sessionResponse = await startStubServiceAndReturnSessionId();
		sessionId = sessionResponse.data.session_id;
	});

	it("E2E Happy Path Journey - Passport", async () => {
		console.log(sessionId);
		const response = await postDocumentSelection(dataPassport, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});

	it("E2E Happy Path Journey - Drivers Licence", async () => {
		const response = await postDocumentSelection(dataDriversLicense, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});

	it("E2E Happy Path Journey - Biometric Residence Permit", async () => {
		const response = await postDocumentSelection(dataBrp, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");
	});
});
