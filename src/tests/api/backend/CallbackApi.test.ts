/* eslint-disable max-lines-per-function */
import dataPassport from "../../data/docSelectionPayloadPassportValid.json";
import dataUkDrivingLicence from "../../data/docSelectionPayloadDriversLicenceValid.json";
import dataEuDrivingLicence from "../../data/docSelectionPayloadEuDriversLicenceValid.json";
import dataNonUkPassport from "../../data/docSelectionPayloadNonUkPassportValid.json";
import dataBrp from "../../data/docSelectionPayloadBrpValid.json";
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
		{ yotiMockId: "0000", docSelectionData: dataUkDrivingLicence },
		{ yotiMockId: "0001", docSelectionData: dataUkDrivingLicence },
		{ yotiMockId: "0003", docSelectionData: dataUkDrivingLicence },
		{ yotiMockId: "0101", docSelectionData: dataPassport },
		{ yotiMockId: "0102", docSelectionData: dataPassport },
		{ yotiMockId: "0103", docSelectionData: dataPassport },
		{ yotiMockId: "0108", docSelectionData: dataPassport },
		{ yotiMockId: "0109", docSelectionData: dataPassport },
		{ yotiMockId: "0110", docSelectionData: dataPassport },
		{ yotiMockId: "0111", docSelectionData: dataPassport },
		{ yotiMockId: "0112", docSelectionData: dataPassport },
		{ yotiMockId: "0113", docSelectionData: dataPassport },
		{ yotiMockId: "0114", docSelectionData: dataPassport },
		{ yotiMockId: "0115", docSelectionData: dataPassport },
		{ yotiMockId: "0116", docSelectionData: dataPassport },
		{ yotiMockId: "0117", docSelectionData: dataPassport },
		{ yotiMockId: "0118", docSelectionData: dataPassport },
		{ yotiMockId: "0119", docSelectionData: dataPassport },
		{ yotiMockId: "0120", docSelectionData: dataPassport },
		{ yotiMockId: "0121", docSelectionData: dataPassport },
		{ yotiMockId: "0122", docSelectionData: dataPassport },
		{ yotiMockId: "0123", docSelectionData: dataPassport },
		{ yotiMockId: "0124", docSelectionData: dataPassport },
		{ yotiMockId: "0125", docSelectionData: dataPassport },
		{ yotiMockId: "0133", docSelectionData: dataPassport },
		{ yotiMockId: "0200", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0201", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0202", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0203", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0204", docSelectionData: dataNonUkPassport },
		{ yotiMockId: "0300", docSelectionData: dataBrp },
		{ yotiMockId: "0301", docSelectionData: dataBrp },
		{ yotiMockId: "0302", docSelectionData: dataBrp },
		{ yotiMockId: "0303", docSelectionData: dataBrp },
		{ yotiMockId: "0400", docSelectionData: dataEuDrivingLicence },
		{ yotiMockId: "0401", docSelectionData: dataEuDrivingLicence },
		{ yotiMockId: "0500", docSelectionData: dataEeaIdCard },
		{ yotiMockId: "0501", docSelectionData: dataEeaIdCard },
		{ yotiMockId: "0502", docSelectionData: dataEeaIdCard },
		{ yotiMockId: "0503", docSelectionData: dataEeaIdCard },
	])("F2F CRI Callback Endpoint - yotiMockId $yotiMockId", async ({ yotiMockId, docSelectionData }: { yotiMockId: string; docSelectionData: DocSelectionData }) => {
		f2fStubPayload.yotiMockID = yotiMockId;

		const { sessionId, sub } = await startStubServiceAndReturnSessionId(f2fStubPayload, process.env.thirdPartyClienId);

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

	])("Mutltuple given Names in Yoti Response - yotiMockId $yotiMockId'", async (
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
		{ yotiMockId: "0000", docSelectionData: dataUkDrivingLicence, yotiStartSchema: "F2F_YOTI_START_00_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_SCHEMA" },
		{ yotiMockId: "0101", docSelectionData: dataPassport, yotiStartSchema: "F2F_YOTI_START_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_01_SCHEMA" },
		{ yotiMockId: "0200", docSelectionData: dataNonUkPassport, yotiStartSchema: "F2F_YOTI_START_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_01_SCHEMA" },
		{ yotiMockId: "0300", docSelectionData: dataBrp, yotiStartSchema: "F2F_YOTI_START_03_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_03_SCHEMA" },
		{ yotiMockId: "0400", docSelectionData: dataEuDrivingLicence, yotiStartSchema: "F2F_YOTI_START_00_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_04_SCHEMA" },
		{ yotiMockId: "0500", docSelectionData: dataEeaIdCard, yotiStartSchema: "F2F_YOTI_START_05_SCHEMA", vcIssuedSchema: "F2F_CRI_VC_ISSUED_05_SCHEMA" },
	])("TxMA event Validation $yotiMockId", async ({ yotiMockId, docSelectionData, yotiStartSchema, vcIssuedSchema }: { yotiMockId: string; docSelectionData: DocSelectionData; yotiStartSchema: string; vcIssuedSchema: string }) => {
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

	it("Thank you email - yotiMockId 0101", async () => {
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
