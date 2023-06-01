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

			expect(result).toBe(4);
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
		it("should return 3 for faceMatchCheck === 'APPROVE'", () => {
			const faceMatchCheck = "APPROVE";

			const result = generateVerifiableCredential["calculateVerificationProcessLevel"](faceMatchCheck);

			expect(result).toBe(3);
		});

		it("should return 0 for faceMatchCheck !== 'APPROVE'", () => {
			const faceMatchCheck = "REJECT";

			const result = generateVerifiableCredential["calculateVerificationProcessLevel"](faceMatchCheck);

			expect(result).toBe(0);
		});
	});

	describe("getCounterIndicator", () => {
		it("should return the correct counter indicators for face match rejection reason 'FACE_NOT_GENUINE'", () => {
			const ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION = {
				value: "APPROVE",
			};
			const ID_DOCUMENT_FACE_MATCH_RECOMMENDATION = {
				value: "REJECT",
				reason: "FACE_NOT_GENUINE",
			};

			const result = generateVerifiableCredential["getCounterIndicator"](
				ID_DOCUMENT_FACE_MATCH_RECOMMENDATION,
				ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION,
				null,
				null,
				null,
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

			const result = generateVerifiableCredential["getCounterIndicator"](
				ID_DOCUMENT_FACE_MATCH_RECOMMENDATION,
				ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION,
				null,
				null,
				null,
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
						personalNumber: 'BOEJJ861281TP9DH',
						expiryDate: '2025-01-01',
						issueDate: '2020-01-01',
						issuedBy: 'Authority',
						fullAddress: 'Address'
					}
				],
			});
		});

		it("should attach the evidence payload to the credential subject for UK passport", () => {
			const credentialSubject = {};
			const documentType = "PASSPORT";
			const documentFields = {
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
			const documentFields = {};

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
					state: "DONE",
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
				{
					type: "IBV_VISUAL_REVIEW_CHECK",
					state: "DONE",
					report: {
						recommendation: {
							value: "APPROVE",
						},
						breakdown: [],
					},
				},
				{
					type: "DOCUMENT_SCHEME_VALIDITY_CHECK",
					state: "DONE",
					report: {
						recommendation: {
							value: "APPROVE",
						},
						breakdown: [],
					},
				},
				{
					type: "PROFILE_DOCUMENT_MATCH",
					state: "DONE",
					report: {
						recommendation: {
							value: "APPROVE",
						},
						breakdown: [],
					},
				},
			],
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
								"checkMethod":"vri",
								"identityCheckPolicy":"published",
								"txn":"yoti-session-id",
								 },
								 {
								"photoVerificationProcessLevel":3,
								"checkMethod":"pvr",
								"txn":"yoti-session-id",
								 },
						],
						"strengthScore":3,
						"type":"IdentityCheck",
						"validityScore":2,
						"verificationScore":3,
					 },
				],
		 });
		});

		it("should throw an error when mandatory checks are missing", () => {
			const incompletePayload = {
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
			const incompletePayload = {
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
