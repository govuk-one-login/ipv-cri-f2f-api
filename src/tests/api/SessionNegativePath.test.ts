import { stubStartPost, sessionPost } from "../utils/ApiTestSteps";
import f2fStubPayload from "../data/exampleStubPayload.json";

describe("E2E Negative Path /session Endpoint", () => {
	let sessionId: string;
	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
	});

	it("E2E Negative Path Journey - No Given Name Field", async () => {
		f2fStubPayload.shared_claims.name[0].nameParts[0].value = "";
		f2fStubPayload.shared_claims.name[0].nameParts[1].value = "";
		const stubResponse = await stubStartPost(f2fStubPayload);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toBe("Unauthorized");
	});

	it("E2E Happy Path Journey - No Family Name Field", async () => {
		f2fStubPayload.shared_claims.name[0].nameParts[2].value = "";
		const stubResponse = await stubStartPost(f2fStubPayload);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toBe("Unauthorized");
	});

	it("E2E Happy Path Journey - No Email Address", async () => {
		f2fStubPayload.shared_claims.emailAddress = "";
		const stubResponse = await stubStartPost(f2fStubPayload);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toBe("Unauthorized");
	});
});
