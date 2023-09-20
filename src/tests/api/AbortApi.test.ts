import f2fStubPayload from "../data/exampleStubPayload.json";
import abortPayload from "../data/abortPayload.json";

import { startStubServiceAndReturnSessionId, postAbortSession } from "../utils/ApiTestSteps";

describe("E2E Happy Path /abort enpoint", () => {
	let sessionId: any;
	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId);
	});

	it("E2E Happy Path Journey - Abort Session", async () => {
		expect(sessionId).toBeTruthy();
		const response = await postAbortSession(abortPayload, sessionId);
		expect(response.headers.location).toContain("/redirect?error=access_denied&state=");
	});

	it("E2E Happy Path Journey - Abort Previously Aborted Session", async () => {
		expect(sessionId).toBeTruthy();
		const firstResponse = await postAbortSession(abortPayload, sessionId);
		expect(firstResponse.headers.location).toContain("/redirect?error=access_denied&state=");

		const secondResponse = await postAbortSession(abortPayload, sessionId);
		expect(secondResponse.status).toBe(200);
		expect(secondResponse.data).toBe("Session has already been aborted");
	});
});

