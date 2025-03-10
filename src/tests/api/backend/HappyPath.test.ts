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
	initiateUserInfo,
	getMergedYotiPdf,
} from "../ApiTestSteps";
import { getYotiLetterFileContents, getTxmaEventsFromTestHarness, invokeLambdaFunction, validateTxMAEventData, validateTxMAEventField, buildExpectedPostalAddress } from "../ApiUtils";
import f2fStubPayload from "../../data/exampleStubPayload.json";
import f2fStubPayload2Addresses from "../../data/sharedClaimsPayload2Addresses.json";
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
import { PersonIdentityAddress } from "../../../models/PersonIdentityItem";
import fs from "fs";
import { convertPdfToImages } from "../../visual/helpers";
import { toMatchImageSnapshot } from "jest-image-snapshot";

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

	it("Successful Request Tests - Shared Claims with 2 Addresses", async () => {
		const newf2fStubPayload = structuredClone(f2fStubPayload2Addresses);
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		const personIdentityRecord = await getPersonIdentityRecordById(sessionId, constants.DEV_F2F_PERSON_IDENTITY_TABLE_NAME);

		// Check that the DynamoDB table contains 1 address
		expect(personIdentityRecord?.addresses?.length).toBe(1);

		const addressFromRecord = personIdentityRecord?.addresses[0];

		if (addressFromRecord) {
			addressFromRecord.uprn = Number(addressFromRecord.uprn);
			
			expect(addressFromRecord.uprn).toBe(newf2fStubPayload.shared_claims.address[0].uprn);
		} else {
			throw new Error("Address not found in personIdentityRecord");
		}

		// Check that the DynamoDB table address matches what was passed into the shared_claims
		expect(addressFromRecord?.uprn).toBe(newf2fStubPayload.shared_claims.address[0].uprn);
		expect(addressFromRecord?.buildingNumber).toBe(newf2fStubPayload.shared_claims.address[0].buildingNumber);
		expect(addressFromRecord?.buildingName).toBe(newf2fStubPayload.shared_claims.address[0].buildingName);
		expect(addressFromRecord?.subBuildingName).toBe(newf2fStubPayload.shared_claims.address[0].subBuildingName);
		expect(addressFromRecord?.streetName).toBe(newf2fStubPayload.shared_claims.address[0].streetName);
		expect(addressFromRecord?.addressLocality).toBe(newf2fStubPayload.shared_claims.address[0].addressLocality);
		expect(addressFromRecord?.addressCountry).toBe(newf2fStubPayload.shared_claims.address[0].addressCountry);
		expect(addressFromRecord?.postalCode).toBe(newf2fStubPayload.shared_claims.address[0].postalCode);
		expect(addressFromRecord?.preferredAddress).toBe(true);
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
		{ stubPayload: f2fStubPayload },
		{ stubPayload: f2fStubPayload2Addresses },
	])("Successful Request Tests - Email + Posted Letter with Original Address", async ({ stubPayload }) => {
		expect.extend({ toMatchImageSnapshot });
		const newf2fStubPayload = structuredClone(stubPayload);
		newf2fStubPayload.yotiMockID = "0100";
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		const postResponse = await postDocumentSelection(dataUkDrivingLicencePrintedLetter, sessionId);
		await new Promise(f => setTimeout(f, 5000));
		expect(postResponse.status).toBe(200);

		const personIdentityRecord = await getPersonIdentityRecordById(sessionId, constants.DEV_F2F_PERSON_IDENTITY_TABLE_NAME);

		// Check that the DynamoDB table contains 1 address
		expect(personIdentityRecord?.addresses?.length).toBe(1);

		const addressFromRecord = personIdentityRecord?.addresses[0];

		if (addressFromRecord) {
			addressFromRecord.uprn = Number(addressFromRecord.uprn);
			
			expect(addressFromRecord.uprn).toBe(newf2fStubPayload.shared_claims.address[0].uprn);
		} else {
			throw new Error("Address not found in personIdentityRecord");
		}

		// Check that the DynamoDB table address matches what was passed into the shared_claims
		expect(addressFromRecord?.uprn).toBe(newf2fStubPayload.shared_claims.address[0].uprn);
		expect(addressFromRecord?.buildingNumber).toBe(newf2fStubPayload.shared_claims.address[0].buildingNumber);
		expect(addressFromRecord?.buildingName).toBe(newf2fStubPayload.shared_claims.address[0].buildingName);
		expect(addressFromRecord?.subBuildingName).toBe(newf2fStubPayload.shared_claims.address[0].subBuildingName);
		expect(addressFromRecord?.streetName).toBe(newf2fStubPayload.shared_claims.address[0].streetName);
		expect(addressFromRecord?.addressLocality).toBe(newf2fStubPayload.shared_claims.address[0].addressLocality);
		expect(addressFromRecord?.addressCountry).toBe(newf2fStubPayload.shared_claims.address[0].addressCountry);
		expect(addressFromRecord?.postalCode).toBe(newf2fStubPayload.shared_claims.address[0].postalCode);
		expect(addressFromRecord?.preferredAddress).toBe(true);


		const sessionRecord = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		try {
			expect(personIdentityRecord?.pdfPreference).toBe(dataUkDrivingLicencePrintedLetter.pdf_preference);
			await new Promise(f => setTimeout(f, 5000));

			const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 4);
			validateTxMAEventData({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", schemaName: "F2F_YOTI_PDF_LETTER_POSTED_SCHEMA" }, allTxmaEventBodies);
			validateTxMAEventField({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", jsonPath: "$.extensions.differentPostalAddress", expectedValue: false }, allTxmaEventBodies);
			validateTxMAEventField({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", jsonPath: "$.restricted.postalAddress[0]", expectedValue: addressFromRecord }, allTxmaEventBodies);

			// Snapshot testing only desired for single test
			if (stubPayload.shared_claims.address.length > 1) {
				const pdfData = await getMergedYotiPdf(sessionRecord?.yotiSessionId);
				const pdfImagesLocation = "./generated_images";

				try {
					const pdfBuffer = convertPdfToBuffer(pdfData);

					await convertPdfToImages(pdfBuffer, pdfImagesLocation);

					const files = fs.readdirSync(pdfImagesLocation);
					files.forEach(fileName => {
						const imagePath = pdfImagesLocation + "/" + fileName;
						const image = fs.readFileSync(imagePath);
						
						expect(image).toMatchImageSnapshot({
							runInProcess: true,
							customDiffDir: "tests/visual/__snapshots-diff__",
							customSnapshotsDir: "tests/visual/__snapshots__",
							failureThreshold: 0.1,
							failureThresholdType: "percent",

						});
					});
				} finally {
					//remove temp files
					fs.rmSync(pdfImagesLocation, { recursive: true });
				}
			}

		} catch (error) {
			console.error("Error validating PDF Preference from Person Identity Table", error);
			throw error;
		}

	});

	 it.each([
	 	{ docSelectionData: dataUkDrivingLicencePreferredAddress },
	 ])("Successful Request Tests - $PreferredAddress", async ({ docSelectionData }) => {

	 	const newf2fStubPayload = structuredClone(f2fStubPayload);
	 	const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		const postResponse = await postDocumentSelection(docSelectionData, sessionId);
		await new Promise(f => setTimeout(f, 5000));
		expect(postResponse.status).toBe(200);

		const personIdentityRecord = await getPersonIdentityRecordById(sessionId, constants.DEV_F2F_PERSON_IDENTITY_TABLE_NAME);
		expect(personIdentityRecord?.pdfPreference).toBe(docSelectionData.pdf_preference);

		// Check that the DynamoDB table contains 1 address
		expect(personIdentityRecord?.addresses?.length).toBe(2);

		const addressFromRecord = personIdentityRecord?.addresses.filter(x => x.preferredAddress)[0];
		
		// Check that the DynamoDB table address matches what was passed into the shared_claims
		//expect(addressFromRecord?.uprn).toBe(docSelectionData.postal_address.uprn);
		expect(addressFromRecord?.buildingNumber).toBe(docSelectionData.postal_address.buildingNumber);
		expect(addressFromRecord?.buildingName).toBe(docSelectionData.postal_address.buildingName);
		expect(addressFromRecord?.subBuildingName).toBe(docSelectionData.postal_address.subBuildingName);
		expect(addressFromRecord?.streetName).toBe(docSelectionData.postal_address.streetName);
		expect(addressFromRecord?.addressLocality).toBe(docSelectionData.postal_address.addressLocality);
		expect(addressFromRecord?.addressCountry).toBe(docSelectionData.postal_address.addressCountry);
		expect(addressFromRecord?.postalCode).toBe(docSelectionData.postal_address.postalCode);
		expect(addressFromRecord?.preferredAddress).toBe(true);


		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId = session?.yotiSessionId;
		expect(yotiSessionId).toBeTruthy();

		// Check that F2F_YOTI_PDF_LETTER_POSTED event matches the Schema and contains correct values for differentPostalAddress and postalAddress
		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 4);
		validateTxMAEventData({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", schemaName: "F2F_YOTI_PDF_LETTER_POSTED_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventField({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", jsonPath: "$.extensions.differentPostalAddress", expectedValue: true }, allTxmaEventBodies);
		//validateTxMAEventField({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", jsonPath: "$.restricted.postalAddress[0]", expectedValue: addressFromRecord }, allTxmaEventBodies);
	});

	it.each([
		{ stubPayload: f2fStubPayload },
		{ stubPayload: f2fStubPayload2Addresses },
	])("Successful Request Tests - Email + Posted Letter with Different Address", async ({ stubPayload }) => {
		const newf2fStubPayload = structuredClone(stubPayload);
		const { sessionId } = await startStubServiceAndReturnSessionId(newf2fStubPayload);

		const docSelect = structuredClone(dataUkDrivingLicencePreferredAddress);
		docSelect.postal_address.preferredAddress = true;
		const postResponse = await postDocumentSelection(docSelect, sessionId);
		await new Promise(f => setTimeout(f, 5000));
		expect(postResponse.status).toBe(200);

		const personIdentityRecord = await getPersonIdentityRecordById(sessionId, constants.DEV_F2F_PERSON_IDENTITY_TABLE_NAME);

		// Check that the DynamoDB table contains 2 addresses
		expect(personIdentityRecord?.addresses?.length).toBe(2);

		// Check that the DynamoDB table address matches the different address in our Document Selection Payload
		expect(personIdentityRecord?.pdfPreference).toBe(docSelect.pdf_preference);
		const preferredAddress: PersonIdentityAddress | undefined = personIdentityRecord?.addresses?.find(address => address.preferredAddress);
		expect(preferredAddress).toBeDefined();
		expect(preferredAddress?.postalCode).toBe(docSelect.postal_address.postalCode);
		expect(Number(preferredAddress?.uprn)).toBe(docSelect.postal_address.uprn);
		expect(preferredAddress?.buildingNumber).toBe(docSelect.postal_address.buildingNumber);
		expect(preferredAddress?.buildingName).toBe(docSelect.postal_address.buildingName);
		expect(preferredAddress?.subBuildingName).toBe(docSelect.postal_address.subBuildingName);
		expect(preferredAddress?.streetName).toBe(docSelect.postal_address.streetName);
		expect(preferredAddress?.addressLocality).toBe(docSelect.postal_address.addressLocality);
		expect(preferredAddress?.postalCode).toBe(docSelect.postal_address.postalCode);
		expect(preferredAddress?.preferredAddress).toBe(true);

		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId = session?.yotiSessionId;
		expect(yotiSessionId).toBeTruthy();

		// Check that F2F_YOTI_PDF_LETTER_POSTED event matches the Schema and contains correct values for differentPostalAddress and postalAddress
		await new Promise(f => setTimeout(f, 5000));
		const allTxmaEventBodies = await getTxmaEventsFromTestHarness(sessionId, 4);
		validateTxMAEventData({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", schemaName: "F2F_YOTI_PDF_LETTER_POSTED_SCHEMA" }, allTxmaEventBodies);
		validateTxMAEventField({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", jsonPath: "$.extensions.differentPostalAddress", expectedValue: true }, allTxmaEventBodies);
		validateTxMAEventField({ eventName: "F2F_YOTI_PDF_LETTER_POSTED", jsonPath: "$.restricted.postalAddress[0]", expectedValue: buildExpectedPostalAddress({ postal_address: docSelect.postal_address }) }, allTxmaEventBodies);

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

describe("Yoti Letter Validation Tests", () => {

	it("Email only - Happy Path Test", async () => {
		const stubResponse = await stubStartPost(f2fStubPayload);
		const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		const sessionId = postRequest.data.session_id;
		console.log(sessionId);

		await initiateUserInfo(dataUkDrivingLicence, sessionId);
		await new Promise(f => setTimeout(f, 5000));

		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId = session?.yotiSessionId;
		expect(yotiSessionId).toBeTruthy();
		if (!yotiSessionId) throw new Error("no Yoti Session ID provided");

		const pdfFileContent = await getYotiLetterFileContents("pdf-", yotiSessionId);
		expect(pdfFileContent.length).toBeGreaterThan(1000);
	});

	it("Email and Posted Letter - Happy Path Test", async () => {
		const stubResponse = await stubStartPost(f2fStubPayload);
		const postRequest = await sessionPost(stubResponse.data.clientId, stubResponse.data.request);
		const sessionId = postRequest.data.session_id;
		console.log(sessionId);

		await initiateUserInfo(dataUkDrivingLicencePrintedLetter, sessionId);

		const session = await getSessionById(sessionId, constants.DEV_F2F_SESSION_TABLE_NAME);
		const yotiSessionId = session?.yotiSessionId;
		expect(yotiSessionId).toBeTruthy();
		if (!yotiSessionId) throw new Error("no Yoti Session ID provided");

		await new Promise(f => setTimeout(f, 5000));

		const pdfFileContent = await getYotiLetterFileContents("pdf-", yotiSessionId);
		expect(pdfFileContent.length).toBeGreaterThan(1000);


		const mergedPdfFileContent = await getYotiLetterFileContents("merged-pdf-", yotiSessionId);
		expect(mergedPdfFileContent.length).toBeGreaterThan(1000);

	});
});

function convertPdfToBuffer(pdfData: any): Buffer {
	const response = pdfData === undefined ? Buffer.alloc(0) : pdfData;
	const binaryPdf = Buffer.from(response.data.toString(), "base64");

	fs.writeFileSync("./api-letter.pdf", binaryPdf, "base64");
	const pdfBuffer = fs.readFileSync("./api-letter.pdf");
	return pdfBuffer;
}
