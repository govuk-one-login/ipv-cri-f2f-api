import { sessionPost, stubStartPost, startStubServiceAndReturnSessionId, postDocumentSelection, authorizationGet, tokenPost, userInfoPost, sessionConfigurationGet } from "./ApiTestSteps";
import f2fStubPayload from "../data/exampleStubPayload.json";
import addressSessionPayload from "../data/addressSessionPayload.json";
import dataDriversLicenseInvalid from "../data/docSelectionPayloadDriversLicenceInvalid.json";
import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataPassportMissingFad from "../data/dataPassportMissingFad.json";
import dataPassportBlankFad from "../data/dataPassportBlankFad.json";
import dataPassportIncorrectFad from "../data/dataPassportIncorrectFad.json";
import dataPassportInvalidFadFormat from "../data/dataPassportInvalidFadFormat.json";
import { StubStartRequest, DocSelectionData } from "./types";
import { randomUUID } from "crypto";


describe("/session endpoint", () => {

	it("Unsuccessful Request Tests - No Given Name Field", async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.shared_claims.name[0].nameParts[0].value = "";
		newf2fStubPayload.shared_claims.name[0].nameParts[1].value = "";
		const stubResponse = await stubStartPost(newf2fStubPayload);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toBe("Unauthorized");
	});

	// KIWI-1750: calls to /session returning 200 status code when Family Name is missing in shared_claims payload
	// it("Unsuccessful Request Tests - No Family Name Field", async () => {
	//     const newf2fStubPayload = structuredClone(f2fStubPayload);
	// 	newf2fStubPayload.shared_claims.name[0].nameParts[2].value = "";
	//     console.log(JSON.stringify(newf2fStubPayload));
	// 	const stubResponse = await stubStartPost(newf2fStubPayload);
	// 	const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
	// 	expect(sessionResponse.status).toBe(401);
	// 	expect(sessionResponse.data).toBe("Unauthorized");
	// });

	it("Unsuccessful Request Tests - No Email Address", async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.shared_claims.emailAddress = "";
		const stubResponse = await stubStartPost(newf2fStubPayload);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toBe("Unauthorized");
	});

	it("Unsuccessful Request Tests - Incorrect Country Code", async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.shared_claims.address[0].addressCountry = "XY";
		const stubResponse = await stubStartPost(newf2fStubPayload);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toBe("Unauthorized");
	});

	it("Unsuccessful Request Tests - Incorrect Address Format", async () => {
		const stubResponse = await stubStartPost(addressSessionPayload as StubStartRequest);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toBe("Unauthorized");
	});
});

describe("/documentSelection endpoint", () => {
	it.each([
		{ yotiMockId: "0000", statusCode: 400, docSelectionData: dataDriversLicenseInvalid, errorMessage: { "message": "Invalid request body" } },
		{ yotiMockId: "0102", statusCode: 500, docSelectionData: dataPassportBlankFad, errorMessage: "Error generating Yoti instructions PDF" },
		{ yotiMockId: "0103", statusCode: 500, docSelectionData: dataPassportIncorrectFad, errorMessage: "Error generating Yoti instructions PDF" },
		{ yotiMockId: "0104", statusCode: 500, docSelectionData: dataPassportInvalidFadFormat, errorMessage: "Error generating Yoti instructions PDF" },
		{ yotiMockId: "0105", statusCode: 400, docSelectionData: dataPassportMissingFad, errorMessage: { "message": "Invalid request body" } },
	])("Unsuccessful Request Tests - yotiMockId $yotiMockId", async ({ yotiMockId, statusCode, docSelectionData, errorMessage }: { yotiMockId: string; statusCode: number; docSelectionData: DocSelectionData; errorMessage: any }) => {
		f2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId } = await startStubServiceAndReturnSessionId(f2fStubPayload);

		const response = await postDocumentSelection(docSelectionData, sessionId);
		expect(response.status).toBe(statusCode);
		expect(response.data).toStrictEqual(errorMessage);
	});

	it("Unsuccessful Request Tests - Incorrect Session Id", async () => {
		const response = await postDocumentSelection(dataPassport, "sessionId");
		expect(response.status).toBe(401);
		expect(response.data).toBe("Unauthorized");
	});
});

describe("/userInfo Endpoint", () => {
	let sessionId: string;

	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
		const { sessionId: newSessionId } = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = newSessionId;
	});

	it("Unsuccessful Request Tests - Invalid Signature", async () => {
		await postDocumentSelection(dataPassport, sessionId);
		const authResponse = await authorizationGet(sessionId);
		await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		const userInfoResponse = await userInfoPost("Bearer 123");

		expect(userInfoResponse.status).toBe(400);
		expect(userInfoResponse.data).toBe("Failed to Validate - Authentication header: Failed to verify signature");
	});

	it("Unsuccessful Request Tests - Invalid Authorization Header", async () => {
		await postDocumentSelection(dataPassport, sessionId);
		const authResponse = await authorizationGet(sessionId);
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		const userInfoResponse = await userInfoPost(tokenResponse.data.access_token);

		expect(userInfoResponse.status).toBe(400);
		expect(userInfoResponse.data).toBe("Failed to Validate - Authentication header: Missing header: Authorization header is not of Bearer type access_token");
	});
});

describe("/sessionConfiguration endpoint", () => {

	it("Unsuccessful Request Tests - Invalid Session", async () => {
	    const sessionId = randomUUID();
	    const sessionConfigurationResponse = await sessionConfigurationGet(sessionId);

	    expect(sessionConfigurationResponse.status).toBe(401);
	    expect(sessionConfigurationResponse.data).toBe("No session found with the session id: " + sessionId);
	});
});
