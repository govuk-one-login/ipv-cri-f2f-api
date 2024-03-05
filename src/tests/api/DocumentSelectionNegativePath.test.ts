import dataDriversLicenseInvalid from "../data/docSelectionPayloadDriversLicenceInvalid.json";
import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataPassportMissingFad from "../data/dataPassportMissingFad.json";
import dataPassportBlankFad from "../data/dataPassportBlankFad.json";
import dataPassportIncorrectFad from "../data/dataPassportIncorrectFad.json";
import dataPassportInvalidFadFormat from "../data/dataPassportInvalidFadFormat.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId } from "../utils/ApiTestSteps";
import f2fStubPayload from "../data/exampleStubPayload.json";

describe("E2E Negative Path /documentSelection Endpoint", () => {
	let sessionId: string;
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

	it("E2E Negative Path Journey - Incorrect Session Id", async () => {
		const response = await postDocumentSelection(dataPassport, "sessionId");
		expect(response.status).toBe(401);
		expect(response.data).toBe("Unauthorized");
	});

	it("E2E Negative Path Journey - Blank fad_code", async () => {
		const response = await postDocumentSelection(dataPassportBlankFad, sessionId);
		expect(response.status).toBe(500);
		expect(response.data).toBe("Error generating Yoti instructions PDF");
	});

	it("E2E Negative Path Journey - Incorrect fad_code", async () => {
		const response = await postDocumentSelection(dataPassportIncorrectFad, sessionId);
		expect(response.status).toBe(500);
		expect(response.data).toBe("Error generating Yoti instructions PDF");
	});
	
	it("E2E Negative Path Journey - Invalid fad format", async () => {
		const response = await postDocumentSelection(dataPassportInvalidFadFormat, sessionId);
		expect(response.status).toBe(500);
		expect(response.data).toBe("Error generating Yoti instructions PDF");
	});

	it("E2E Negative Path Journey - Missing fad_code", async () => {
		const response = await postDocumentSelection(dataPassportMissingFad, sessionId);
		expect(response.status).toBe(400);
		expect(response.data).toStrictEqual({ "message": "Invalid request body" });
	});
});
