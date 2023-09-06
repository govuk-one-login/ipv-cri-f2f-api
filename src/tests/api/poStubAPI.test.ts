import poStubPayloadData from "../data/poStubPayload.json";
import { postPOCodeRequest } from "../utils/ApiTestSteps";

describe("PO Endpoint /postoffice/locations/search", () => {

	const postPOParams = [
		[400],
		[403],
		[429],
		[500],
		[200],
		[503],
	];

	it.each(postPOParams)("Post Office Stub - expect '%i' response on POST/postoffice/locations/search", async (poStubDelimitator) => {
		const response = await postPOCodeRequest(poStubDelimitator, poStubPayloadData);
	
		console.log("poStubDelimitator: "+ poStubDelimitator);

		console.log("post response: " + JSON.stringify(response.data));
	
		expect(response.status).toBe(poStubDelimitator);
	});
});
