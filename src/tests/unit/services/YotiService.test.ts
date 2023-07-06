/* eslint-disable @typescript-eslint/dot-notation */
import axios from "axios";
import { YotiService } from "../../../services/YotiService";
import { Logger } from "@aws-lambda-powertools/logger";
import { PersonIdentityItem } from "../../../models/PersonIdentityItem";
import { AppError } from "../../../utils/AppError";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { mock } from "jest-mock-extended";

jest.mock("@aws-lambda-powertools/logger");
jest.mock("axios");

const personDetails: PersonIdentityItem = {
	addresses: [
		{
			addressCountry: "United Kingdom",
			buildingName: "Sherman",
			uprn: 123456789,
			streetName: "Wallaby Way",
			postalCode: "F1 1SH",
			buildingNumber: "32",
			addressLocality: "Sidney",
		},
	],
	sessionId: "RandomF2FSessionID",
	emailAddress: "test123@gov.uk",
	birthDate: [
		{
			value: "1960-02-02",
		},
	],
	name: [
		{
			nameParts: [
				{
					type: "GivenName",
					value: "Frederick",
				},
				{
					type: "GivenName",
					value: "Joseph",
				},
				{
					type: "FamilyName",
					value: "Flintstone",
				},
			],
		},
	],
	expiryDate: 1612345678,
	createdDate: 1612335678,
};

const createSessionPayload = {
	client_session_token_ttl: "950400",
	resources_ttl: "1036800",
	ibv_options: {
		support: "MANDATORY",
	},
	user_tracking_id: "RandomF2FSessionID",
	notifications: {
		endpoint: "https://example.com/callback",
		topics: ["SESSION_COMPLETION", "INSTRUCTIONS_EMAIL_REQUESTED", "THANK_YOU_EMAIL_REQUESTED"],
		auth_token: "string",
		auth_type: "BASIC",
	},
	requested_checks: [
		{
			type: "IBV_VISUAL_REVIEW_CHECK",
			config: {
				manual_check: "IBV",
			},
		},
		{
			type: "PROFILE_DOCUMENT_MATCH",
			config: {
				manual_check: "IBV",
			},
		},
		{
			type: "DOCUMENT_SCHEME_VALIDITY_CHECK",
			config: {
				manual_check: "IBV",
				scheme: "UK_DBS",
			},
		},
		{
			type: "ID_DOCUMENT_AUTHENTICITY",
			config: {
				manual_check: "FALLBACK",
			},
		},
		{
			type: "ID_DOCUMENT_FACE_MATCH",
			config: {
				manual_check: "FALLBACK",
			},
		},
	],
	required_documents: [
		{
			type: "ID_DOCUMENT",
			filter: {
				type: "DOCUMENT_RESTRICTIONS",
				inclusion: "INCLUDE",
				allow_expired_documents: true,
				documents: [
					{
						country_codes: ["GBR"],
						document_types: ["PASSPORT"],
					},
				],
			},
		},
	],
	requested_tasks: [
		{
			type: "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
			config: {
				manual_check: "FALLBACK",
			},
		},
	],
	resources: {
		applicant_profile: {
			full_name: "Frederick Flintstone",
			date_of_birth: "1960-02-02",
			structured_postal_address: {
				address_format: 1,
				building_number: "32",
				address_line1: "Sherman Wallaby Way",
				town_city: "Sidney",
				postal_code: "F1 1SH",
				country_iso: "GBR",
				country: "United Kingdom",
			},
		},
	},
};

const generateInstructionsPayload = {
	contact_profile: {
		first_name: "Frederick",
		last_name: "Flintstone",
		email: "test123@gov.uk",
	},
	documents: [
		{
			requirement_id: "bbca2330-6279-4786-a5b7-ee77a84c6662",
			document: {
				type: "ID_DOCUMENT",
				country_code: "GBR",
				document_type: "PASSPORT",
			},
		},
	],
	branch: {
		type: "UK_POST_OFFICE",
		name: "The Funkytown Post office",
		address: "1 The Street, Funkytown",
		post_code: "SW19 4NS",
		location: {
			latitude: 0.34322,
			longitude: -42.48372,
		},
	},
};

describe("YotiService", () => {
	const logger = mock<Logger>();
	let axiosMock: jest.Mocked<typeof axios>;
	let yotiService: YotiService;

	beforeEach(() => {
		axiosMock = axios as jest.Mocked<typeof axios>;

		yotiService = new YotiService(
			logger,
			"CLIENT_SDK_ID",
			"1036800",
			"950400",
			"PEM_KEY",
			"YOTI_BASE_URL",
		);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe("getRSASignatureForMessage", () => {
		it("should return the mocked signature", () => {
			const getRSASignatureForMessageSpy = jest.spyOn(yotiService as any, "getRSASignatureForMessage").mockReturnValue("mockedSignature");

			const message = "test message";
			const signature = yotiService["getRSASignatureForMessage"](message);

			expect(getRSASignatureForMessageSpy).toHaveBeenCalledWith(message);
			expect(signature).toBe("mockedSignature");

			getRSASignatureForMessageSpy.mockRestore();
		});
	});

	describe("getApplicantProfile", () => {
		it("should return the applicant profile with the expected properties", () => {
			const applicantProfile = yotiService["getApplicantProfile"](personDetails);
			const expectedPostalAddress = {
				address_format: 1,
				address_line1: "Sherman Wallaby Way",
				building_number: "32",
				country: "United Kingdom",
				country_iso: "GBR",
				postal_code: "F1 1SH",
				town_city: "Sidney",
			};

			expect(applicantProfile.full_name).toBe("Frederick Flintstone");
			expect(applicantProfile.date_of_birth).toBe("1960-02-02");
			expect(applicantProfile.structured_postal_address).toEqual(expectedPostalAddress);
		});
	});

	describe("createSession", () => {
		const selectedDocument = "UKPASSPORT";
		const YOTICALLBACKURL = "https://example.com/callback";

		it("should create a Yoti session and return the session ID", async () => {
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue({
				url: "https://example.com/api/sessions",
				config: {},
			});

			axiosMock.post.mockResolvedValue({ data: { session_id: "session123" } });

			const sessionId = await yotiService.createSession(personDetails, selectedDocument, "GBR", YOTICALLBACKURL);

			expect(generateYotiRequestMock).toHaveBeenCalled();
			expect(axios.post).toHaveBeenCalledWith("https://example.com/api/sessions", createSessionPayload, {});
			expect(sessionId).toBe("session123");
		});

		it("should throw an AppError if there is an error creating the Yoti session", async () => {
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue({
				url: "https://example.com/api/sessions",
				config: {},
			});

			axiosMock.post.mockRejectedValueOnce(new Error("Failed to create session"));

			await expect(yotiService.createSession(personDetails, selectedDocument, "GBR", YOTICALLBACKURL)).rejects.toThrow(
				new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Yoti Session"),
			);

			expect(generateYotiRequestMock).toHaveBeenCalled();
			expect(axios.post).toHaveBeenCalledWith("https://example.com/api/sessions", expect.any(Object), expect.any(Object));
		});
	});

	describe("fetchSessionInfo", () => {
		const sessionId = "session123";
		const expectedResponse = {
			body: JSON.stringify({
				session_id: "4757f8f5-1670-4978-b6a2-fe3e401fb999",
				client_session_token_ttl: 1209600,
				requested_checks: [
					"ID_DOCUMENT_AUTHENTICITY",
					"ID_DOCUMENT_FACE_MATCH",
					"IBV_VISUAL_REVIEW_CHECK",
					"DOCUMENT_SCHEME_VALIDITY_CHECK",
					"PROFILE_DOCUMENT_MATCH",
				],
				applicant_profile: {
					media: {
						id: "97b8677d-8689-440e-9cf7-c67e8f97a986",
						type: "JSON",
						created: "2023-05-26T09:20:14Z",
						last_updated: "2023-05-26T09:20:14Z",
					},
				},
				capture: {
					required_resources: [
						{
							type: "ID_DOCUMENT",
							id: "fbfc94ad-5133-413c-92c9-6beb15b577d5",
							state: "REQUIRED",
							allowed_sources: [
								{
									type: "IBV",
								},
							],
							requested_tasks: [
								{
									type: "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
									state: "REQUIRED",
								},
							],
							ibv_client_assessments: [
								{
									type: "IBV_VISUAL_REVIEW_CHECK",
									state: "REQUIRED",
								},
								{
									scheme: "UK_DBS",
									state: "REQUIRED",
									type: "DOCUMENT_SCHEME_VALIDITY_CHECK",
								},
								{
									state: "REQUIRED",
									type: "PROFILE_DOCUMENT_MATCH",
								},
							],
							supported_countries: [
								{
									code: "GBR",
									supported_documents: [
										{
											type: "PASSPORT",
										},
									],
								},
							],
							allowed_capture_methods: "CAMERA",
							attempts_remaining: {
								RECLASSIFICATION: 2,
								GENERIC: 2,
							},
						},
						{
							type: "FACE_CAPTURE",
							id: "c41240f8-be60-4f70-8ee2-7231dac3b9bb",
							state: "REQUIRED",
							allowed_sources: [
								{
									type: "IBV",
								},
							],
						},
					],
				},
			}),
			parsedResponse: {
				applicant_profile: {
					media: {
						created: "2023-05-26T09:20:14Z",
						id: "97b8677d-8689-440e-9cf7-c67e8f97a986",
						last_updated: "2023-05-26T09:20:14Z",
						type: "JSON",
					},
				},
				capture: {
					required_resources: [
						{
							allowed_capture_methods: "CAMERA",
							allowed_sources: [
								{
									type: "IBV",
								},
							],
							attempts_remaining: {
								GENERIC: 2,
								RECLASSIFICATION: 2,
							},
							ibv_client_assessments: [
								{
									state: "REQUIRED",
									type: "IBV_VISUAL_REVIEW_CHECK",
								},
								{
									scheme: "UK_DBS",
									state: "REQUIRED",
									type: "DOCUMENT_SCHEME_VALIDITY_CHECK",
								},
								{
									state: "REQUIRED",
									type: "PROFILE_DOCUMENT_MATCH",
								},
							],
							id: "fbfc94ad-5133-413c-92c9-6beb15b577d5",
							requested_tasks: [
								{
									state: "REQUIRED",
									type: "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
								},
							],
							state: "REQUIRED",
							supported_countries: [
								{
									code: "GBR",
									supported_documents: [
										{
											type: "PASSPORT",
										},
									],
								},
							],
							type: "ID_DOCUMENT",
						},
						{
							allowed_sources: [
								{
									type: "IBV",
								},
							],
							id: "c41240f8-be60-4f70-8ee2-7231dac3b9bb",
							state: "REQUIRED",
							type: "FACE_CAPTURE",
						},
					],
				},
				client_session_token_ttl: 1209600,
				requested_checks: [
					"ID_DOCUMENT_AUTHENTICITY",
					"ID_DOCUMENT_FACE_MATCH",
					"IBV_VISUAL_REVIEW_CHECK",
					"DOCUMENT_SCHEME_VALIDITY_CHECK",
					"PROFILE_DOCUMENT_MATCH",
				],
				session_id: "4757f8f5-1670-4978-b6a2-fe3e401fb999",
				track_ip_address: true,
			},
			statusCode: 200,
		};

		it("should fetch Yoti session info and return the data", async () => {
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue({
				url: "https://example.com/api/sessions/session123/configuration",
				config: {},
			});

			axiosMock.get.mockResolvedValueOnce({ data: expectedResponse });

			const sessionInfo = await yotiService.fetchSessionInfo(sessionId);

			expect(generateYotiRequestMock).toHaveBeenCalled();
			expect(axios.get).toHaveBeenCalledWith("https://example.com/api/sessions/session123/configuration", {});
			expect(sessionInfo).toEqual(expectedResponse);
		});

		it("should throw an AppError if there is an error fetching the Yoti session info", async () => {
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue({
				url: "https://example.com/api/sessions/session123/configuration",
				config: {},
			});

			axiosMock.get.mockRejectedValueOnce(new Error("Failed to fetch session info"));

			await expect(yotiService.fetchSessionInfo(sessionId)).rejects.toThrow(
				new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching Yoti Session"),
			);

			expect(generateYotiRequestMock).toHaveBeenCalled();
			expect(axios.get).toHaveBeenCalledWith("https://example.com/api/sessions/session123/configuration", expect.any(Object));
		});
	});

	describe("generateInstructions", () => {
		const sessionID = "session123";
		const requirements = [
			{
				requirement_id: "bbca2330-6279-4786-a5b7-ee77a84c6662",
				document: {
					type: "ID_DOCUMENT",
					country_code: "GBR",
					document_type: "PASSPORT",
				},
			},
		];
		const PostOfficeSelection = {
			name: "The Funkytown Post office",
			address: "1 The Street, Funkytown",
			location: {
				latitude: 0.34322,
				longitude: -42.48372,
			},
			post_code: "SW19 4NS",
		};

		it("should generate instructions and return OK status code", async () => {
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue({
				url: "https://example.com/api/sessions/session123/instructions",
				config: {},
			});

			axiosMock.put.mockResolvedValueOnce({});

			const statusCode = await yotiService.generateInstructions(sessionID, personDetails, requirements, PostOfficeSelection);

			expect(generateYotiRequestMock).toHaveBeenCalled();
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(axios.put).toHaveBeenCalledWith(
				"https://example.com/api/sessions/session123/instructions",
				generateInstructionsPayload,
				{},
			);
			expect(statusCode).toBe(HttpCodesEnum.OK);
		});

		it("should throw an AppError if there is an error generating the instructions PDF", async () => {
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue({
				url: "https://example.com/api/sessions/session123/instructions",
				config: {},
			});

			axiosMock.put.mockRejectedValueOnce(new Error("Failed to generate instructions"));

			await expect(
				yotiService.generateInstructions(sessionID, personDetails, requirements, PostOfficeSelection),
			).rejects.toThrow(new AppError(HttpCodesEnum.SERVER_ERROR, "Error generating Yoti instructions PDF"));

			expect(generateYotiRequestMock).toHaveBeenCalled();
			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(axios.put).toHaveBeenCalledWith(
				"https://example.com/api/sessions/session123/instructions",
				generateInstructionsPayload,
				expect.any(Object),
			);
		});
	});

	describe("fetchInstructionsPdf", () => {
		const sessionId = "session123";

		it("should fetch Yoti instructions PDF and return the PDF data", async () => {
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue({
				url: "https://example.com/api/sessions/session123/instructions/pdf",
				config: {
					responseType: "arraybuffer",
					responseEncoding: "binary",
				},
			});

			const pdfData = "mocked-pdf-data";
			axiosMock.get.mockResolvedValueOnce({ data: pdfData });

			const fetchedPdf = await yotiService.fetchInstructionsPdf(sessionId);

			expect(generateYotiRequestMock).toHaveBeenCalled();
			expect(axios.get).toHaveBeenCalledWith(
				"https://example.com/api/sessions/session123/instructions/pdf",
				expect.any(Object),
			);
			expect(fetchedPdf).toBe(pdfData);
		});

		it("should throw an AppError if there is an error fetching the Yoti instructions PDF", async () => {
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue({
				url: "https://example.com/api/sessions/session123/instructions/pdf",
				config: {
					responseType: "arraybuffer",
					responseEncoding: "binary",
				},
			});

			axiosMock.get.mockRejectedValueOnce(new Error("Failed to fetch PDF"));

			await expect(yotiService.fetchInstructionsPdf(sessionId)).rejects.toThrow(
				new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching Yoti instructions PDF"),
			);

			expect(generateYotiRequestMock).toHaveBeenCalled();
			expect(axios.get).toHaveBeenCalledWith(
				"https://example.com/api/sessions/session123/instructions/pdf",
				expect.any(Object),
			);
		});
	});

	describe("getCompletedSessionInfo", () => {
		const sessionId = "session123";

		it("should fetch completed Yoti session info and return the data", async () => {
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue({
				url: "https://example.com/api/sessions/session123",
				config: {},
			});

			axiosMock.get.mockResolvedValueOnce({ data: {} });

			const completedSessionInfo = await yotiService.getCompletedSessionInfo(sessionId);

			expect(generateYotiRequestMock).toHaveBeenCalled();
			expect(axios.get).toHaveBeenCalledWith("https://example.com/api/sessions/session123", {});
			expect(completedSessionInfo).toEqual({});
		});

		it("should throw an AppError if there is an error fetching the completed Yoti session info", async () => {
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue({
				url: "https://example.com/api/sessions/session123",
				config: {},
			});

			axiosMock.get.mockRejectedValueOnce(new Error("Failed to fetch completed session info"));

			await expect(yotiService.getCompletedSessionInfo(sessionId)).rejects.toThrow(
				new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching Yoti Session"),
			);

			expect(generateYotiRequestMock).toHaveBeenCalled();
			expect(axios.get).toHaveBeenCalledWith("https://example.com/api/sessions/session123", expect.any(Object));
		});
	});

	describe("getMediaContent", () => {
		const sessionId = "session123";
		const mediaId = "media123";

		it("should fetch Yoti media content and return the data", async () => {
			const yotiRequest = {
				url: "https://example.com/api/sessions/session123/media/media123/content",
				config: {},
			};
			const generateYotiRequestMock = jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue(yotiRequest);
			const responseData = null;
			axiosMock.get.mockResolvedValueOnce({ data: responseData });

			const result = await yotiService.getMediaContent(sessionId, mediaId);

			expect(generateYotiRequestMock).toHaveBeenCalled();
			expect(axios.get).toHaveBeenCalledWith(
				yotiRequest.url,
				yotiRequest.config,
			);
			expect(result).toEqual(responseData);
		});

		it("should throw an AppError if there is an error fetching Yoti media content", async () => {
			const yotiRequest = {
				url: "https://example.com/api/sessions/session123/media/media123/content",
				config: {},
			};
			jest.spyOn(yotiService as any, "generateYotiRequest").mockReturnValue(yotiRequest);

			const error = new Error("Failed to fetch media content");
			axiosMock.get.mockRejectedValueOnce(error);

			await expect(yotiService.getMediaContent(sessionId, mediaId)).rejects.toThrow(
				new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching Yoti media content"),
			);

			expect(axios.get).toHaveBeenCalledWith(
				yotiRequest.url,
				yotiRequest.config,
			);
		});
	});
});
