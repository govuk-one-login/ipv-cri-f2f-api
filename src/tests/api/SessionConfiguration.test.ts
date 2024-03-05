import f2fStubPayload from "../data/exampleStubPayload.json";
import thinFilePayload from "../data/thinFilePayload.json";
import { randomUUID } from "crypto";


import { sessionConfigurationGet, startStubServiceAndReturnSessionId } from "./ApiTestSteps";

describe("Session Configuration Endpoint Tests", () => {

	it("Happy Path Journey - Evidence Object Returned", async () => {
		const strengthScore = Math.floor(Math.random() * 5);
		thinFilePayload.evidence_requested.strengthScore = strengthScore;
		const sessionResponse = await startStubServiceAndReturnSessionId(thinFilePayload);
		const sessionConfigurationResponse = await sessionConfigurationGet(sessionResponse.data.session_id);
		expect(sessionConfigurationResponse.status).toBe(200);
		expect(sessionConfigurationResponse.data.evidence_requested.strengthScore).toEqual(strengthScore);
	});

	it("Happy Path Journey - Evidence Object Not Returned", async () => {
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);
		const sessionConfigurationResponse = await sessionConfigurationGet(sessionResponse.data.session_id);
		expect(sessionConfigurationResponse.status).toBe(200);
		expect(sessionConfigurationResponse.data).toStrictEqual({});
	});

	it("Negative Path Journey - Invalid Session", async () => {
		const sessionId = randomUUID();
		const sessionConfigurationResponse = await sessionConfigurationGet(sessionId);
		expect(sessionConfigurationResponse.status).toBe(401);
		expect(sessionConfigurationResponse.data).toBe("No session found with the session id: " + sessionId);
	});
});
