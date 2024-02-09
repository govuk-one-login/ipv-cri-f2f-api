import dataPassport from "../data/docSelectionPayloadPassportValid.json";
import dataUkDrivingLicence from "../data/docSelectionPayloadDriversLicenceValid.json";
import dataEuDrivingLicence from "../data/docSelectionPayloadEuDriversLicenceValid.json";
import dataNonUkPassport from "../data/docSelectionPayloadNonUkPassportValid.json";
import dataBrp from "../data/docSelectionPayloadBrpValid.json";
import dataEeaIdCard from "../data/docSelectionPayloadEeaIdCardValid.json";
import f2fStubPayload from "../data/exampleStubPayload.json";
import vcResponseData from "../data/vcValidationData.json";
import { sleep } from "../../../src/utils/Sleep";
import {
	startStubServiceAndReturnSessionId,
	validateJwtToken,
	getDequeuedSqsMessage,
	initiateUserInfo,
	getSessionById,
	callbackPost,
	validateJwtTokenNamePart,
	getSqsEventList,
	validateTxMAEvent,
	validateTxMAEventData,
} from "../utils/ApiTestSteps";
import "dotenv/config";
import { constants } from "../utils/ApiConstants";

describe("Callback API", () => {
	jest.setTimeout(60000);

	it.each([
		["0000", dataUkDrivingLicence],
		["0001", dataUkDrivingLicence],
		["0101", dataPassport],
		["0102", dataPassport],
		["0103", dataPassport],
		["0108", dataPassport],
		["0109", dataPassport],
		["0110", dataPassport],
		["0111", dataPassport],
		["0112", dataPassport],
		["0113", dataPassport],
		["0114", dataPassport],
		["0115", dataPassport],
		["0116", dataPassport],
		["0117", dataPassport],
		["0118", dataPassport],
		["0119", dataPassport],
		["0120", dataPassport],
		["0121", dataPassport],
		["0122", dataPassport],
		["0123", dataPassport],
		["0124", dataPassport],
		["0125", dataPassport],
		["0133", dataPassport],
		["0200", dataNonUkPassport],
		["0201", dataNonUkPassport],
		["0202", dataNonUkPassport],
		["0203", dataNonUkPassport],
		["0204", dataNonUkPassport],
		["0300", dataBrp],
		["0301", dataBrp],
		["0302", dataBrp],
		["0303", dataBrp],
		["0400", dataEuDrivingLicence],
		["0401", dataEuDrivingLicence],
		["0500", dataEeaIdCard],
		["0501", dataEeaIdCard],
		["0502", dataEeaIdCard],
		["0503", dataEeaIdCard],
	])("F2F CRI Callback Endpoint - yotiMockId: '%s'", async (yotiMockId: string, docSelectionData:any) => {
		f2fStubPayload.yotiMockID = yotiMockId;

		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);

		await initiateUserInfo(docSelectionData, sessionResponse.data.session_id);

		const session = await getSessionById(sessionResponse.data.session_id, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);
	
		await callbackPost(yotiSessionId);

		// Retrieve Verifiable Credential from dequeued SQS queue
		let sqsMessage;
		do {
			sqsMessage = await getDequeuedSqsMessage(sessionResponse.data.sub);
		} while (!sqsMessage);
		const jwtToken = sqsMessage["https://vocab.account.gov.uk/v1/credentialJWT"][0];
		validateJwtToken(jwtToken, vcResponseData, yotiMockId);

	}, 20000);

	it("F2F CRI Callback Endpoint Integration HappyPath - yotiMockId: '%s'", async () => {
		f2fStubPayload.yotiMockID = "0000";

		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);

		await initiateUserInfo(dataUkDrivingLicence, sessionResponse.data.session_id);

		const session = await getSessionById(sessionResponse.data.session_id, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);
	
		await callbackPost(yotiSessionId);

		// Retrieve Verifiable Credential from dequeued SQS queue
		let sqsMessage;
		do {
			sqsMessage = await getDequeuedSqsMessage(sessionResponse.data.sub);
		} while (!sqsMessage);
		const jwtToken = sqsMessage["https://vocab.account.gov.uk/v1/credentialJWT"][0];

		validateJwtToken(jwtToken, vcResponseData, "0000");
	}, 20000);

	describe("F2F CRI Callback Endpoint UnHappyPath - Verifiable Credential Error", () => {
		it.each([
			["0134", "VC generation failed : Multiple document_fields in response"],
			["0160", "VC generation failed : Yoti document_fields not populated"],
		])("yotiMockId: '%s'", async (yotiMockId: string, vcError: string) => {
			f2fStubPayload.yotiMockID = yotiMockId;

			const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);

			await initiateUserInfo(dataNonUkPassport, sessionResponse.data.session_id);

			const session = await getSessionById(sessionResponse.data.session_id, constants.DEV_F2F_SESSION_TABLE_NAME);
			const yotiSessionId: any = session?.yotiSessionId;
			console.log(yotiSessionId);
		
			await callbackPost(yotiSessionId);
	
			// Retrieve Verifiable Credential from dequeued SQS queue
			let sqsMessage;
			let i = 0;
			do {
				sqsMessage = await getDequeuedSqsMessage(sessionResponse.data.sub);
				await sleep(1000);
				i++;
			} while (i < 10 || sqsMessage == undefined);
	
			expect(sqsMessage.error_description).toBe(vcError);
		}, 20000);
	});
	

	it.each([
		["0150", dataPassport, "FRANK", "JACOB", "JAMES", "SMITH"],
		["0151", dataPassport, "FRANK", "JACOB", "JAMES", "SMITH"],
		["0152", dataPassport, "FRANK", "JACOB", "JAMES", "SMITH"],
		["0402", dataEuDrivingLicence, "FREDERICK", "SMITH", "JON", "FLINTSTONE"],
		["0206", dataNonUkPassport, "FREDERICK", "JON", "De", "FLINTSTONE"],

	])("F2F CRI Callback Endpoint Given Names in Yoti Response- yotiMockId: '%s'", async (yotiMockId: string, docSelectionData:any, givenName1:any, givenName2:any, givenName3:any, familyName:any ) => {
		f2fStubPayload.yotiMockID = yotiMockId;
		f2fStubPayload.shared_claims.name[0].nameParts[0].value = givenName1;
		f2fStubPayload.shared_claims.name[0].nameParts[1].value = givenName2 + " " + givenName3;
		f2fStubPayload.shared_claims.name[0].nameParts[2].value = familyName;
		
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);

		await initiateUserInfo(docSelectionData, sessionResponse.data.session_id);

		const session = await getSessionById(sessionResponse.data.session_id, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);
	
		await callbackPost(yotiSessionId);

		// Retrieve Verifiable Credential from dequeued SQS queue
		let sqsMessage;
		do {
			sqsMessage = await getDequeuedSqsMessage(sessionResponse.data.sub);
		} while (!sqsMessage);
		const jwtToken = sqsMessage["https://vocab.account.gov.uk/v1/credentialJWT"][0];
		validateJwtTokenNamePart(jwtToken, givenName1, givenName2, givenName3, familyName + yotiMockId);
	}, 20000);

	it.each([
		["0000", dataUkDrivingLicence],
		["0101", dataPassport],
		["0200", dataNonUkPassport],
		["0300", dataBrp],
		["0400", dataEuDrivingLicence],
		["0500", dataEeaIdCard],
	])("F2F CRI Callback Endpoint TxMA Validation", async (yotiMockId: string, docSelectionData:any) => {
		f2fStubPayload.yotiMockID = yotiMockId;
		
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);

		await initiateUserInfo(docSelectionData, sessionResponse.data.session_id);

		const session = await getSessionById(sessionResponse.data.session_id, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);
	
		await callbackPost(yotiSessionId);

		// Retrieve Verifiable Credential from dequeued SQS queue
		let sqsMessage;
		do {
			sqsMessage = await getSqsEventList("txma/", sessionResponse.data.session_id, 7);
		} while (!sqsMessage);
		await validateTxMAEventData(sqsMessage, yotiMockId);

	}, 20000);

	it.each([
		["0000", dataUkDrivingLicence],
		["0101", dataPassport],
		["0200", dataNonUkPassport],
		["0300", dataBrp],
		["0400", dataEuDrivingLicence],
		["0500", dataEeaIdCard],
	])("F2F CRI Callback Endpoint TxMA Validation - yotiMockId: '%s'", async (yotiMockId: string, docSelectionData:any) => {
		f2fStubPayload.yotiMockID = yotiMockId;
		
		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);

		await initiateUserInfo(docSelectionData, sessionResponse.data.session_id);

		const session = await getSessionById(sessionResponse.data.session_id, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId: any = session?.yotiSessionId;
		console.log(yotiSessionId);
	
		await callbackPost(yotiSessionId);

		// Retrieve Verifiable Credential from dequeued SQS queue
		let sqsMessage;
		do {
			sqsMessage = await getSqsEventList("txma/", sessionResponse.data.session_id, 7);
		} while (!sqsMessage);
		await validateTxMAEvent("F2F_CRI_VC_ISSUED", sqsMessage, yotiMockId, false, vcResponseData);

	}, 20000);

	it("F2F CRI Callback Endpoint thank you email - yotiMockId 0101", async () => {
		const yotiMockID = "0101";

		f2fStubPayload.yotiMockID = yotiMockID;

		const sessionResponse = await startStubServiceAndReturnSessionId(f2fStubPayload);

		await initiateUserInfo(dataPassport, sessionResponse.data.session_id);

	
		const session = await getSessionById(sessionResponse.data.session_id, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId: any = session?.yotiSessionId;
	
		await callbackPost(yotiSessionId);

		// Retrieve Verifiable Credential from dequeued SQS queue
		let sqsMessage;
		do {
			sqsMessage = await getSqsEventList("txma/", sessionResponse.data.session_id, 6);
		} while (!sqsMessage);

		await validateTxMAEventData(sqsMessage, yotiMockID);
	}, 20000);
});
