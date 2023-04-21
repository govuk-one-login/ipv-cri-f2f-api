import dataDriversLicense from "../data/docSelectionPayloadDriversLicenceInvalid.json";
import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import { postDocumentSelection, stubStartPost, sessionPost } from "../utils/ApiTestSteps";

describe("E2E Negative Path /documentSelection Endpoint", () => {
	let sessionId: any;
	beforeAll(async () => {
		const stubResponse = await stubStartPost();
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request)
		sessionId = sessionResponse.data.session_id;
	});

	it("E2E Negative Path Journey - Invalid Request Payload", async () => {
		console.log(sessionId);
		const response = await postDocumentSelection(dataDriversLicense, sessionId);
		expect(response.status).toBe(400);
		expect(response.data).toEqual({ "message": "Invalid request body" });

	});

	it("E2E Happy Path Journey - Incorrect Session Id", async () => {
		console.log(sessionId);

		const response = await postDocumentSelection(dataPassport, "sessionId");
		expect(response.status).toBe(400);
		expect(response.data).toBe("Session id must be a valid uuid");
	});
});
