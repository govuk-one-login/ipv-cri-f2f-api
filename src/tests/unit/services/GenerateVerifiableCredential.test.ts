/* eslint-disable @typescript-eslint/dot-notation */
import { Logger } from "@aws-lambda-powertools/logger";
import { GenerateVerifiableCredential } from "../../../services/GenerateVerifiableCredential";

describe("GenerateVerifiableCredential", () => {
	let logger: Logger;
	let generateVerifiableCredential: GenerateVerifiableCredential;

	beforeEach(() => {
		logger = new Logger();
		generateVerifiableCredential = GenerateVerifiableCredential.getInstance(logger);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe("doesDocumentContainValidChip", () => {
		it("should return true if document type is valid and contains a valid chip", () => {
			const documentType = "PASSPORT";
			const documentAuthenticityCheckBreakdown = [
				{
					sub_check: "chip_csca_trusted",
					result: "PASS",
				},
			];

			const result = generateVerifiableCredential["doesDocumentContainValidChip"](
				documentType,
				documentAuthenticityCheckBreakdown,
			);

			expect(result).toBe(true);
		});

		it("should return false if document type is not valid", () => {
			const documentType = "INVALID_DOCUMENT";
			const documentAuthenticityCheckBreakdown = [
				{
					sub_check: "chip_csca_trusted",
					result: "PASS",
				},
			];

			const result = generateVerifiableCredential["doesDocumentContainValidChip"](
				documentType,
				documentAuthenticityCheckBreakdown,
			);

			expect(result).toBe(false);
		});

		it("should return false if document type is valid but does not contain a valid chip", () => {
			const documentType = "PASSPORT";
			const documentAuthenticityCheckBreakdown = [
				{
					sub_check: "chip_csca_trusted",
					result: "FAIL",
				},
			];

			const result = generateVerifiableCredential["doesDocumentContainValidChip"](
				documentType,
				documentAuthenticityCheckBreakdown,
			);

			expect(result).toBe(false);
		});
	});

	describe("calculateStrengthScore", () => {
		it("should return the correct strength score for UKPASSPORT with valid chip", () => {
			const documentType = "PASSPORT";
			const documentContainsValidChip = true;

			const result = generateVerifiableCredential["calculateStrengthScore"](
				documentType,
				"GBR",
				documentContainsValidChip,
			);

			expect(result).toBe(4);
		});

		it("should return the correct strength score for RESIDENCE_PERMIT", () => {
			const documentType = "RESIDENCE_PERMIT";
			const documentContainsValidChip = false;

			const result = generateVerifiableCredential["calculateStrengthScore"](
				documentType,
				"ALB",
				documentContainsValidChip,
			);

			expect(result).toBe(3);
		});

		it("should return the correct strength score for DRIVING_LICENCE", () => {
			const documentType = "DRIVING_LICENCE";
			const documentContainsValidChip = false;

			const result = generateVerifiableCredential["calculateStrengthScore"](
				documentType,
				"GBR",
				documentContainsValidChip,
			);

			expect(result).toBe(3);
		});

		it("should return the correct strength score for EU identity card without valid chip", () => {
			const documentType = "NATIONAL_ID";
			const documentContainsValidChip = false;

			const result = generateVerifiableCredential["calculateStrengthScore"](
				documentType,
				"ALB",
				documentContainsValidChip,
			);

			expect(result).toBe(3);
		});

		it("should throw an error for an invalid document type", () => {
			const documentType = "INVALID_DOCUMENT";
			const documentContainsValidChip = true;

			expect(() =>
				generateVerifiableCredential["calculateStrengthScore"](documentType, "ALB", documentContainsValidChip),
			).toThrow("Invalid documentType provided");
		});
	});

	describe("calculateValidityScore", () => {
		it("should return the correct validity score when authenticity recommendation is 'APPROVE' and document contains a valid chip", () => {
			const authenticityRecommendation = "APPROVE";
			const documentContainsValidChip = true;

			const result = generateVerifiableCredential["calculateValidityScore"](
				authenticityRecommendation,
				documentContainsValidChip,
			);

			expect(result).toBe(3);
		});

		it("should return the correct validity score when authenticity recommendation is 'APPROVE' and document does not contain a valid chip", () => {
			const authenticityRecommendation = "APPROVE";
			const documentContainsValidChip = false;

			const result = generateVerifiableCredential["calculateValidityScore"](
				authenticityRecommendation,
				documentContainsValidChip,
			);

			expect(result).toBe(2);
		});

		it("should return 0 validity score when authenticity recommendation is not 'APPROVE'", () => {
			const authenticityRecommendation = "REJECT";
			const documentContainsValidChip = true;

			const result = generateVerifiableCredential["calculateValidityScore"](
				authenticityRecommendation,
				documentContainsValidChip,
			);

			expect(result).toBe(0);
		});
	});

	describe("calculateVerificationProcessLevel", () => {

		it("should return 0 for faceMatchCheck === 'APPROVE' and validityScore is 0", () => {
			const faceMatchCheck = "APPROVE";

			const result = generateVerifiableCredential["calculateVerificationProcessLevel"](0, faceMatchCheck);

			expect(result).toBe(0);
		});

		it("should return 0 for faceMatchCheck !== 'APPROVE' and validityScore is 0", () => {
			const faceMatchCheck = "REJECT";

			const result = generateVerifiableCredential["calculateVerificationProcessLevel"](0, faceMatchCheck);

			expect(result).toBe(0);
		});

		it("should return 3 for faceMatchCheck === 'APPROVE' and validity score is 3", () => {
			const faceMatchCheck = "APPROVE";

			const result = generateVerifiableCredential["calculateVerificationProcessLevel"](3, faceMatchCheck);

			expect(result).toBe(3);
		});

		it("should return 0 for faceMatchCheck !== 'APPROVE' and validityScore is 3", () => {
			const faceMatchCheck = "REJECT";

			const result = generateVerifiableCredential["calculateVerificationProcessLevel"](3, faceMatchCheck);

			expect(result).toBe(0);
		});

	});

	describe("getContraIndicator", () => {
		it("should return the correct counter indicators for face match rejection reason 'FACE_NOT_GENUINE'", () => {
			const ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION = {
				value: "APPROVE",
			};
			const ID_DOCUMENT_FACE_MATCH_RECOMMENDATION = {
				value: "REJECT",
				reason: "FACE_NOT_GENUINE",
			};

			const result = generateVerifiableCredential["getContraIndicator"](
				ID_DOCUMENT_FACE_MATCH_RECOMMENDATION,
				ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION,
			);

			expect(result).toEqual(["V01"]);
		});

		it("should return empty CI array if no rejection reasons match found", () => {
			const ID_DOCUMENT_FACE_MATCH_RECOMMENDATION = {
				value: "REJECT",
				reason: "UNKNOWN_REASON",
			};
			const ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION = {
				value: "APPROVE",
			};

			const result = generateVerifiableCredential["getContraIndicator"](
				ID_DOCUMENT_FACE_MATCH_RECOMMENDATION,
				ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION,
			);

			expect(result).toEqual([]);
		});
	});

	describe("attachPersonName", () => {
		it("should attach the person name to the credential subject", () => {
			const credentialSubject = {};
			const givenName = "John";
			const familyName = "Doe";

			const result = generateVerifiableCredential["attachPersonName"](
				credentialSubject,
				givenName,
				familyName,
			);

			expect(result).toEqual({
				name: [
					{
						nameParts: [
							{ type: "GivenName", value: "John" },
							{ type: "FamilyName", value: "Doe" },
						],
					},
				],
			});
		});
	});

	describe("attachDOB", () => {
		it("should attach the date of birth to the credential subject", () => {
			const credentialSubject = {};
			const dateOfBirth = "1990-01-01";

			const result = generateVerifiableCredential["attachDOB"](credentialSubject, dateOfBirth);

			expect(result).toEqual({ birthDate: [{ value: "1990-01-01" }] });
		});
	});

	describe("attachAddressInfo", () => {
		it("should attach the address information to the credential subject", () => {
			const credentialSubject = {};
			const postalAddress = {
				address_line1: "122 BURNS CRESCENT",
				building_number: "123",
				town_city: "City",
				postal_code: "12345",
				country: "Country",
			};

			const result = generateVerifiableCredential["attachAddressInfo"](credentialSubject, postalAddress);

			expect(result).toEqual({
				address: [
					{
						buildingNumber: "123",
						addressLocality: "City",
						postalCode: "12345",
						addressCountry: "Country",
						streetName: "BURNS CRESCENT",
					},
				],
			});
		});
	});

	describe("attachEvidencePayload", () => {
		it("should attach the evidence payload to the credential subject for UK driving license", () => {
			const credentialSubject = {};
			const documentType = "DRIVING_LICENCE";
			const documentFields = {
				given_names: "Joe",
				family_name: "Blog",
				date_of_birth: "01-01-2010",
				document_number: "BOEJJ861281TP9DH",
				expiration_date: "2025-01-01",
				date_of_issue: "2020-01-01",
				issuing_authority: "Authority",
				formatted_address: "Address",
			};

			const result = generateVerifiableCredential["attachEvidencePayload"](
				credentialSubject,
				documentType,
				"GBR",
				documentFields,
			);

			expect(result).toEqual({
				drivingPermit: [
					{
						personalNumber: "BOEJJ861281TP9DH",
						expiryDate: "2025-01-01",
						issueDate: "2020-01-01",
						issuedBy: "Authority",
						fullAddress: "Address",
					},
				],
			});
		});

		it("should attach the evidence payload to the credential subject for UK passport", () => {
			const credentialSubject = {};
			const documentType = "PASSPORT";
			const documentFields = {
				given_names: "Joe",
				family_name: "Blog",
				date_of_birth: "01-01-2010",
				document_number: "123456789",
				expiration_date: "2025-01-01",
				issuing_country: "GBR",
			};

			const result = generateVerifiableCredential["attachEvidencePayload"](
				credentialSubject,
				documentType,
				"GBR",
				documentFields,
			);

			expect(result).toEqual({
				passport: [
					{
						documentNumber: "123456789",
						expiryDate: "2025-01-01",
						icaoIssuerCode: "GBR",
					},
				],
			});
		});

		it("should throw an error for an invalid document type", () => {
			const credentialSubject = {};
			const documentType = "INVALID_DOCUMENT";
			const documentFields = {
				given_names: "Joe",
				family_name: "Blog",
				date_of_birth: "01-01-2010",
			};

			expect(() =>
				generateVerifiableCredential["attachEvidencePayload"](
					credentialSubject,
					documentType,
					"GBR",
					documentFields,
				),
			).toThrow("Invalid documentType provided");
		});
	});

	describe("getVerifiedCredentialInformation", () => {
		const mockYotiSessionId = "yoti-session-id";
		const mockCompletedYotiSessionPayload = {
			"client_session_token_ttl": 2209195,
			"session_id": "87a7b98e-b4d0-4670-9819-e5288642eddb",
			"state": "COMPLETED",
			"resources": {
				"id_documents": [
					{
						"id": "b2a71a45-3c5a-4a6c-9246-c05356f6260c",
						"tasks": [
							{
								"type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
								"id": "a20bbcab-223b-433a-a9a7-2a347a29f6bb",
								"state": "DONE",
								"created": "2023-04-11T10:17:40Z",
								"last_updated": "2023-04-11T10:18:37Z",
								"generated_checks": [],
								"generated_media": [
									{
										"id": "01a7ac11-fe73-4991-b188-4914f2011d1a",
										"type": "JSON",
									},
								],
							},
						],
						"source": {
							"type": "IBV",
						},
						"created_at": "2023-04-11T10:17:40Z",
						"last_updated": "2023-04-11T10:18:37Z",
						"document_type": "PASSPORT",
						"issuing_country": "GBR",
						"pages": [
							{
								"capture_method": "CAMERA",
								"media": {
									"id": "3f477902-e517-4ead-9131-3129fbb64845",
									"type": "IMAGE",
									"created": "2023-04-11T10:18:25Z",
									"last_updated": "2023-04-11T10:18:25Z",
								},
								"frames": [
									{
										"media": {
											"id": "b5fbda3b-b2be-48d6-b6a7-6120198519f0",
											"type": "IMAGE",
											"created": "2023-04-11T10:18:27Z",
											"last_updated": "2023-04-11T10:18:27Z",
										},
									},
									{
										"media": {
											"id": "888b57a4-3fdc-47d1-9655-a5bc3114c179",
											"type": "IMAGE",
											"created": "2023-04-11T10:18:29Z",
											"last_updated": "2023-04-11T10:18:29Z",
										},
									},
									{
										"media": {
											"id": "58c2fc48-ab4f-4737-a57b-f577e9964b69",
											"type": "IMAGE",
											"created": "2023-04-11T10:18:31Z",
											"last_updated": "2023-04-11T10:18:31Z",
										},
									},
								],
							},
						],
						"document_fields": {
							"media": {
								"id": "01a7ac11-fe73-4991-b188-4914f2011d1a",
								"type": "JSON",
								"created": "2023-04-11T10:18:36Z",
								"last_updated": "2023-04-11T10:18:36Z",
							},
						},
						"document_id_photo": {
							"media": {
								"id": "0f9a5e39-476d-48d3-9eb4-c66342a2916e",
								"type": "IMAGE",
								"created": "2023-04-11T10:18:36Z",
								"last_updated": "2023-04-11T10:18:36Z",
							},
						},
					},
				],
				"supplementary_documents": [],
				"liveness_capture": [],
				"face_capture": [
					{
						"id": "4b6eb8a9-882f-4ae4-a10f-26b57ff5a328",
						"tasks": [],
						"source": {
							"type": "IBV",
						},
						"created_at": "2023-04-11T10:18:45Z",
						"last_updated": "2023-04-11T10:19:16Z",
						"image": {
							"media": {
								"id": "d8285306-7d47-47b9-b964-df2d668ba013",
								"type": "IMAGE",
								"created": "2023-04-11T10:19:16Z",
								"last_updated": "2023-04-11T10:19:16Z",
							},
						},
					},
				],
				"applicant_profiles": [
					{
						"id": "a2c78800-fc3c-4104-808c-70de5285b916",
						"tasks": [],
						"source": {
							"type": "RELYING_BUSINESS",
						},
						"created_at": "2023-04-11T10:16:33Z",
						"last_updated": "2023-04-11T10:16:33Z",
						"media": {
							"id": "1a30b3a4-83a1-4493-a796-1dd000041cb5",
							"type": "JSON",
							"created": "2023-04-11T10:16:33Z",
							"last_updated": "2023-04-11T10:16:33Z",
						},
					},
				],
			},
			"checks": [
				{
					"type": "ID_DOCUMENT_AUTHENTICITY",
					"id": "1b97f98a-7ec8-49b4-8054-719592f04db3",
					"state": "DONE",
					"resources_used": [
						"b2a71a45-3c5a-4a6c-9246-c05356f6260c",
					],
					"generated_media": [],
					"report": {
						"recommendation": {
							"value": "APPROVE",
						},
						"breakdown": [
							{
								"sub_check": "chip_csca_trusted",
								"result": "PASS",
								"details": [],
							},
							{
								"sub_check": "chip_data_integrity",
								"result": "PASS",
								"details": [],
							},
							{
								"sub_check": "chip_digital_signature_verification",
								"result": "PASS",
								"details": [],
							},
							{
								"sub_check": "chip_parse",
								"result": "PASS",
								"details": [],
							},
							{
								"sub_check": "chip_sod_parse",
								"result": "PASS",
								"details": [],
							},
							{
								"sub_check": "document_in_date",
								"result": "PASS",
								"details": [],
							},
							{
								"sub_check": "fraud_list_check",
								"result": "PASS",
								"details": [],
							},
							{
								"sub_check": "mrz_validation",
								"result": "PASS",
								"details": [],
							},
							{
								"sub_check": "ocr_mrz_comparison",
								"result": "PASS",
								"details": [],
							},
						],
					},
					"created": "2023-04-11T10:19:29Z",
					"last_updated": "2023-04-11T10:19:30Z",
				},
				{
					"type": "ID_DOCUMENT_FACE_MATCH",
					"id": "62d20daa-1c6f-4558-8381-2d9c7f8a73d5",
					"state": "DONE",
					"resources_used": [
						"b2a71a45-3c5a-4a6c-9246-c05356f6260c",
						"4b6eb8a9-882f-4ae4-a10f-26b57ff5a328",
					],
					"generated_media": [],
					"report": {
						"recommendation": {
							"value": "APPROVE",
						},
						"breakdown": [
							{
								"sub_check": "ai_face_match",
								"result": "PASS",
								"details": [
									{
										"name": "confidence_score",
										"value": "0.95",
									},
								],
							},
						],
					},
					"created": "2023-04-11T10:19:29Z",
					"last_updated": "2023-04-11T10:19:31Z",
				},
				{
					"type": "IBV_VISUAL_REVIEW_CHECK",
					"id": "7dce5f7f-6e63-4472-a77d-30fe4aaf142f",
					"state": "DONE",
					"resources_used": [
						"b2a71a45-3c5a-4a6c-9246-c05356f6260c",
					],
					"generated_media": [],
					"report": {
						"recommendation": {
							"value": "APPROVE",
						},
						"breakdown": [],
					},
					"created": "2023-04-11T10:19:29Z",
					"last_updated": "2023-04-11T10:19:29Z",
				},
				{
					"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
					"id": "24eb03f3-9768-42df-82bf-f3d26869e579",
					"state": "DONE",
					"resources_used": [
						"b2a71a45-3c5a-4a6c-9246-c05356f6260c",
					],
					"generated_media": [],
					"report": {
						"recommendation": {
							"value": "APPROVE",
						},
						"breakdown": [],
					},
					"created": "2023-04-11T10:19:29Z",
					"last_updated": "2023-04-11T10:19:29Z",
					"scheme": "UK_GDS",
				},
				{
					"type": "PROFILE_DOCUMENT_MATCH",
					"id": "124211f6-f41c-435e-b6aa-33ba9153cbab",
					"state": "DONE",
					"resources_used": [
						"b2a71a45-3c5a-4a6c-9246-c05356f6260c",
						"a2c78800-fc3c-4104-808c-70de5285b916",
					],
					"generated_media": [],
					"report": {
						"recommendation": {
							"value": "APPROVE",
						},
						"breakdown": [],
					},
					"created": "2023-04-11T10:19:29Z",
					"last_updated": "2023-04-11T10:19:29Z",
				},
			],
			"user_tracking_id": "some_id2",
		};
		const mockDocumentFields = {
			given_names: "John",
			family_name: "Doe",
			date_of_birth: "1990-01-01",
		};

		it("should return the verified credential information with all completed checks", () => {
			const result = generateVerifiableCredential.getVerifiedCredentialInformation(
				mockYotiSessionId,
				mockCompletedYotiSessionPayload,
				mockDocumentFields,
			);

			expect(result).toEqual({
				"credentialSubject":{
					 "birthDate":[
						{
								 "value":"1990-01-01",
						},
					 ],
					 "name":[
						{
								 "nameParts":[
								{
											 "type":"GivenName",
											 "value":"John",
								},
								{
											 "type":"FamilyName",
											 "value":"Doe",
								},
								 ],
						},
					 ],
					 "passport":[
						{
								 "documentNumber":undefined,
								 "expiryDate":undefined,
								 "icaoIssuerCode":undefined,
						},
					 ],
				},
				"evidence":[
					 {
						"checkDetails":[
								 {
								"checkMethod":"vcrypt",
								"identityCheckPolicy":"published",
								"txn":"yoti-session-id",
								 },
								 {
								"biometricVerificationProcessLevel":3,
								"checkMethod":"bvr",
								"txn":"yoti-session-id",
								 },
						],
						"strengthScore":4,
						"type":"IdentityCheck",
						"validityScore":3,
						"verificationScore":3,
					 },
				],
		 });
		});

		it("should throw an error when mandatory checks are missing", () => {
			const incompletePayload: any = {
				resources: {
					id_documents: [
						{
							document_type: "PASSPORT",
						},
					],
				},
				checks: [
					{
						type: "ID_DOCUMENT_AUTHENTICITY",
						state: "DONE",
						report: {
							recommendation: {
								value: "APPROVE",
							},
							breakdown: [],
						},
					},
					// Missing ID_DOCUMENT_FACE_MATCH check
				],
			};

			expect(() =>
				generateVerifiableCredential.getVerifiedCredentialInformation(
					mockYotiSessionId,
					incompletePayload,
					mockDocumentFields,
				),
			).toThrow("Missing mandatory checks in Yoti completed payload");
		});

		it("should throw an error when mandatory checks are not all completed", () => {
			const incompletePayload: any = {
				resources: {
					id_documents: [
						{
							document_type: "PASSPORT",
						},
					],
				},
				checks: [
					{
						type: "ID_DOCUMENT_AUTHENTICITY",
						state: "DONE",
						report: {
							recommendation: {
								value: "APPROVE",
							},
							breakdown: [],
						},
					},
					{
						type: "ID_DOCUMENT_FACE_MATCH",
						state: "PENDING", // Not completed
						report: {
							recommendation: {
								value: "APPROVE",
							},
							breakdown: [
								{
									sub_check: "manual_face_match",
									result: "PASS",
								},
							],
						},
					},
				],
			};

			expect(() =>
				generateVerifiableCredential.getVerifiedCredentialInformation(
					mockYotiSessionId,
					incompletePayload,
					mockDocumentFields,
				),
			).toThrow("Missing mandatory checks in Yoti completed payload");
		});
	});
});
