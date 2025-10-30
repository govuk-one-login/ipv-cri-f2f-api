 
import yotiRequestData from "../../data/yotiSessionsPayloadValid.json";
import { 
	postYotiSession, 
	getYotiSessionsConfiguration, 
	putYotiSessionsInstructions, 
	getYotiSessionsInstructions, 
} from "../ApiTestSteps";

describe("Yoti stub requests", () => {
	const postSessionsParams = [
		{ responseCode: 201, yotiSessionId: "2000" },
		{ responseCode: 400, yotiSessionId: "1400" },
		{ responseCode: 401, yotiSessionId: "1401" },
		{ responseCode: 403, yotiSessionId: "1403" },
		{ responseCode: 503, yotiSessionId: "1503" },
	];
	it.each(postSessionsParams)('expect $responseCode response on POST /sessions', async ({ responseCode, yotiSessionId } : { responseCode: number; yotiSessionId: string }) => {
		const response = await postYotiSession(yotiSessionId, yotiRequestData);
		expect(response.status).toBe(responseCode);
	});

	const getConfigurationParams = [
		{ responseCode: 200, yotiSessionId: "0000" },
		{ responseCode: 400, yotiSessionId: "2400" },
		{ responseCode: 401, yotiSessionId: "2401" },
		{ responseCode: 404, yotiSessionId: "2404" },
		{ responseCode: 409, yotiSessionId: "2409" },
		{ responseCode: 503, yotiSessionId: "2503" },
	  ];
	it.each(getConfigurationParams)('expect $responseCode response on GET /sessions/$yotiSessionId/configuration ', async ({ responseCode, yotiSessionId } : { responseCode: number; yotiSessionId: string }) => {
		const response = await getYotiSessionsConfiguration(yotiSessionId);
		expect(response.status).toBe(responseCode);
	});

	const putInstructionsParams = [
		{ responseCode: 200, yotiSessionId: "0000" },
		{ responseCode: 400, yotiSessionId: "3400" },
		{ responseCode: 401, yotiSessionId: "3401" },
		{ responseCode: 404, yotiSessionId: "3404" },
		{ responseCode: 409, yotiSessionId: "3409" },
		{ responseCode: 503, yotiSessionId: "3503" },
		  ];
	it.each(putInstructionsParams)('expect $responseCode response on PUT /sessions/$yotiSessionId/instructions', async ({ responseCode, yotiSessionId } : { responseCode: number; yotiSessionId: string }) => {
		const fadcodePayload = { "branch": { "fad_code":"1234567" } };
		const response = await putYotiSessionsInstructions(yotiSessionId, fadcodePayload);
		expect(response.status).toBe(responseCode);
	});

	const getInstructionsParams = [
		{ responseCode: 200, yotiSessionId: "0000" },
		{ responseCode: 400, yotiSessionId: "4400" },
		{ responseCode: 401, yotiSessionId: "4401" },
		{ responseCode: 404, yotiSessionId: "4404" },
		{ responseCode: 409, yotiSessionId: "4409" },
		{ responseCode: 500, yotiSessionId: "4500" },
		{ responseCode: 503, yotiSessionId: "4503" },
	];
	it.each(getInstructionsParams)('expect $responseCode response on GET /sessions/$yotiSessionId/instructions/pdf', async ({ responseCode, yotiSessionId } : { responseCode: number; yotiSessionId: string }) => {
		const response = await getYotiSessionsInstructions(yotiSessionId);
		expect(response.status).toBe(responseCode);
	});
});

describe("Yoti stub retry requests", () => {
	const retryPostSessionsParams = [
		{ responseCode: 503, yotiSessionId: "1601", attemptNo: 1 },
		{ responseCode: 503, yotiSessionId: "1601", attemptNo: 2 },
		{ responseCode: 201, yotiSessionId: "1601", attemptNo: 3 },
	];
	it.each(retryPostSessionsParams)('expect $responseCode response on POST /sessions with yotiSessionId $yotiSessionId - attempt $attemptNo', async ({ responseCode, yotiSessionId } : { responseCode: number; yotiSessionId: string}) => {
		const response = await postYotiSession(yotiSessionId, yotiRequestData);
		expect(response.status).toBe(responseCode);
	});

	const retryGetConfigurationParams = [
		{ responseCode: 503, yotiSessionId: "1601", attemptNo: 1 },
		{ responseCode: 503, yotiSessionId: "1601", attemptNo: 2 },
		{ responseCode: 200, yotiSessionId: "1601", attemptNo: 3 },
	];
	it.each(retryGetConfigurationParams)('expect $responseCode response on GET /sessions/$yotiSessionId/configuration - attempt $attemptNo', async ({ responseCode, yotiSessionId } : { responseCode: number; yotiSessionId: string }) => {
		const response = await getYotiSessionsConfiguration(yotiSessionId);
		expect(response.status).toBe(responseCode);
	});

	const retryPutInstructionsParams = [
		{ responseCode: 503, yotiSessionId: "1601", attemptNo: 1 },
		{ responseCode: 503, yotiSessionId: "1601", attemptNo: 2 },
		{ responseCode: 200, yotiSessionId: "1601", attemptNo: 3 },
	];
	it.each(retryPutInstructionsParams)('expect $responseCode response on PUT /sessions/$yotiSessionId/instructions - attempt $attemptNo', async ({ responseCode, yotiSessionId } : { responseCode: number; yotiSessionId: string }) => {
		const fadcodePayload = { "branch": { "fad_code":"1234567" } };
		const response = await putYotiSessionsInstructions(yotiSessionId, fadcodePayload);
		expect(response.status).toBe(responseCode);
	});

	const retryGetInstructionsParams = [
		{ responseCode: 503, yotiSessionId: "1601", attemptNo: 1 },
		{ responseCode: 503, yotiSessionId: "1601", attemptNo: 2 },
		{ responseCode: 200, yotiSessionId: "1601", attemptNo: 3 },
	];
	it.each(retryGetInstructionsParams)('expect $responseCode response on /sessions/$yotiSessionId/instructions/pdf - attempt $attemptNo', async ({ responseCode, yotiSessionId } : { responseCode: number; yotiSessionId: string }) => {
		const response = await getYotiSessionsInstructions(yotiSessionId);
		expect(response.status).toBe(responseCode);
	});
});
