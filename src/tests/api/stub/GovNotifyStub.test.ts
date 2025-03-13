 
import govNotifyRequestDataEmail from "../../data/govNotifyStubEmailPayload.json";
import govNotifyRequestDataLetter from "../../data/govNotifyStubLetterPayload.json";

import { 
	postGovNotifyRequestEmail,
	postGovNotifyRequestLetter,
} from "../ApiTestSteps";

describe("GovNotify Stub", () => {
	const postGovNotifyParams = [
		[400],
		[403],
		[429],
		[500],
		[201],
	];

	it.each(postGovNotifyParams)("GovNotify - expect '%i' response on POST/v2/notifications/email", async (govNotifyDelimitator: number) => {
		const response = await postGovNotifyRequestEmail(govNotifyDelimitator, govNotifyRequestDataEmail);
		expect(response.status).toBe(govNotifyDelimitator);
	});

	it.each(postGovNotifyParams)("GovNotify - expect '%i' response on POST/v2/notifications/letter", async (govNotifyDelimitator: number) => {
		const response = await postGovNotifyRequestLetter(govNotifyDelimitator, govNotifyRequestDataLetter);
		expect(response.status).toBe(govNotifyDelimitator);
	});
});

