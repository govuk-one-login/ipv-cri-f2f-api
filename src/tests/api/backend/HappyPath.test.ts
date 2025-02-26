/* eslint-disable jest/no-commented-out-tests */
/* eslint-disable max-lines-per-function */
import {
	sessionPost,
	stubStartPost,
	postDocumentSelection,
	startStubServiceAndReturnSessionId,
	getSessionById,
	getSessionAndVerifyKey,
	authorizationGet,
	tokenPost,
	userInfoPost,
	sessionConfigurationGet,
	postAbortSession,
	getPersonIdentityRecordById,
	updateDynamoDbRecord,
	getEpochTimestampXDaysAgo,
	personInfoGet,
	personInfoKeyGet,
	validatePersonInfoResponse,
} from "../ApiTestSteps";
import { getTxmaEventsFromTestHarness, invokeLambdaFunction, validateTxMAEventData } from "../ApiUtils";
import f2fStubPayload from "../../data/exampleStubPayload.json";
import thinFilePayload from "../../data/thinFilePayload.json";
import abortPayload from "../../data/abortPayload.json";
import dataPassport from "../../data/docSelectionPayloadPassportValid.json";
import dataUkDrivingLicence from "../../data/docSelectionPayloadDriversLicenceValid.json";
import dataUkDrivingLicencePrintedLetter from "../../data/docSelectionPayloadDriversLicenceValidPrintedLetter.json";
import dataUkDrivingLicencePreferredAddress from "../../data/docSelectionPayloadDriversLicenceValidPreferredAddress.json";
import dataEuDrivingLicence from "../../data/docSelectionPayloadEuDriversLicenceValid.json";
import dataNonUkPassport from "../../data/docSelectionPayloadNonUkPassportValid.json";
import dataEeaIdCard from "../../data/docSelectionPayloadEeaIdCardValid.json";
import { constants } from "../ApiConstants";
import { DocSelectionData } from "../types";

describe("/session endpoint", () => {

	it("Successful Request Tests", async () => {
		const stubResponse = await stubStartPost(f2fStubPayload);
		const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(postRequest.status).toBe(200);
		const sessionId = postRequest.data.session_id;

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_SESSION_CREATED");

		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 1);
		validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);
	});
});

describe("/personInfo endpoint", () => {

	it("Successful Request Tests - Postal Address Found", async () => {
		const stubResponse = await stubStartPost(f2fStubPayload);
		const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		expect(postRequest.status).toBe(200);
		const sessionId = postRequest.data.session_id;

		const personInfoResponse = await personInfoGet(sessionId);
		expect(personInfoResponse.status).toBe(200);

		const personInfoKey = await personInfoKeyGet();
		const address_line1 = f2fStubPayload.shared_claims.address[0].subBuildingName + " " + f2fStubPayload.shared_claims.address[0].buildingName;
		const address_line2 = f2fStubPayload.shared_claims.address[0].buildingNumber + " " + f2fStubPayload.shared_claims.address[0].streetName;
		const town_city = f2fStubPayload.shared_claims.address[0].addressLocality;
		const postalCode = f2fStubPayload.shared_claims.address[0].postalCode;

		validatePersonInfoResponse(personInfoKey.data.key, personInfoResponse.data, address_line1, address_line2, town_city, postalCode);
	});

});

describe("/documentSelection Endpoint", () => {
	it.each([
		{ yotiMockId: "0000", docSelectionData: dataUkDrivingLicence, yotiStartSchema: "F2F_YOTI_START_00_SCHEMA" },
		{ yotiMockId: "0100", docSelectionData: dataPassport, yotiStartSchema: "F2F_YOTI_START_SCHEMA" },
		{ yotiMockId: "0200", docSelectionData: dataNonUkPassport, yotiStartSchema: "F2F_YOTI_START_SCHEMA" },
		{ yotiMockId: "0400", docSelectionData: dataEuDrivingLicence, yotiStartSchema: "F2F_YOTI_START_00_SCHEMA" },
		{ yotiMockId: "0500", docSelectionData: dataEeaIdCard, yotiStartSchema: "F2F_YOTI_START_05_SCHEMA" },
	])("Successful Request Tests - $yotiMockId", async ({ yotiMockId, docSelectionData, yotiStartSchema }: { yotiMockId: string; docSelectionData: DocSelectionData; yotiStartSchema: string }) => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		await postDocumentSelection(docSelectionData, sessionId);

		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		expect(session?.authSessionState).toBe("F2F_YOTI_SESSION_CREATED");

		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 3);
		validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_START", schemaName: yotiStartSchema }, allTxmaEventBodies);
		if (!constants.THIRD_PARTY_CLIENT_ID) {
			validateTxMAEventData({ eventName: "F2F_YOTI_PDF_EMAILED", schemaName: "F2F_YOTI_PDF_EMAILED_SCHEMA" }, allTxmaEventBodies);
			// eslint-disable-next-line jest/no-conditional-expect
			expect(session?.yotiSessionId).toContain(yotiMockId);
		}
	});

	it("Successful Request Tests - Validate Session Expiry is Updated after Document Selection", async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = "0000";
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		const initinalSessionRecord = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const initinalYotiSessionExpiry = initinalSessionRecord?.expiryDate;

		await new Promise(res => setTimeout(res, 5000));

		const response = await postDocumentSelection(dataUkDrivingLicence, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Instructions PDF Generated");

		const updatedSessionRecord = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const updatedYotiSessionExpiry: any = updatedSessionRecord?.expiryDate;

		expect(Number(updatedYotiSessionExpiry)).toBeGreaterThan(Number(initinalYotiSessionExpiry));
	});

	it.each([
		{ buildingNumber: "32", buildingName: "", subBuildingName: "" },
		{ buildingNumber: "", buildingName: "19 A", subBuildingName: "" },
		{ buildingNumber: "", buildingName: "", subBuildingName: "Flat 5" },
		{ buildingNumber: "", buildingName: "19 A", subBuildingName: "Flat 5" },
	])("Successful Request Tests - $yotiMockId", async ({ buildingNumber, buildingName, subBuildingName }: { buildingNumber: string; buildingName: string; subBuildingName: string }) => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.shared_claims.address[0].buildingNumber = buildingNumber;
		newf2fStubPayload.shared_claims.address[0].buildingName = buildingName;
		newf2fStubPayload.shared_claims.address[0].subBuildingName = subBuildingName;
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		const response = await postDocumentSelection(dataUkDrivingLicence, sessionId);
		expect(response.status).toBe(200);

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_YOTI_SESSION_CREATED");

		const personIdentityRecord = await getPersonIdentityRecordById(sessionId, constants.DEV_F2F_PERSON_IDENTITY_TABLE_NAME);
		try {
			expect(personIdentityRecord?.pdfPreference).toBe(dataUkDrivingLicence.pdf_preference);
		} catch (error) {
			console.error("Error validating PDF Preference from Person Identity Table", error);
			throw error;
		}
	});

	it.each([
		{ docSelectionData: dataUkDrivingLicencePrintedLetter },
	])("Successful Request Tests - $PrintedLetter", async ({ docSelectionData }) => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);


		const postResponse = await postDocumentSelection(docSelectionData, sessionId);
		expect(postResponse.status).toBe(200);

		const personIdentityRecord = await getPersonIdentityRecordById(sessionId, constants.DEV_F2F_PERSON_IDENTITY_TABLE_NAME);
		expect(personIdentityRecord?.pdfPreference).toBe(docSelectionData.pdf_preference);
		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 4);
		validateTxMAEventData({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", schemaName: "F2F_YOTI_PDF_LETTER_POSTED_SCHEMA" }, allTxmaEventBodies);

	});

	it.each([
		{ docSelectionData: dataUkDrivingLicencePreferredAddress },
	])("Successful Request Tests - $PreferredAddress", async ({ docSelectionData }) => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);


		const docSelect = structuredClone(docSelectionData);
		docSelect.postal_address.preferredAddress = true;
		const postResponse = await postDocumentSelection(docSelectionData, sessionId);
		expect(postResponse.status).toBe(200);

		const personIdentityRecord = await getPersonIdentityRecordById(sessionId, constants.DEV_F2F_PERSON_IDENTITY_TABLE_NAME);

		expect(personIdentityRecord?.pdfPreference).toBe(docSelectionData.pdf_preference);
		const preferredAddress = personIdentityRecord?.addresses?.find(address => address.preferredAddress);
		expect(preferredAddress).toBeDefined();
		expect(preferredAddress?.postalCode).toBe(docSelectionData.postal_address.postalCode);
		expect(preferredAddress?.preferredAddress).toBe(true);

		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 4);
		validateTxMAEventData({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", schemaName: "F2F_YOTI_PDF_LETTER_POSTED_SCHEMA" }, allTxmaEventBodies);

	});
});


describe("/authorization endpoint", () => {
	it.each([
		{ yotiMockId: "0000", docSelectionData: dataUkDrivingLicence, yotiStartSchema: "F2F_YOTI_START_00_SCHEMA" },
		{ yotiMockId: "0100", docSelectionData: dataPassport, yotiStartSchema: "F2F_YOTI_START_SCHEMA" },
		{ yotiMockId: "0200", docSelectionData: dataNonUkPassport, yotiStartSchema: "F2F_YOTI_START_SCHEMA" },
		{ yotiMockId: "0400", docSelectionData: dataEuDrivingLicence, yotiStartSchema: "F2F_YOTI_START_00_SCHEMA" },
		{ yotiMockId: "0500", docSelectionData: dataEeaIdCard, yotiStartSchema: "F2F_YOTI_START_05_SCHEMA" },
	])("Successful Request Tests - $yotiMockId", async ({ yotiMockId, docSelectionData, yotiStartSchema }: { yotiMockId: string; docSelectionData: DocSelectionData; yotiStartSchema: string }) => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		await postDocumentSelection(docSelectionData, sessionId);

		const authResponse = await authorizationGet(sessionId);
		expect(authResponse.status).toBe(200);

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_AUTH_CODE_ISSUED");

		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 5);
		validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_START", schemaName: yotiStartSchema }, allTxmaEventBodies);
		if (!constants.THIRD_PARTY_CLIENT_ID) {
			validateTxMAEventData({ eventName: "F2F_YOTI_PDF_EMAILED", schemaName: "F2F_YOTI_PDF_EMAILED_SCHEMA" }, allTxmaEventBodies);
		}
		validateTxMAEventData({ eventName: "F2F_CRI_AUTH_CODE_ISSUED", schemaName: "F2F_CRI_AUTH_CODE_ISSUED_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_CRI_END", schemaName: "F2F_CRI_END_SCHEMA" }, allTxmaEventBodies);
	});
});

describe("/token endpoint", () => {
	it.each([
		{ yotiMockId: "0000", docSelectionData: dataUkDrivingLicence },
		{ yotiMockId: "0100", docSelectionData: dataPassport },
		{ yotiMockId: "0200", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0400", docSelectionData: dataEuDrivingLicence },
		{ yotiMockId: "0500", docSelectionData: dataEeaIdCard },
	])("Successful Request Tests - $yotiMockId", async ({ yotiMockId, docSelectionData }: { yotiMockId: string; docSelectionData: DocSelectionData }) => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		await postDocumentSelection(docSelectionData, sessionId);

		const authResponse = await authorizationGet(sessionId);

		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri);
		expect(tokenResponse.status).toBe(200);


		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_ACCESS_TOKEN_ISSUED");
	});
});

describe("/userinfo endpoint", () => {
	it.each([
		{ yotiMockId: "0000", docSelectionData: dataUkDrivingLicence },
		{ yotiMockId: "0100", docSelectionData: dataPassport },
		{ yotiMockId: "0200", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0400", docSelectionData: dataEuDrivingLicence },
		{ yotiMockId: "0500", docSelectionData: dataEeaIdCard },
	])("Successful Request Tests - $yotiMockId", async ({ yotiMockId, docSelectionData }: { yotiMockId: string; docSelectionData: DocSelectionData }) => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = yotiMockId;
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		await postDocumentSelection(docSelectionData, sessionId);

		const authResponse = await authorizationGet(sessionId);

		const tokenResponse = await tokenPost(authResponse.data.authorizationCode.value, authResponse.data.redirect_uri);

		const userInfoResponse = await userInfoPost("Bearer " + tokenResponse.data.access_token);
		expect(userInfoResponse.status).toBe(202);

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_ACCESS_TOKEN_ISSUED");
	});
});

describe("/sessionConfiguration endpoint", () => {
	it("Successful Request Tests - Evidence Object Returned", async () => {
		const strengthScore = Math.floor(Math.random() * 5);
		thinFilePayload.evidence_requested.strengthScore = strengthScore;
		const { sessionId } = await startStubServiceAndReturnSessionId(thinFilePayload);
		const sessionConfigurationResponse = await sessionConfigurationGet(sessionId);

		expect(sessionConfigurationResponse.status).toBe(200);
		expect(sessionConfigurationResponse.data).toHaveProperty("pcl_enabled");
		expect(sessionConfigurationResponse.data.evidence_requested.strengthScore).toEqual(strengthScore);
	});

	it("Successful Request Tests - Evidence Object Not Returned", async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = "0000";
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		const sessionConfigurationResponse = await sessionConfigurationGet(sessionId);

		expect(sessionConfigurationResponse.status).toBe(200);
		expect(sessionConfigurationResponse.data).not.toHaveProperty("evidence_requested");
	});
});

describe("/abort endpoint", () => {
	let sessionId: string;

	beforeEach(async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload);
		newf2fStubPayload.yotiMockID = "0000";
		const { sessionId: newSessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);
		sessionId = newSessionId;
	});

	it("Successful Request Tests - Abort Session", async () => {
		const response = await postAbortSession(abortPayload, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Session has been aborted");

		const url = new URL(decodeURIComponent(response.headers.location));
		expect(url.searchParams.has("error")).toBe(true);
		expect(url.searchParams.has("state")).toBe(true);
		expect(url.searchParams.get("error")).toBe("access_denied");

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_CRI_SESSION_ABORTED");
		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "state", "" + url.searchParams.get("state"));

		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 2);
		validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_CRI_SESSION_ABORTED", schemaName: "F2F_CRI_SESSION_ABORTED_SCHEMA" }, allTxmaEventBodies);
	});

	it("Successful Request Tests - Abort Previously Aborted Session", async () => {
		const postDocumentSelectionResponse = await postDocumentSelection(dataPassport, sessionId);
		expect(postDocumentSelectionResponse.status).toBe(200);

		const response = await postAbortSession(abortPayload, sessionId);
		expect(response.status).toBe(200);
		expect(response.data).toBe("Session has been aborted");

		const url = new URL(decodeURIComponent(response.headers.location));
		expect(url.searchParams.has("error")).toBe(true);
		expect(url.searchParams.has("state")).toBe(true);
		expect(url.searchParams.get("error")).toBe("access_denied");

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_CRI_SESSION_ABORTED");

		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 3);

		validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_START", schemaName: "F2F_YOTI_START_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_CRI_SESSION_ABORTED", schemaName: "F2F_CRI_SESSION_ABORTED_SCHEMA" }, allTxmaEventBodies);

		expect(response.headers).toBeTruthy();
		expect(response.headers.location).toBeTruthy();

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "state", "" + url.searchParams.get("state"));

	});
});

describe("Expired User Sessions", () => {

	it("Session is Expired and Expired Notification Flag Updated", async () => {
		const stubResponse = await stubStartPost(f2fStubPayload);
		const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		const sessionId = postRequest.data.session_id;
		console.log(sessionId);
		await postDocumentSelection(dataUkDrivingLicence, sessionId);

		const newCreatedDateTimestamp = getEpochTimestampXDaysAgo(22);
		await updateDynamoDbRecord(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "createdDate", newCreatedDateTimestamp, "N");
		await invokeLambdaFunction(constants.DEV_EXPIRED_SESSIONS_LAMBDA_NAME, {});

		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "authSessionState", "F2F_SESSION_EXPIRED");
		await getSessionAndVerifyKey(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME, "expiredNotificationSent", true);
	});
});
