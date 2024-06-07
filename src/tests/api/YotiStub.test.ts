/* eslint-disable max-lines-per-function */
import govNotifyRequestData from "../data/govNotifyStubPayload.json";
import yotiRequestData from "../data/yotiSessionsPayloadValid.json";
import poStubPayloadData from "../data/poStubPayload.json";
import { 
	postYotiSession, 
	getYotiSessionsConfiguration, 
	putYotiSessionsInstructions, 
	getYotiSessionsInstructions, 
	postGovNotifyRequest, 
	postPOCodeRequest, 
} from "./ApiTestSteps";
import { POST_OFFICE_RESPONSE_INCOMPLETE_DATA } from "../../../post-office-stub/src/data/postOfficeResponse/postOfficeResponseIncompleteData";

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
	it.each(putInstructionsParams)("Yoti - expect '%i' response on PUT/ssessions/{id}/instructions '/sessions/%s/instructions'", async ({ responseCode, sessionId } : { responseCode: number; sessionId: string }) => {
		const fadcodePayload = { "branch": { "fad_code":"1234567" } };
		const response = await putYotiSessionsInstructions(sessionId, fadcodePayload);
		expect(response.status).toBe(responseCode);
	});

	const getInstructionsParams = [
		{ responseCode: 200, sessionId: "0000" },
		{ responseCode: 400, sessionId: "4400" },
		{ responseCode: 401, sessionId: "4401" },
		{ responseCode: 404, sessionId: "4404" },
		{ responseCode: 409, sessionId: "4409" },
		{ responseCode: 500, sessionId: "4500" },
		{ responseCode: 503, sessionId: "4503" },
	];
	it.each(getInstructionsParams)("Yoti - expect '%i' response on GET/sessions/instructions/pdf '/sessions/%s/instructions/pdf'", async ({ responseCode, sessionId } : { responseCode: number; sessionId: string }) => {
		const response = await getYotiSessionsInstructions(sessionId);
		expect(response.status).toBe(responseCode);
	});
});