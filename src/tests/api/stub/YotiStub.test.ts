 
import yotiRequestData from "../../data/yotiSessionsPayloadValid.json";
import { 
	postYotiSession, 
	getYotiSessionsConfiguration, 
	putYotiSessionsInstructions, 
	getYotiSessionsInstructions, 
} from "../ApiTestSteps";

describe("Yoti Stub", () => {
	const postSessionsParams = [
		{ responseCode: 201, userTrackerId: "2000" },
		{ responseCode: 400, userTrackerId: "1400" },
		{ responseCode: 401, userTrackerId: "1401" },
		{ responseCode: 403, userTrackerId: "1403" },
		{ responseCode: 503, userTrackerId: "1503" },
	];
	it.each(postSessionsParams)("Yoti - expect '%i' response on POST/sessions '/sessions'", async ({ responseCode, userTrackerId } : { responseCode: number; userTrackerId: string }) => {
		const response = await postYotiSession(userTrackerId, yotiRequestData);
		expect(response.status).toBe(responseCode);
	});

	const getConfigurationParams = [
		{ responseCode: 200, sessionId: "0000" },
		{ responseCode: 400, sessionId: "2400" },
		{ responseCode: 401, sessionId: "2401" },
		{ responseCode: 404, sessionId: "2404" },
		{ responseCode: 409, sessionId: "2409" },
		{ responseCode: 503, sessionId: "2503" },
	  ];
	it.each(getConfigurationParams)("Yoti - expect '%i' response on GET/sessions/configuration '/sessions/%s/configuration'", async ({ responseCode, sessionId } : { responseCode: number; sessionId: string }) => {
		const response = await getYotiSessionsConfiguration(sessionId);
		expect(response.status).toBe(responseCode);
	});

	const putInstructionsParams = [
		{ responseCode: 200, sessionId: "0000" },
		{ responseCode: 400, sessionId: "3400" },
		{ responseCode: 401, sessionId: "3401" },
		{ responseCode: 404, sessionId: "3404" },
		{ responseCode: 409, sessionId: "3409" },
		{ responseCode: 503, sessionId: "3503" },
		  ];
	it.each(putInstructionsParams)("Yoti - expect '%i' response on PUT/sessions/{id}/instructions '/sessions/%s/instructions'", async ({ responseCode, sessionId } : { responseCode: number; sessionId: string }) => {
		const fadcodePayload = { "branch": { "fad_code":"1234567" } };
		const response = await putYotiSessionsInstructions(sessionId, fadcodePayload);
		expect(response.status).toBe(responseCode);
	});

	const getInstructionsParams = [
		{ responseCode: 200, sessionId: "0000" },
		{ responseCode: 400, sessionId: "4400" },
		{ responseCode: 401, sessionId: "4401" },
		{ responseCode: 404, sessionId: "4404" },
		{ responseCode: 500, sessionId: "4500" },
		{ responseCode: 409, sessionId: "4409" },
		{ responseCode: 503, sessionId: "4503" },
	];
	it.each(getInstructionsParams)("Yoti - expect '%i' response on GET/sessions/instructions/pdf '/sessions/%s/instructions/pdf'", async ({ responseCode, sessionId } : { responseCode: number; sessionId: string }) => {
		const response = await getYotiSessionsInstructions(sessionId);
		expect(response.status).toBe(responseCode);
	});
});

describe("Yoti Stub retry responses", () => {
	const retryPostSessionsParams = [
		{ responseCode: 503, userTrackerId: "1601" },
		{ responseCode: 503, userTrackerId: "1601" },
		{ responseCode: 503, userTrackerId: "1601" },
		{ responseCode: 201, userTrackerId: "1601" },
	];
	it.each(retryPostSessionsParams)("Expect retry behaviour on POST /sessions with appropriate response for iteration", async ({ responseCode, userTrackerId } : { responseCode: number; userTrackerId: string }) => {
		const response = await postYotiSession(userTrackerId, yotiRequestData);
		expect(response.status).toBe(responseCode);
	});

	const retryGetConfigurationParams = [
		{ responseCode: 503, sessionId: "1601" },
		{ responseCode: 503, sessionId: "1601" },
		{ responseCode: 503, sessionId: "1601" },
		{ responseCode: 200, sessionId: "1601" },
	];
	it.each(retryGetConfigurationParams)("Expect retry behaviour on GET /sessions/{id}/configuration with appropriate response for iteration", async ({ responseCode, sessionId } : { responseCode: number; sessionId: string }) => {
		const response = await getYotiSessionsConfiguration(sessionId);
		expect(response.status).toBe(responseCode);
	});

	const retryPutInstructionsParams = [
		{ responseCode: 503, sessionId: "1601" },
		{ responseCode: 503, sessionId: "1601" },
		{ responseCode: 503, sessionId: "1601" },
		{ responseCode: 200, sessionId: "1601" },
	];
	it.each(retryPutInstructionsParams)("Expect retry behaviour on PUT /sessions/{id}/instructions with appropriate response for iteration", async ({ responseCode, sessionId } : { responseCode: number; sessionId: string }) => {
		const fadcodePayload = { "branch": { "fad_code":"1234567" } };
		const response = await putYotiSessionsInstructions(sessionId, fadcodePayload);
		expect(response.status).toBe(responseCode);
	});

	const retryGetInstructionsParams = [
		{ responseCode: 503, sessionId: "1601" },
		{ responseCode: 503, sessionId: "1601" },
		{ responseCode: 503, sessionId: "1601" },
		{ responseCode: 200, sessionId: "1601" },
	];
	it.each(retryGetInstructionsParams)("Expect retry behaviour on /sessions/{sessionId}/instructions/pdf with appropriate response for iteration", async ({ responseCode, sessionId } : { responseCode: number; sessionId: string }) => {
		const response = await getYotiSessionsInstructions(sessionId);
		expect(response.status).toBe(responseCode);
	});
});
