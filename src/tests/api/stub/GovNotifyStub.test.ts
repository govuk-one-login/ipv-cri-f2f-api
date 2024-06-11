/* eslint-disable max-lines-per-function */
import govNotifyRequestData from "../../data/govNotifyStubPayload.json";

import { 
	postGovNotifyRequest, 
} from "./ApiTestSteps";

describe("GovNotify Stub", () => {
	const postGovNotifyParams = [
		[400],
		[403],
		[429],
		[500],
		[201],
	];
	it.each(postGovNotifyParams)("GovNotify - expect '%i' response on POST/v2/notifications/email", async (govNotifyDelimitator: number) => {
		const response = await postGovNotifyRequest(govNotifyDelimitator, govNotifyRequestData);
		expect(response.status).toBe(govNotifyDelimitator);
	});
});


