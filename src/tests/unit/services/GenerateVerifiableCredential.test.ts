/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/dot-notation */
import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { GenerateVerifiableCredential } from "../../../services/GenerateVerifiableCredential";
import { YotiSessionDocument } from "../../../utils/YotiPayloadEnums";
import {
	authenticityCheck,
	mockFaceMatchCheck,
	validityCheck,
	profileMatchCheck,
	visualReviewCheck,
	mockCompletedYotiSessionPayload,
} from "../data/yoti-session";
import { Metrics } from "@aws-lambda-powertools/metrics";

describe("GenerateVerifiableCredential", () => {
	const logger = mock<Logger>();
	const metrics = mock<Metrics>();

	let generateVerifiableCredential: GenerateVerifiableCredential;
	const VcNameParts = [
		{
			"nameParts": [
				{
					"value": "John",
					"type": "GivenName",
				},
				{
					"value": "Doe",
					"type": "FamilyName",
				},
			],
		},
	];

	beforeEach(() => {
		generateVerifiableCredential = GenerateVerifiableCredential.getInstance(logger, metrics);
		metrics.singleMetric.mockReturnValue(metrics);
	});

	afterEach(() => {
		jest.resetAllMocks();
		jest.restoreAllMocks();
		expect(metrics.addMetric).not.toHaveBeenCalled();
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

			const result = generateVerifiableCredential["doesDocumentContainValidChip"](documentType, documentAuthenticityCheckBreakdown);

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

			const result = generateVerifiableCredential["doesDocumentContainValidChip"](documentType, documentAuthenticityCheckBreakdown);

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

			const result = generateVerifiableCredential["doesDocumentContainValidChip"](documentType, documentAuthenticityCheckBreakdown);

			expect(result).toBe(false);
		});
	});

	describe("calculateStrengthScore", () => {
		it.each([
			{ documentType: "PASSPORT", documentContainsValidChip: true, country: "GBR", score: 4 },
			{ documentType: "PASSPORT", documentContainsValidChip: false, country: "GBR", score: 3 },
			{ documentType: "DRIVING_LICENCE", documentContainsValidChip: false, country: "GBR", score: 3 },
			{ documentType: "PASSPORT", documentContainsValidChip: false, country: "ALB", score: 3 },
			{ documentType: "PASSPORT", documentContainsValidChip: true, country: "ALB", score: 4 },
			{ documentType: "DRIVING_LICENCE", documentContainsValidChip: false, country: "ALB", score: 3 },
			{ documentType: "NATIONAL_ID", documentContainsValidChip: true, country: "ALB", score: 4 },
			{ documentType: "NATIONAL_ID", documentContainsValidChip: false, country: "ALB", score: 3 },
		])(
			"should return the correct strength score for $documentType where documentContainsValidChip is $documentContainsValidChip and country is $country",
			({ documentType, documentContainsValidChip, country, score }) => {
				const result = generateVerifiableCredential["calculateStrengthScore"](documentType, country, documentContainsValidChip);
				expect(result).toEqual(score);
			},
		);

		it.each([
			{ country: "GBR", errorMessage: "Invalid documentType provided for issuingCountry" },
			{ country: "ALB", errorMessage: "Invalid documentType provided" },
		])("should throw an error for an invalid document type where country is $country", ({ country }) => {
			const documentType = "INVALID_DOCUMENT";
			const documentContainsValidChip = true;

			expect(() => generateVerifiableCredential["calculateStrengthScore"](documentType, country, documentContainsValidChip)).toThrow(
				"Invalid documentType provided",
			);
		});
	});

	describe("calculateValidityScore", () => {
		it.each([
			{ authenticityRecommendation: "APPROVE", documentContainsValidChip: true, score: 3 },
			{ authenticityRecommendation: "APPROVE", documentContainsValidChip: false, score: 2 },
			{ authenticityRecommendation: "REJECT", documentContainsValidChip: true, score: 0 },
		])(
			"should return the correct validity score when authenticityRecommendation is $authenticityRecommendation and documentContainsValidChip is $documentContainsValidChip",
			({ authenticityRecommendation, documentContainsValidChip, score }) => {
				const result = generateVerifiableCredential["calculateValidityScore"](authenticityRecommendation, documentContainsValidChip);
				expect(result).toEqual(score);
			},
		);
	});

	describe("calculateVerificationProcessLevel", () => {
		it("should return 0 for faceMatchCheck === 'APPROVE' and validityScore is 0", () => {
			const faceMatchCheck = YotiSessionDocument.APPROVE;

			const result = generateVerifiableCredential["calculateVerificationProcessLevel"](0, faceMatchCheck);

			expect(result).toBe(0);
		});

		it("should return 0 for faceMatchCheck !== 'APPROVE' and validityScore is 0", () => {
			const faceMatchCheck = YotiSessionDocument.REJECT;

			const result = generateVerifiableCredential["calculateVerificationProcessLevel"](0, faceMatchCheck);

			expect(result).toBe(0);
		});

		it("should return 3 for faceMatchCheck === 'APPROVE' and validity score is 3", () => {
			const faceMatchCheck = YotiSessionDocument.APPROVE;

			const result = generateVerifiableCredential["calculateVerificationProcessLevel"](3, faceMatchCheck);

			expect(result).toBe(3);
		});

		it("should return 0 for faceMatchCheck !== 'APPROVE' and validityScore is 3", () => {
			const faceMatchCheck = YotiSessionDocument.REJECT;

			const result = generateVerifiableCredential["calculateVerificationProcessLevel"](3, faceMatchCheck);

			expect(result).toBe(0);
		});
	});

	describe("getContraIndicator", () => {
		it.each([
			{ reason: "FACE_NOT_GENUINE", contraIndicator: ["V01"] },
			{ reason: "LARGE_AGE_GAP", contraIndicator: ["V01"] },
			{ reason: "PHOTO_OF_MASK", contraIndicator: ["V01"] },
			{ reason: "PHOTO_OF_PHOTO", contraIndicator: ["V01"] },
			{ reason: "DIFFERENT_PERSON", contraIndicator: ["V01"] },
		])(
			"should return the contra indicator array $contraIndicator for authenticity rejection reason $reason",
			({ reason, contraIndicator }) => {
				const ID_DOCUMENT_FACE_MATCH_RECOMMENDATION = {
					value: "REJECT",
					reason,
				};
				const ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION = {
					value: "APPROVE",
				};

				const result = generateVerifiableCredential["getContraIndicator"](
					ID_DOCUMENT_FACE_MATCH_RECOMMENDATION,
					ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION,
				);

				expect(result.contraIndicators).toEqual(contraIndicator);
				expect(result.rejectionReasons).toEqual([{ ci: contraIndicator[0], reason }]);
			},
		);

		it("should return the contra indicator array [] for authenticity rejection reason UNKNOWN_REASON",
			() => {

				const reason = "UNKNOWN_REASON";
				const contraIndicator = [undefined];

				const ID_DOCUMENT_FACE_MATCH_RECOMMENDATION = {
					value: "REJECT",
					reason,
				};
				const ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION = {
					value: "APPROVE",
				};

				const result = generateVerifiableCredential["getContraIndicator"](
					ID_DOCUMENT_FACE_MATCH_RECOMMENDATION,
					ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION,
				);

				expect(result.contraIndicators).toEqual(contraIndicator);
				expect(result.rejectionReasons).toEqual([]);
			},
		);

		it.each([
			{ reason: "COUNTERFEIT", contraIndicator: ["D14"] },
			{ reason: "EXPIRED_DOCUMENT", contraIndicator: ["D16"] },
			{ reason: "FRAUD_LIST_MATCH", contraIndicator: ["F03"] },
			{ reason: "DOC_NUMBER_INVALID", contraIndicator: ["D14"] },
			{ reason: "TAMPERED", contraIndicator: ["D14"] },
			{ reason: "MISSING_HOLOGRAM", contraIndicator: ["D14"] },
			{ reason: "NO_HOLOGRAM_MOVEMENT", contraIndicator: ["D14"] },
		])(
			"should return the contra indicator array $contraIndicator for authenticity rejection reason $reason",
			({ reason, contraIndicator }) => {
				const ID_DOCUMENT_FACE_MATCH_RECOMMENDATION = {
					value: "APPROVE",
				};
				const ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION = {
					value: "REJECT",
					reason,
				};

				const result = generateVerifiableCredential["getContraIndicator"](
					ID_DOCUMENT_FACE_MATCH_RECOMMENDATION,
					ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION,
				);

				expect(result.contraIndicators).toEqual(contraIndicator);
				expect(result.rejectionReasons).toEqual([{ ci: contraIndicator[0], reason }]);
				expect(logger.info).toHaveBeenCalledWith({
					message: "Handling authenticity rejection",
					reason,
					contraIndicator: contraIndicator[0],
				});
			},
		);
	});

	it("should return the contra indicator array [] for authenticity rejection reason UNKNOWN_REASON", () => {
			
		const reason = "UNKNOWN_REASON";
		const contraIndicator = [undefined];
			
			
		const ID_DOCUMENT_FACE_MATCH_RECOMMENDATION = {
			value: "APPROVE",
		};
		const ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION = {
			value: "REJECT",
			reason,
		};

		const result = generateVerifiableCredential["getContraIndicator"](
			ID_DOCUMENT_FACE_MATCH_RECOMMENDATION,
			ID_DOCUMENT_AUTHENTICITY_RECOMMENDATION,
		);

		expect(result.contraIndicators).toEqual(contraIndicator);
		expect(result.rejectionReasons).toEqual([]);
		expect(logger.info).toHaveBeenCalledWith({
			message: "Handling authenticity rejection",
			reason,
			contraIndicator: contraIndicator[0],
		});
	},
	);

	describe("attachPersonName", () => {
		it("should attach the person name to the credential subject", () => {
			const credentialSubject = {};

			const result = generateVerifiableCredential["attachPersonName"](credentialSubject, VcNameParts);

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
				full_name: "Joe Blog",
				given_names: "Joe",
				family_name: "Blog",
				date_of_birth: "01-01-2010",
				document_number: "BOEJJ861281TP9DH",
				expiration_date: "2025-01-01",
				date_of_issue: "2020-01-01",
				issuing_authority: "Authority",
				formatted_address: "Address",
			};

			const result = generateVerifiableCredential["attachEvidencePayload"](credentialSubject, documentType, "GBR", documentFields);

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
				full_name: "Joe Blog",
				given_names: "Joe",
				family_name: "Blog",
				date_of_birth: "01-01-2010",
				document_number: "123456789",
				expiration_date: "2025-01-01",
				issuing_country: "GBR",
			};

			const result = generateVerifiableCredential["attachEvidencePayload"](credentialSubject, documentType, "GBR", documentFields);

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
				full_name: "Joe Blog",
				given_names: "Joe",
				family_name: "Blog",
				date_of_birth: "01-01-2010",
			};

			expect(() => generateVerifiableCredential["attachEvidencePayload"](credentialSubject, documentType, "GBR", documentFields)).toThrow(
				"Invalid documentType provided",
			);
		});
	});

	describe("getVerifiedCredentialInformation", () => {
		const mockYotiSessionId = "yoti-session-id";
		const mockDocumentFields = {
			full_name: "John Doe",
			given_names: "John",
			family_name: "Doe",
			date_of_birth: "1990-01-01",
		};

		it.each([
			{ scoreCalculator: "calculateStrengthScore",
				scoreName: "strengthScore",
				expectedScores: {
					strengthScore: 0,
					validityScore: 3,
					verificationScore: 3,
				},
			},
			{ scoreCalculator: "calculateValidityScore",
				scoreName: "validityScore",
				expectedScores: {
					strengthScore: 4,
					validityScore: 0,
					verificationScore: 0,
				},
			},
			{ scoreCalculator: "calculateVerificationProcessLevel",
				scoreName: "verificationScore",
				expectedScores: {
					strengthScore: 4,
					validityScore: 3,
					verificationScore: 0,
				} },
		])(
			"should return the verified credential information with failedCheckDetails where $scoreName is 0",
			({ scoreCalculator, expectedScores }) => {
				jest.spyOn(GenerateVerifiableCredential.prototype as any, scoreCalculator).mockReturnValueOnce(0);
				const result = generateVerifiableCredential.getVerifiedCredentialInformation(
					mockYotiSessionId,
					mockCompletedYotiSessionPayload,
					mockDocumentFields,
					VcNameParts,
				);

				expect(result).toEqual({
					credentialSubject: {
						birthDate: [
							{
								value: "1990-01-01",
							},
						],
						name: [
							{
								nameParts: [
									{
										type: "GivenName",
										value: "John",
									},
									{
										type: "FamilyName",
										value: "Doe",
									},
								],
							},
						],
						passport: [
							{
								documentNumber: undefined,
								expiryDate: undefined,
								icaoIssuerCode: undefined,
							},
						],
					},
					evidence: [
						{
							txn: mockYotiSessionId,
							failedCheckDetails: [
								{
									checkMethod: "vcrypt",
									identityCheckPolicy: "published",
								},
								{
									biometricVerificationProcessLevel: 3,
									checkMethod: "bvr",
								},
							],
							type: "IdentityCheck",
							...expectedScores,
						},
					],
					rejectionReasons: [],
				});
			},
		);

		it("should return the verified credential information with all completed checks where scores are above 0", () => {
			const result = generateVerifiableCredential.getVerifiedCredentialInformation(
				mockYotiSessionId,
				mockCompletedYotiSessionPayload,
				mockDocumentFields,
				VcNameParts,
			);

			expect(result).toEqual({
				credentialSubject: {
					birthDate: [
						{
							value: "1990-01-01",
						},
					],
					name: [
						{
							nameParts: [
								{
									type: "GivenName",
									value: "John",
								},
								{
									type: "FamilyName",
									value: "Doe",
								},
							],
						},
					],
					passport: [
						{
							documentNumber: undefined,
							expiryDate: undefined,
							icaoIssuerCode: undefined,
						},
					],
				},
				evidence: [
					{
						txn: "yoti-session-id",
						checkDetails: [
							{
								checkMethod: "vcrypt",
								identityCheckPolicy: "published",
							},
							{
								biometricVerificationProcessLevel: 3,
								checkMethod: "bvr",
							},
						],
						strengthScore: 4,
						type: "IdentityCheck",
						validityScore: 3,
						verificationScore: 3,
					},
				],
				rejectionReasons: [],
			});
		});

		it.each([
			{ missingCheck: "IBV_VISUAL_REVIEW_CHECK", checks: [authenticityCheck, mockFaceMatchCheck, validityCheck, profileMatchCheck] },
			{ missingCheck: "PROFILE_DOCUMENT_MATCH", checks: [authenticityCheck, mockFaceMatchCheck, visualReviewCheck, validityCheck] },
			{ missingCheck: "DOCUMENT_SCHEME_VALIDITY_CHECK", checks: [authenticityCheck, mockFaceMatchCheck, visualReviewCheck, profileMatchCheck] },
			{ missingCheck: "ID_DOCUMENT_AUTHENTICITY", checks: [mockFaceMatchCheck, visualReviewCheck, validityCheck, profileMatchCheck] },
			{ missingCheck: "ID_DOCUMENT_FACE_MATCH", checks: [authenticityCheck, visualReviewCheck, validityCheck, profileMatchCheck] },
		])("should throw an error when $missingCheck check is missing", ({ checks }) => {
			const incompletePayload: any = {
				resources: {
					id_documents: [
						{
							document_type: "PASSPORT",
						},
					],
				},
				checks,
			};

			expect(() =>
				generateVerifiableCredential.getVerifiedCredentialInformation(mockYotiSessionId, incompletePayload, mockDocumentFields, VcNameParts),
			).toThrow("Missing mandatory checks in Yoti completed payload");
		});

		it.each([
			{
				missingCheck: "IBV_VISUAL_REVIEW_CHECK",
				checks: [authenticityCheck, mockFaceMatchCheck, { ...visualReviewCheck, state: "PENDING " }, validityCheck, profileMatchCheck],
			},
			{
				missingCheck: "PROFILE_DOCUMENT_MATCH",
				checks: [authenticityCheck, mockFaceMatchCheck, visualReviewCheck, validityCheck, { ...profileMatchCheck, state: "PENDING" }],
			},
			{
				missingCheck: "DOCUMENT_SCHEME_VALIDITY_CHECK",
				checks: [authenticityCheck, mockFaceMatchCheck, visualReviewCheck, { ...validityCheck, state: "PENDING" }, profileMatchCheck],
			},
			{
				missingCheck: "ID_DOCUMENT_AUTHENTICITY",
				checks: [{ ...authenticityCheck, state: "PENDING" }, mockFaceMatchCheck, visualReviewCheck, validityCheck, profileMatchCheck],
			},
			{
				missingCheck: "ID_DOCUMENT_FACE_MATCH",
				checks: [authenticityCheck, { ...mockFaceMatchCheck, state: "PENDING" }, visualReviewCheck, validityCheck, profileMatchCheck],
			},
		])("should throw an error when $missingCheck check is not complete", ({ checks }) => {
			const incompletePayload: any = {
				resources: {
					id_documents: [
						{
							document_type: "PASSPORT",
						},
					],
				},
				checks,
			};

			expect(() =>
				generateVerifiableCredential.getVerifiedCredentialInformation(mockYotiSessionId, incompletePayload, mockDocumentFields, VcNameParts),
			).toThrow("Mandatory checks not all completed");
		});
	});
});
