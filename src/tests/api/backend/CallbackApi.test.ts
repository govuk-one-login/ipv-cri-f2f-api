/* eslint-disable max-lines-per-function */
import dataPassport from "../../data/docSelectionPayloadPassportValid.json";
import dataUkDrivingLicence from "../../data/docSelectionPayloadDriversLicenceValid.json";
import dataEuDrivingLicence from "../../data/docSelectionPayloadEuDriversLicenceValid.json";
import dataNonUkPassport from "../../data/docSelectionPayloadNonUkPassportValid.json";
import dataEeaIdCard from "../../data/docSelectionPayloadEeaIdCardValid.json";
import f2fStubPayload from "../../data/exampleStubPayload.json";
import vcResponseData from "../../data/vcValidationData.json";
import {
	startStubServiceAndReturnSessionId,
	validateJwtToken,
	getDequeuedSqsMessage,
	initiateUserInfo,
	getSessionById,
	callbackPost,
	validateJwtTokenNamePart,
} from "../ApiTestSteps";
import "dotenv/config";
import { constants } from "../ApiConstants";
import { getTxmaEventsFromTestHarness, validateTxMAEventData } from "../ApiUtils";
import { DocSelectionData } from "../types";

describe("/callback endpoint", () => {
	jest.setTimeout(60000);

	it.each([
		{ yotiMockId: "0000", documentType: "UkDrivingLicence", docSelectionData: dataUkDrivingLicence },
		{ yotiMockId: "0001", documentType: "UkDrivingLicence", docSelectionData: dataUkDrivingLicence },
		{ yotiMockId: "0003", documentType: "UkDrivingLicence", docSelectionData: dataUkDrivingLicence },
		{ yotiMockId: "0101", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0102", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0103", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0108", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0109", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0110", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0111", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0112", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0113", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0114", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0115", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0116", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0117", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0118", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0119", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0120", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0121", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0122", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0123", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0124", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0125", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0133", documentType: "UkPassport", docSelectionData: dataPassport },
		{ yotiMockId: "0200", documentType: "NonUkPassport", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0201", documentType: "NonUkPassport", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0202", documentType: "NonUkPassport", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0203", documentType: "NonUkPassport", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0204", documentType: "NonUkPassport", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0400", documentType: "EuDrivingLicence", docSelectionData: dataEuDrivingLicence },
		{ yotiMockId: "0401", documentType: "EuDrivingLicence", docSelectionData: dataEuDrivingLicence },
		{ yotiMockId: "0500", documentType: "EeaIdCard", docSelectionData: dataEeaIdCard },
		{ yotiMockId: "0501", documentType: "EeaIdCard", docSelectionData: dataEeaIdCard },
		{ yotiMockId: "0502", documentType: "EeaIdCard", docSelectionData: dataEeaIdCard },
		{ yotiMockId: "0503", documentType: "EeaIdCard", docSelectionData: dataEeaIdCard },
	])("F2F CRI Callback Endpoint - Verified Credential validation for yotiMockId: $yotiMockId - documentType: $documentType", async ({ yotiMockId, docSelectionData }: { yotiMockId: string; documentType: string; docSelectionData: DocSelectionData }) => {
		f2fStubPayload.yotiMockID = yotiMockId;

		const { sessionId, sub } = await startStubServiceAndReturnSessionId(f2fStubPayload);

		await initiateUserInfo(docSelectionData, sessionId);

		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId = session?.yotiSessionId;
		expect(yotiSessionId).toBeTruthy();
	
		await callbackPost(yotiSessionId);

		let sqsMessage;
		let i = 0;
		do {
			sqsMessage = await getDequeuedSqsMessage(sub);
			i++;
		} while (i < 10 && !sqsMessage);

		const jwtToken = sqsMessage["https://vocab.account.gov.uk/v1/credentialJWT"][0];
		await validateJwtToken(jwtToken, vcResponseData, yotiMockId);
	}, 20000);

	describe("Verifiable Credential Error", () => {
		it.each([
			{ yotiMockId: "0134", vcError: "VC generation failed : Multiple document_fields in response" },
			{ yotiMockId: "0160", vcError: "VC generation failed : Yoti document_fields not populated" },
		])("yotiMockId: $yotiMockId'", async ({ yotiMockId, vcError }: { yotiMockId: string; vcError: string }) => {
			f2fStubPayload.yotiMockID = yotiMockId;
			const { sessionId, sub } = await startStubServiceAndReturnSessionId(f2fStubPayload);

			await initiateUserInfo(dataNonUkPassport, sessionId);

			const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
			const yotiSessionId = session?.yotiSessionId;
			expect(yotiSessionId).toBeTruthy();
		
			await callbackPost(yotiSessionId);
	
			let sqsMessage;
			let i = 0;
			do {
				sqsMessage = await getDequeuedSqsMessage(sub);
				i++;
			} while (i < 10 && !sqsMessage);
	
			expect(sqsMessage?.error_description).toBe(vcError);
		}, 20000);
	});

	it.each([
		{ yotiMockId:"0150", docSelectionData: dataPassport, givenName1: "FRANK", givenName2: "JACOB", givenName3: "JAMES", familyName: "SMITH" },
		{ yotiMockId:"0151", docSelectionData: dataPassport, givenName1: "FRANK", givenName2: "JACOB", givenName3: "JAMES", familyName: "SMITH" },
		{ yotiMockId:"0152", docSelectionData: dataPassport, givenName1: "FRANK", givenName2: "JACOB", givenName3: "JAMES", familyName: "SMITH" },
		{ yotiMockId:"0402", docSelectionData: dataEuDrivingLicence, givenName1: "FREDERICK", givenName2: "SMITH", givenName3: "JON", familyName: "FLINTSTONE" },
		{ yotiMockId:"0206", docSelectionData: dataNonUkPassport, givenName1: "FREDERICK", givenName2: "JON", givenName3: "De", familyName: "FLINTSTONE" },

	])("Multiple given Names in Yoti Response - yotiMockId $yotiMockId - Full Name: $givenName1 $givenName2 $givenName3 $familyName", async (
		{ yotiMockId, docSelectionData, givenName1, givenName2, givenName3, familyName }:
		// eslint-disable-next-line max-len
		{ yotiMockId: string; docSelectionData: DocSelectionData; givenName1: string; givenName2: string; givenName3: string; familyName: string },
	) => {
		f2fStubPayload.yotiMockID = yotiMockId;
		f2fStubPayload.shared_claims.name[0].nameParts[0].value = givenName1;
		f2fStubPayload.shared_claims.name[0].nameParts[1].value = givenName2 + " " + givenName3;
		f2fStubPayload.shared_claims.name[0].nameParts[2].value = familyName;
		
		const { sessionId, sub } = await startStubServiceAndReturnSessionId(f2fStubPayload);

		await initiateUserInfo(docSelectionData, sessionId);

		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId = session?.yotiSessionId;
		expect(yotiSessionId).toBeTruthy();
	
		await callbackPost(yotiSessionId);

		let sqsMessage;
		let i = 0;
		do {
			sqsMessage = await getDequeuedSqsMessage(sub);
			i++;
		} while (i < 10 && !sqsMessage);

		const jwtToken = sqsMessage["https://vocab.account.gov.uk/v1/credentialJWT"][0];
		validateJwtTokenNamePart(jwtToken, givenName1, givenName2, givenName3, familyName + yotiMockId);
	}, 20000);

	it.each([
		{ yotiMockId: "0000", documentType: "UkDrivingLicence", docSelectionData: dataUkDrivingLicence, yotiStartSchema: "F2F_YOTI_START_00_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_SCHEMA" },
		{ yotiMockId: "0101", documentType: "UkPassport", docSelectionData: dataPassport, yotiStartSchema: "F2F_YOTI_START_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_01_SCHEMA" },
		{ yotiMockId: "0200", documentType: "NonUkPassport", docSelectionData: dataNonUkPassport, yotiStartSchema: "F2F_YOTI_START_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_01_SCHEMA" },
		{ yotiMockId: "0400", documentType: "EuDrivingLicence", docSelectionData: dataEuDrivingLicence, yotiStartSchema: "F2F_YOTI_START_00_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_04_SCHEMA" },
		{ yotiMockId: "0500", documentType: "EeaIdCard", docSelectionData: dataEeaIdCard, yotiStartSchema: "F2F_YOTI_START_05_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_05_SCHEMA" },
	])("E2E Journey with Callback and TxMA event Validation for yotiMockID: $yotiMockId - documentType: $documentType", async ({ yotiMockId, docSelectionData, yotiStartSchema, vcIssuedSchema }: { yotiMockId: string; documentType: string; docSelectionData: DocSelectionData; yotiStartSchema: string; vcIssuedSchema: string }) => {
		f2fStubPayload.yotiMockID = yotiMockId;
		
		const { sessionId } = await startStubServiceAndReturnSessionId(f2fStubPayload);

		await initiateUserInfo(docSelectionData, sessionId);

		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId = session?.yotiSessionId;
		expect(yotiSessionId).toBeTruthy();

		await callbackPost(yotiSessionId);

		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 7);
		validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_START", schemaName: yotiStartSchema }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_CRI_AUTH_CODE_ISSUED", schemaName: "F2F_CRI_AUTH_CODE_ISSUED_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_CRI_END", schemaName: "F2F_CRI_END_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_PDF_EMAILED", schemaName: "F2F_YOTI_PDF_EMAILED_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_RESPONSE_RECEIVED", schemaName: "F2F_YOTI_RESPONSE_RECEIVED_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_CRI_VC_ISSUED", schemaName: vcIssuedSchema }, allTxmaEventBodies);
	}, 20000);

	it("E2E Journey with Callback and Thank you Email TxMA event Validation for yotiMockID: 0101 - documentType: UkPassport", async () => {
		const yotiMockID = "0101";
		f2fStubPayload.yotiMockID = yotiMockID;

		const { sessionId } = await startStubServiceAndReturnSessionId(f2fStubPayload);

		await initiateUserInfo(dataPassport, sessionId);

		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId = session?.yotiSessionId;
		expect(yotiSessionId).toBeTruthy();
	
		await callbackPost(yotiSessionId);

		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 6);
		validateTxMAEventData({ eventName: "F2F_CRI_START", schemaName: "F2F_CRI_START_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_START", schemaName: "F2F_YOTI_START_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_CRI_AUTH_CODE_ISSUED", schemaName: "F2F_CRI_AUTH_CODE_ISSUED_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_CRI_END", schemaName: "F2F_CRI_END_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_PDF_EMAILED", schemaName: "F2F_YOTI_PDF_EMAILED_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_YOTI_RESPONSE_RECEIVED", schemaName: "F2F_YOTI_RESPONSE_RECEIVED_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventData({ eventName: "F2F_CRI_VC_ISSUED", schemaName: "F2F_CRI_VC_ISSUED_01_SCHEMA" }, allTxmaEventBodies);
	}, 20000);
});
