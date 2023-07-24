import f2fStubPayload from "../data/exampleStubPayload.json";
import abortPayload from "../data/abortPayload.json";

import { startStubServiceAndReturnSessionId, postAbortSession, } from "../utils/ApiTestSteps";

describe("E2E Happy Path /abort enpoint", () => {
	let sessionId: any;
	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = sessionResponse.data.session_id;
		console.log("session id: " + sessionId)
	});

	it("E2E Happy Path Journey - Abort Session", async () => {
		expect(sessionId).toBeTruthy();
		const response = await postAbortSession(abortPayload, sessionId);
		expect(response.request.path).toContain("/redirect?error=access_denied&state=F2F_CRI_SESSION_ABORTED");
	});

	it("E2E Happy Path Journey - Abort Previously Aborted Session", async () => {
		const response = await postAbortSession(abortPayload, "e6bf8c21-9e49-46fa-b602-0c0e46055425");
		expect(response.status).toBe(200);
		expect(response.data).toBe("Session has already been aborted");
	});
});

