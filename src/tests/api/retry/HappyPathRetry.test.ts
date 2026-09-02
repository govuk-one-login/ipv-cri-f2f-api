import dataUkDrivingLicence from "../../data/docSelectionPayloadDriversLicenceValid.json";
import f2fStubPayload from "../../data/exampleStubPayload.json";
import {
	authorizationGet,
	getSessionAndVerifyKey,
	postDocumentSelection,
	startStubServiceAndReturnSessionId,
	startTokenPost,
	tokenPost,
	userInfoPost,
} from "../ApiTestSteps";
import { constants } from "../ApiConstants";

//QualityGateIntegrationTest
//QualityGateStackTest
describe("/userinfo endpoint", () => {
	it("Successful Request Tests - authSessionState validation yotiMockId: '1601' - documentType: 'UkDrivingLicence'", async () => {
		const payload = structuredClone(f2fStubPayload);
		payload.yotiMockID = "1601";
		const { sessionId } = await startStubServiceAndReturnSessionId(payload);

		await postDocumentSelection(dataUkDrivingLicence, sessionId, 200);

		const authResponse = await authorizationGet(sessionId, 200);
		const startTokenResponse = await startTokenPost();
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri, startTokenResponse.data, undefined, 200);
		const userInfoResponse = await userInfoPost(`Bearer ${tokenResponse.data.access_token}`);
		expect(userInfoResponse.status).toBe(202);

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_ACCESS_TOKEN_ISSUED");
	});
});
