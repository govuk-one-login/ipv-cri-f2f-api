import { sessionPost, stubStartPost } from "./ApiTestSteps";
import f2fStubPayload from "../data/exampleStubPayload.json";
import addressSessionPayload from "../data/addressSessionPayload.json";
import exampleStubPayload from "../data/exampleStubPayload.json";

describe("Address fields tests", () => {
	beforeEach(() => {
		f2fStubPayload.yotiMockID = "0000";
		f2fStubPayload.shared_claims.address[0].uprn = "123456789";
		f2fStubPayload.shared_claims.address[0].addressLocality = "Sidney";
		f2fStubPayload.shared_claims.address[0].postalCode = "F1 1SH";
		f2fStubPayload.shared_claims.address[0].streetName = "Wallaby Way";
	});

	it("Correct address format", async () => {
		console.log(JSON.stringify(exampleStubPayload));
		const stubResponse = await stubStartPost(exampleStubPayload);
		const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(postRequest.status).toBe(200);
	});

	it("country is not GB", async () => {
		f2fStubPayload.shared_claims.address[0].addressCountry = "XY";
		console.log(JSON.stringify(f2fStubPayload));
		const stubResponse = await stubStartPost(f2fStubPayload);
		const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(postRequest.status).toBe(401);
	});

	it("Incorrect address format", async () => {
		console.log(JSON.stringify(addressSessionPayload));
		const stubResponse = await stubStartPost(addressSessionPayload);
		const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(postRequest.status).toBe(401);
	});
});
