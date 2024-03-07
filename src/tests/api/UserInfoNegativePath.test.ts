import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import { postDocumentSelection, startStubServiceAndReturnSessionId, authorizationGet, tokenPost, userInfoPost } from "./ApiTestSteps";
import f2fStubPayload from "../data/exampleStubPayload.json";

describe("Negative Path /userInfo Endpoint", () => {
	let sessionId: string;

	beforeEach(async () => {
		f2fStubPayload.yotiMockID = "0000";
		const { sessionId: newSessionId } = await startStubServiceAndReturnSessionId(f2fStubPayload);
		sessionId = newSessionId;
		console.log("session id: " + sessionId);
	});

	it("Negative Path Journey - Invalid Signature", async () => {
		await postDocumentSelection(dataPassport, sessionId);
		const authResponse = await authorizationGet(sessionId);
		await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		const userInfoResponse = await userInfoPost("Bearer 123");

		expect(userInfoResponse.status).toBe(400);
		expect(userInfoResponse.data).toBe("Failed to Validate - Authentication header: Failed to verify signature");
	});

	it("Negative Path Journey - Invalid Authorization Header", async () => {
		await postDocumentSelection(dataPassport, sessionId);
		const authResponse = await authorizationGet(sessionId);
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri );
		const userInfoResponse = await userInfoPost(tokenResponse.data.access_token);

		expect(userInfoResponse.status).toBe(400);
		expect(userInfoResponse.data).toBe("Failed to Validate - Authentication header: Missing header: Authorization header is not of Bearer type access_token");
	});
});
