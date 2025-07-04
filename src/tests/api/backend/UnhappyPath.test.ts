/* eslint-disable max-lines-per-function */
import { 
	sessionPost, 
	stubStartPost, 
	startStubServiceAndReturnSessionId, 
	postDocumentSelection, 
	authorizationGet, 
	startTokenPost,
	tokenPost, 
	userInfoPost, 
	sessionConfigurationGet,
	personInfoGet,
} from "../ApiTestSteps";
import f2fStubPayload from "../../data/exampleStubPayload.json";
import addressSessionPayload from "../../data/addressSessionPayload.json";
import dataDriversLicenseInvalid from "../../data/docSelectionPayloadDriversLicenceInvalid.json";
import dataPassport from "../../data/docSelectionPayloadPassportValid.json";
import dataPassportMissingFad from "../../data/dataPassportMissingFad.json";
import dataPassportBlankFad from "../../data/dataPassportBlankFad.json";
import dataPassportIncorrectFad from "../../data/dataPassportIncorrectFad.json";
import dataPassportInvalidFadFormat from "../../data/dataPassportInvalidFadFormat.json";
import { StubStartRequest, DocSelectionData } from "../types";
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

	it("Unsuccessful Request Tests - No Family Name Field", async () => {
	    const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = "";
		newf2fStubPayload.shared_claims.name[0].nameParts[2].value = "";
		const stubResponse = await stubStartPost(newf2fStubPayload);
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toBe("Unauthorized");
	});

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

	it("Unsuccessful Request Tests - Invalid Kid Test", async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		const stubResponse = await stubStartPost(newf2fStubPayload, { journeyType: 'invalidSigningKid' });
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toBe("Unauthorized");
	});

	it("Unsuccessful Request Tests - Missing Kid Test", async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		const stubResponse = await stubStartPost(newf2fStubPayload, { journeyType: 'missingSigningKid' });
		const sessionResponse = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(sessionResponse.status).toBe(401);
		expect(sessionResponse.data).toBe("Unauthorized");
	});
});

describe("/personInfo endpoint", () => {

	it("Unsuccessful Request Tests - 4XX Returned", async () => {
		const sessionId = randomUUID();
		const personInfoResponse = await personInfoGet(sessionId);
		expect(personInfoResponse.status).toBe(401);
		expect(personInfoResponse.data).toBe(`No session found with the session id: ${sessionId}`);	
	});

});

describe("/documentSelection endpoint", () => {
	it.each([
		{ yotiMockId: "0000", documentType: "UkDrivingLicence", statusCode: 400, docSelectionData: dataDriversLicenseInvalid, errorMessage: { "message": "Invalid request body" } },
		{ yotiMockId: "0102", documentType: "UkPassport", statusCode: 500, docSelectionData: dataPassportBlankFad, errorMessage: "Error generating Yoti instructions PDF" },
		{ yotiMockId: "0103", documentType: "UkPassport", statusCode: 500, docSelectionData: dataPassportIncorrectFad, errorMessage: "Error generating Yoti instructions PDF" },
		{ yotiMockId: "0104", documentType: "UkPassport", statusCode: 500, docSelectionData: dataPassportInvalidFadFormat, errorMessage: "Error generating Yoti instructions PDF" },
		{ yotiMockId: "0105", documentType: "UkPassport", statusCode: 400, docSelectionData: dataPassportMissingFad, errorMessage: { "message": "Invalid request body" } },
	])("Unsuccessful Request Tests - yotiMockId $yotiMockId  - documentType: $documentType", async ({ yotiMockId, statusCode, docSelectionData, errorMessage }: { yotiMockId: string; documentType: string; statusCode: number; docSelectionData: DocSelectionData; errorMessage: any }) => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		const response = await postDocumentSelection(docSelectionData, sessionId);
		expect(response.status).toBe(statusCode);
		expect(response.data).toStrictEqual(errorMessage);
	});

	it("Unsuccessful Request Tests - Invalid Session Id", async () => {
		const response = await postDocumentSelection(dataPassport, "sessionId");
		expect(response.status).toBe(401);
		expect(response.data).toBe("x-govuk-signin-session-id header does not contain a valid uuid");
	});

	it("Unsuccessful Request Tests - Incorrect Session Id", async () => {
		const sessionId = randomUUID();
		const response = await postDocumentSelection(dataPassport, sessionId);
		expect(response.status).toBe(400);
		expect(response.data).toBe("Missing details in SESSION or PERSON IDENTITY tables");
	});
});

describe("/token Endpoint", () => {
	let sessionId: string;
	

	beforeEach(async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = "0000";
		const { sessionId: newSessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);
		sessionId = newSessionId;
		await postDocumentSelection(dataPassport, sessionId);
	});

	it("Unsuccessful Request Tests - Invalid Kid in Token JWT", async () => {
		const authResponse = await authorizationGet(sessionId);
		const startTokenResponse = await startTokenPost({ journeyType: 'invalidSigningKid' });
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri, startTokenResponse.data);
		expect(tokenResponse.status).toBe(401);
		expect(tokenResponse.data).toBe("Unauthorized");
	});

	it("Unsuccessful Request Tests - Missing Kid in Token JWT", async () => {
		const authResponse = await authorizationGet(sessionId);
		const startTokenResponse = await startTokenPost({ journeyType: 'missingSigningKid' });
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri, startTokenResponse.data);
		expect(tokenResponse.status).toBe(401);
		expect(tokenResponse.data).toBe("Unauthorized");
	});

	it("Unsuccessful Request Tests - Request does not include client_assertion", async () => {
		const authResponse = await authorizationGet(sessionId);
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri, "");
		expect(tokenResponse.status).toBe(401);
		expect(tokenResponse.data).toBe("Invalid request: Missing client_assertion parameter");
	});

	it("Unsuccessful Request Tests - Request does not include client_assertion_type", async () => {
		const authResponse = await authorizationGet(sessionId);
		const startTokenResponse = await startTokenPost();
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri, startTokenResponse.data, " ");
		expect(tokenResponse.status).toBe(401);
		expect(tokenResponse.data).toBe("Invalid client_assertion_type parameter");
	});

});

describe("/userInfo Endpoint", () => {
	let sessionId: string;

	beforeEach(async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = "0000";
		const { sessionId: newSessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);
		sessionId = newSessionId;
	});

	it("Unsuccessful Request Tests - Invalid Signature", async () => {
		await postDocumentSelection(dataPassport, sessionId);
		const authResponse = await authorizationGet(sessionId);
		const startTokenResponse = await startTokenPost();
		await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri, startTokenResponse.data);
		const userInfoResponse = await userInfoPost("Bearer 123");

		expect(userInfoResponse.status).toBe(400);
		expect(userInfoResponse.data).toBe("Failed to Validate - Authentication header: Failed to verify signature");
	});

	it("Unsuccessful Request Tests - Invalid Authorization Header", async () => {
		await postDocumentSelection(dataPassport, sessionId);
		const authResponse = await authorizationGet(sessionId);
		const startTokenResponse = await startTokenPost();
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri, startTokenResponse.data);
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
