/* eslint-disable @typescript-eslint/dot-notation */
import { Logger } from "@aws-lambda-powertools/logger";
import { VerifiableCredentialService } from "../../../services/VerifiableCredentialService";
import { AppError } from "../../../utils/AppError";
import { Constants } from "../../../utils/Constants";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { KmsJwtAdapter } from "../../../utils/KmsJwtAdapter";
import { mock } from "jest-mock-extended";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import Ajv, { ValidateFunction } from "ajv";
import SpotSchema from "../data/spot-schema.json";

const ajv: Ajv = new Ajv({ strict: false, allErrors: true, verbose: true });
jest.mock("../../../utils/KmsJwtAdapter");

describe("VerifiableCredentialService", () => {
	let verifiableCredentialService: VerifiableCredentialService;
	const tableName = "test-table";
	const issuer = "test-issuer";
	const logger = mock<Logger>();
	const kmsJwtAdapter = new KmsJwtAdapter("kid");

	const credentialSubject = {
		"birthDate": [
			{
				"value": "1990-01-01",
			},
		],
		"name": [
			{
				"nameParts": [
					{
						"type": "GivenName",
						"value": "John",
					},
					{
						"type": "FamilyName",
						"value": "Doe",
					},
				],
			},
		],
		"passport": [
			{
				"documentNumber": "1234",
				"expiryDate": "01-01-2010",
				"icaoIssuerCode": "123456",
			},
		],

	};

	const evidence = [
		{
			"txn": "yoti-session-id",
			"checkDetails": [
				{
					"checkMethod": "vri",
					"identityCheckPolicy": "published",

				},
				{
					"biometricVerificationProcessLevel": 3,
					"checkMethod": "pvr",
				},
			],
			"strengthScore": 3,
			"type": "IdentityCheck",
			"validityScore": 2,
			"verificationScore": 3,
		},
	];

	const payloadToSign = {
		"iat": 123456789,
		"iss": "test-issuer",
		"nbf": 123456789,
		"sub": "testsub",
		"jti": expect.anything(),
		"vc": {
			"@context": [Constants.W3_BASE_CONTEXT, Constants.DI_CONTEXT],
			credentialSubject,
			evidence,
			"type": [
				Constants.VERIFIABLE_CREDENTIAL,
				Constants.IDENTITY_CHECK_CREDENTIAL,
			],
		},
	};

	beforeEach(() => {
		verifiableCredentialService = VerifiableCredentialService.getInstance(
			tableName,
			kmsJwtAdapter,
			issuer,
			logger,
		);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe("generateSignedVerifiableCredentialJwt", () => {
		const sessionItem: ISessionItem = {
			sessionId: "sdfsdg",
			clientId: "ipv-core-stub",
			// pragma: allowlist nextline secret
			accessToken: "AbCdEf123456",
			// pragma: allowlist nextline secret
			clientSessionId: "sdfssg",
			authorizationCode: "",
			authorizationCodeExpiryDate: 0,
			redirectUri: "http://localhost:8085/callback",
			accessTokenExpiryDate: 0,
			expiryDate: 221848913376,
			createdDate: 1675443004,
			state: "Y@atr",
			subject: "testsub",
			persistentSessionId: "sdgsdg",
			clientIpAddress: "127.0.0.1",
			attemptCount: 1,
			authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
		};

		it("should generate a signed verifiable credential JWT", async () => {
			const getNow = jest.fn().mockReturnValue(123456789);

			const signedJwt = "signed-jwt";
			const signMock = jest.spyOn(kmsJwtAdapter, "sign").mockResolvedValue(signedJwt);

			const jwt = await verifiableCredentialService.generateVerifiableCredentialJwt(
				sessionItem,
				credentialSubject,
				evidence,
				getNow,
			);

			const result = await verifiableCredentialService.signGeneratedVerifiableCredentialJwt(jwt);

			expect(getNow).toHaveBeenCalled();
			expect(signMock).toHaveBeenCalledWith(payloadToSign);
			expect(result).toBe(signedJwt);
		});

		it("should throw an AppError if signing the JWT fails", async () => {
			const getNow = jest.fn().mockReturnValue(123456789);

			const error = new Error("Failed to sign JWT");


			const signMock = jest.spyOn(kmsJwtAdapter, "sign").mockRejectedValue(error);
			await expect(verifiableCredentialService.signGeneratedVerifiableCredentialJwt({
				"sub": "testsub",
				"nbf": 123456789,
				"iss": "test-issuer",
				"iat": 123456789,
				"jti": "fsdfs",
				"vc": {
					"@context": [
						"https://www.w3.org/2018/credentials/v1",
						"https://vocab.account.gov.uk/contexts/identity-v1.jsonld",
					],
					"type": [
						"VerifiableCredential",
						"IdentityCheckCredential",
					],
					"credentialSubject": {
						"birthDate": [
							{
								"value": "1990-01-01",
							},
						],
						"name": [
							{
								"nameParts": [
									{
										"type": "GivenName",
										"value": "John",
									},
									{
										"type": "FamilyName",
										"value": "Doe",
									},
								],
							},
						],
						"passport": [
							{
								"documentNumber": "1234",
								"expiryDate": "01-01-2010",
								"icaoIssuerCode": "123456",
							},
						],
					},
					"evidence": [
						{
							"txn": "yoti-session-id",
							"checkDetails": [
								{
									"checkMethod": "vri",
									"identityCheckPolicy": "published",
								},
								{
									"biometricVerificationProcessLevel": 3,
									"checkMethod": "pvr",
								},
							],
							"strengthScore": 3,
							"type": "IdentityCheck",
							"validityScore": 2,
							"verificationScore": 3,
						},
					],
				},
			}))
				.rejects.toThrow(new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to sign Jwt"));

			expect(signMock).toHaveBeenCalledWith(payloadToSign);
		});
	});

	describe("buildVerifiableCredential", () => {
		const sessionItem: ISessionItem = {
			sessionId: "sdfsdg",
			clientId: "ipv-core-stub",
			// pragma: allowlist nextline secret
			accessToken: "AbCdEf123456",
			// pragma: allowlist nextline secret
			clientSessionId: "sdfssg",
			authorizationCode: "",
			authorizationCodeExpiryDate: 0,
			redirectUri: "http://localhost:8085/callback",
			accessTokenExpiryDate: 0,
			expiryDate: 221848913376,
			createdDate: 1675443004,
			state: "Y@atr",
			subject: "testsub",
			persistentSessionId: "sdgsdg",
			clientIpAddress: "127.0.0.1",
			attemptCount: 1,
			authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
		};
		it("should build a verifiable credential with the provided subject and evidence", () => {
			const verifiableCredential = verifiableCredentialService["buildVerifiableCredential"](
				credentialSubject,
				evidence,
			);

			expect(verifiableCredential["@context"]).toEqual([
				Constants.W3_BASE_CONTEXT,
				Constants.DI_CONTEXT,
			]);
			expect(verifiableCredential.type).toEqual([
				Constants.VERIFIABLE_CREDENTIAL,
				Constants.IDENTITY_CHECK_CREDENTIAL,
			]);
			expect(verifiableCredential.credentialSubject).toBe(credentialSubject);
			expect(verifiableCredential.evidence).toBe(evidence);
		});

		it("generated unsigned VC should conform to SPOT schema", async () => {
			const getNow = jest.fn().mockReturnValue(123456789);
			const result = await verifiableCredentialService.generateVerifiableCredentialJwt(
				sessionItem,
				credentialSubject,
				evidence,
				getNow,
			);


			const validate: ValidateFunction = ajv.compile(SpotSchema);
			const isValid = validate(result);
			expect(isValid).toBe(true);
			expect(result).toEqual({
				"sub": "testsub",
				"nbf": 123456789,
				"iss": "test-issuer",
				"iat": 123456789,
				"jti": expect.anything(),
				"vc": {
					"@context": [
						"https://www.w3.org/2018/credentials/v1",
						"https://vocab.account.gov.uk/contexts/identity-v1.jsonld",
					],
					"type": [
						"VerifiableCredential",
						"IdentityCheckCredential",
					],
					"credentialSubject": {
						"birthDate": [
							{
								"value": "1990-01-01",
							},
						],
						"name": [
							{
								"nameParts": [
									{
										"type": "GivenName",
										"value": "John",
									},
									{
										"type": "FamilyName",
										"value": "Doe",
									},
								],
							},
						],
						"passport": [
							{
								"documentNumber": "1234",
								"expiryDate": "01-01-2010",
								"icaoIssuerCode": "123456",
							},
						],
					},
					"evidence": [
						{
							"txn": "yoti-session-id",
							"checkDetails": [
								{
									"checkMethod": "vri",
									"identityCheckPolicy": "published",
								},
								{
									"biometricVerificationProcessLevel": 3,
									"checkMethod": "pvr",
								},
							],
							"strengthScore": 3,
							"type": "IdentityCheck",
							"validityScore": 2,
							"verificationScore": 3,
						},
					],
				},
			});
		});
	});

});
