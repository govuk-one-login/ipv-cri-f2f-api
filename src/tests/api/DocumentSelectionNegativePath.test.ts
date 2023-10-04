import dataDriversLicenseInvalid from "../data/docSelectionPayloadDriversLicenceInvalid.json";
import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId } from "../utils/ApiTestSteps";
import f2fStubPayload from "../data/exampleStubPayload.json";

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

