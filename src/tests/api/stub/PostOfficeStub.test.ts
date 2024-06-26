/* eslint-disable max-lines-per-function */
import poStubPayloadData from "../../data/poStubPayload.json";
import { 
	postPOCodeRequest, 
} from "../ApiTestSteps";
import { POST_OFFICE_RESPONSE_INCOMPLETE_DATA } from "../../../../post-office-stub/src/data/postOfficeResponse/postOfficeResponseIncompleteData";


describe("Post Office Stub", () => {
	const postPOParams = [
		["400"],
		["403"],
		["429"],
		["500"],
		["200"],
		["503"],
	];

	it.each(postPOParams)("Post Office Stub - expect '%i' response on POST/postoffice/locations/search", async (poStubDelimitator: string) => {
		const response = await postPOCodeRequest(poStubDelimitator, poStubPayloadData);
		expect(response.status).toBe(Number(poStubDelimitator));
	});

	it("returns 400 and the missing name error object when MNE fed as last 3 chars", async () => {
		const response = await postPOCodeRequest("MNE", poStubPayloadData);
		expect(response.status).toBe(400);
		expect(response.data).toEqual(POST_OFFICE_RESPONSE_INCOMPLETE_DATA);
	});
});

