import * as dataDriversLicense from "../data/docSelectionPayloadDriversLicenceInvalid.json";
import * as dataPassport from "../data/docSelectionPayloadPassportValid.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId } from "../utils/ApiTestSteps";

describe("E2E Negative Path /documentSelection Endpoint", () => {
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
		expect(response.data).toBe({"message": "Invalid request body"});
	});
});
