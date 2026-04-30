import {
	postDocumentSelection,
	startStubServiceAndReturnSessionId,
	getSessionById,
	getSessionAndVerifyKey,
	authorizationGet,
	startTokenPost,
	tokenPost,
	userInfoPost,
} from "../ApiTestSteps";
import { getTxmaEventsFromTestHarness, validateTxMAEventData } from "../ApiUtils";
import f2fStubPayload from "../../data/exampleStubPayload.json";
import dataUkDrivingLicence from "../../data/docSelectionPayloadDriversLicenceValid.json";
import { constants } from "../ApiConstants";

//QualityGateIntegrationTest 
//QualityGateStackTest
describe("/documentSelection Endpoint", () => {

	it("Successful Request Tests - authSessionState validation yotiMockId: 1601 - documentType: UkDrivingLicence with retry", async () => {
        const yotiMockId = "1601";
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		await postDocumentSelection(dataUkDrivingLicence, sessionId, 200);

		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		expect(session?.authSessionState).toBe("F2F_YOTI_SESSION_CREATED");

		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 3);
		validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_START", schemaName: "F2F_YOTI_START_00_SCHEMA" }, allTxmaEventBodies);
		if (!constants.THIRD_PARTY_CLIENT_ID) {
			validateTxMAEventData({ eventName: "F2F_YOTI_PDF_EMAILED", schemaName: "F2F_YOTI_PDF_EMAILED_SCHEMA" }, allTxmaEventBodies);
			
			expect(session?.yotiSessionId).toContain(yotiMockId);
		}
	});
});


describe("/authorization endpoint", () => {
	it("Successful Request Tests - authSessionState validation yotiMockId: 1601 - documentType: UkDrivingLicence with retry", async () => {
        const yotiMockId = "1601";
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		await postDocumentSelection(dataUkDrivingLicence, sessionId, 200);

		const authResponse = await authorizationGet(sessionId, 200);
		expect(authResponse.status).toBe(200);

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_AUTH_CODE_ISSUED");

		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 5);
		validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_START", schemaName: "F2F_YOTI_START_00_SCHEMA" }, allTxmaEventBodies);
		if (!constants.THIRD_PARTY_CLIENT_ID) {
			validateTxMAEventData({ eventName: "F2F_YOTI_PDF_EMAILED", schemaName: "F2F_YOTI_PDF_EMAILED_SCHEMA" }, allTxmaEventBodies);
		}
		validateTxMAEventData({ eventName: "F2F_CRI_AUTH_CODE_ISSUED", schemaName: "F2F_CRI_AUTH_CODE_ISSUED_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_CRI_END", schemaName: "F2F_CRI_END_SCHEMA" }, allTxmaEventBodies);
	});
});

describe("/token endpoint", () => {
	it("Successful Request Tests - authSessionState validation yotiMockId: 1601 - documentType: UkDrivingLicence with retry", async () => {
        const yotiMockId = "1601";
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		await postDocumentSelection(dataUkDrivingLicence, sessionId, 200);

		const authResponse = await authorizationGet(sessionId, 200);
		const startTokenResponse = await startTokenPost();
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri, startTokenResponse.data, undefined, 200);
		expect(tokenResponse.status).toBe(200);


		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_ACCESS_TOKEN_ISSUED");
	});
});

describe("/userinfo endpoint", () => {
	it.only("Successful Request Tests - authSessionState validation yotiMockId: 1601 - documentType: UkDrivingLicence with retry", async () => {
        const yotiMockId = "1601";
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		await postDocumentSelection(dataUkDrivingLicence, sessionId, 200);

		const authResponse = await authorizationGet(sessionId, 200);

		const startTokenResponse = await startTokenPost();
		
		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri, startTokenResponse.data, undefined, 200);

		const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(202);

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_ACCESS_TOKEN_ISSUED");
	});
});
