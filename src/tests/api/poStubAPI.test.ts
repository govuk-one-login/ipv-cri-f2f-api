import poStubPayloadData from "../data/poStubPayload.json";
import { postPOCodeRequest } from "./ApiTestSteps";

describe("PO Endpoint /postoffice/locations/search", () => {
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
});
