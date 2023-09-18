/* eslint-disable @typescript-eslint/unbound-method */
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { ISessionItem } from "../../../models/ISessionItem";
import { YotiCompletedSession } from "../../../models/YotiPayloads";
import { F2fService } from "../../../services/F2fService";
import { YotiService } from "../../../services/YotiService";
import { ThankYouEmailProcessor } from "../../../services/ThankYouEmailProcessor";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";

const mockF2fService = mock<F2fService>();
const mockYotiService = mock<YotiService>();
const logger = mock<Logger>();
const metrics = new Metrics({ namespace: "F2F" });
// pragma: allowlist nextline secret
const YOTI_PRIVATE_KEY = "YOTI_PRIVATE_KEY";
const sessionId = "RandomF2FSessionID";
let f2fSessionItem: ISessionItem;
let yotiSessionItem: YotiCompletedSession;
let thankYouEmailProcessor: ThankYouEmailProcessor;

function getMockSessionItem(): ISessionItem {
	const sessionInfo: ISessionItem = {
		sessionId,
		clientId: "ipv-core-stub",
		// pragma: allowlist nextline secret
		accessToken: "AbCdEf123456",
		clientSessionId: "sdfssg",
		authorizationCode: "",
		authorizationCodeExpiryDate: 0,
		redirectUri: "http://localhost:8085/callback",
		accessTokenExpiryDate: 0,
		expiryDate: 221848913376,
		createdDate: 1675443004,
		state: "Y@atr",
		subject: "sub",
		persistentSessionId: "sdgsdg",
		clientIpAddress: "127.0.0.1",
		attemptCount: 1,
		authSessionState: AuthSessionState.F2F_SESSION_CREATED,
	};
	return sessionInfo;
}

function getMockYotiSessionItem(): YotiCompletedSession {
	return {
		client_session_token_ttl: 2453254,
		session_id: "99ce0305-444e-4793-b1a2-36cac84e7a07",
		state: "ONGOING",
		resources: {
			id_documents: [
				{
					id: "c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
					tasks: [
						{
							type: "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
							id: "5e557551-51fc-49b8-9f2e-32da31cba8fd",
							state: "DONE",
							created: "2023-09-07T14:30:37Z",
							last_updated: "2023-09-07T14:31:16Z",
							generated_checks: [],
							generated_media: [
								{
									id: "e8841901-44fb-42b2-b6b8-88937a106d65",
									type: "JSON",
								},
							],
						},
					],
					source: {
						type: "IBV",
					},
					created_at: "2023-09-07T14:30:37Z",
					last_updated: "2023-09-07T14:31:16Z",
					document_type: "PASSPORT",
					issuing_country: "GBR",
					pages: [
						{
							capture_method: "CAMERA",
							media: {
								id: "3a5441af-da2b-4b9e-b2e3-db9c55e780e8",
								type: "IMAGE",
								created: "2023-09-07T14:31:07Z",
								last_updated: "2023-09-07T14:31:07Z",
							},
							frames: [
								{
									media: {
										id: "c502725a-3f16-4a7d-95ee-48b56281fe81",
										type: "IMAGE",
										created: "2023-09-07T14:31:08Z",
										last_updated: "2023-09-07T14:31:08Z",
									},
								},
							],
						},
					],
					document_fields: {
						media: {
							id: "e8841901-44fb-42b2-b6b8-88937a106d65",
							type: "JSON",
							created: "2023-09-07T14:31:16Z",
							last_updated: "2023-09-07T14:31:16Z",
						},
					},
					document_id_photo: {
						media: {
							id: "99e0d324-4023-4b81-8414-ddd391bb13e4",
							type: "IMAGE",
							created: "2023-09-07T14:31:16Z",
							last_updated: "2023-09-07T14:31:16Z",
						},
					},
				},
			],
			supplementary_documents: [],
			liveness_capture: [],
			face_capture: [
				{
					id: "d068c3e3-9bde-4cf8-bc7f-fe68c06777ca",
					tasks: [],
					source: {
						type: "IBV",
					},
					created_at: "2023-09-07T14:31:49Z",
					last_updated: "2023-09-07T14:32:01Z",
					image: {
						media: {
							id: "914014a3-703a-4a9b-834f-aad505e95d02",
							type: "IMAGE",
							created: "2023-09-07T14:32:01Z",
							last_updated: "2023-09-07T14:32:01Z",
						},
					},
				},
			],
			applicant_profiles: [
				{
					id: "0da43bf8-fc60-4d4d-b846-cdfe8cc96f2b",
					tasks: [],
					source: {
						type: "RELYING_BUSINESS",
					},
					created_at: "2023-09-07T14:29:12Z",
					last_updated: "2023-09-07T14:29:12Z",
					media: {
						id: "e8f55883-0071-4b46-a1e8-610b279b8a15",
						type: "JSON",
						created: "2023-09-07T14:29:12Z",
						last_updated: "2023-09-07T14:29:12Z",
					},
				},
			],
		},
		checks: [
			{
				type: "ID_DOCUMENT_AUTHENTICITY",
				id: "e29b5645-7cd1-4f42-94d7-0a2c43283f4c",
				state: "PENDING",
				resources_used: [
					"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
				],
				generated_media: [],
				created: "2023-09-07T14:32:13Z",
				last_updated: "2023-09-07T14:32:13Z",
			},
			{
				type: "ID_DOCUMENT_FACE_MATCH",
				id: "f4799bad-7a34-41f9-8956-be9fb22f9efe",
				state: "PENDING",
				resources_used: [
					"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
					"d068c3e3-9bde-4cf8-bc7f-fe68c06777ca",
				],
				generated_media: [],
				created: "2023-09-07T14:32:13Z",
				last_updated: "2023-09-07T14:32:13Z",
			},
			{
				type: "IBV_VISUAL_REVIEW_CHECK",
				id: "f1191e59-eb6c-4dca-9b15-88cff7187b2a",
				state: "DONE",
				resources_used: [
					"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
				],
				generated_media: [],
				report: {
					recommendation: {
						value: "APPROVE",
					},
					breakdown: [],
				}, 
				created: "2023-09-07T14:32:13Z",
				last_updated: "2023-09-07T14:32:13Z",
			},
			{
				type: "DOCUMENT_SCHEME_VALIDITY_CHECK",
				id: "f03051b1-532d-4388-95a3-9d07bb807429",
				state: "DONE",
				resources_used: [
					"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
				],
				generated_media: [],
				report: {
					recommendation: {
						value: "APPROVE",
					},
					breakdown: [],
				},
				created: "2023-09-07T14:32:13Z",
				last_updated: "2023-09-07T14:32:13Z",
				scheme: "UK_GDS",
			},
			{
				type: "PROFILE_DOCUMENT_MATCH",
				id: "05f16627-2803-4b20-b909-5dd3fba420ef",
				state: "DONE",
				resources_used: [
					"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
					"0da43bf8-fc60-4d4d-b846-cdfe8cc96f2b",
				],
				generated_media: [],
				report: {
					recommendation: {
						value: "APPROVE",
					},
					breakdown: [],
				},
				created: "2023-09-07T14:32:13Z",
				last_updated: "2023-09-07T14:32:13Z",
			},
		],
		user_tracking_id: "some_id",
	};
}

describe("ThankYouEmailProcessor", () => {
	beforeAll(() => {
		thankYouEmailProcessor = new ThankYouEmailProcessor(logger, metrics, YOTI_PRIVATE_KEY);
		// @ts-ignore
		thankYouEmailProcessor.f2fService = mockF2fService;
		// @ts-ignore
		thankYouEmailProcessor.yotiService = mockYotiService;
		f2fSessionItem = getMockSessionItem();
		yotiSessionItem = getMockYotiSessionItem();
		jest.useFakeTimers();
		jest.setSystemTime(new Date(1585695600000)); // == 2020-03-31T23:00:00.000Z
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("#processRequest", () =>{
		it("throws error if not yoti session ID has been provided", async () => {
			await expect(thankYouEmailProcessor.processRequest({ session_id: "", topic: "session_completion" })).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Event does not include yoti session_id",
			}));
			expect(logger.error).toHaveBeenCalledWith("Event does not include yoti session_id", {
				messageCode: MessageCodes.MISSING_SESSION_ID,
			});
		});

		it("throws error if F2F session can't be found", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(undefined);

			await expect(thankYouEmailProcessor.processRequest({ session_id: sessionId, topic: "session_completion" })).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Missing info in session table",
			}));
			expect(logger.error).toHaveBeenCalledWith("Session not found", {
				messageCode: MessageCodes.SESSION_NOT_FOUND,
			});
		});

		it("throws error if yoti session can't be found", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValue(f2fSessionItem);
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(undefined);

			await expect(thankYouEmailProcessor.processRequest({ session_id: sessionId, topic: "session_completion" })).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Yoti Session not found",
			}));
			expect(logger.error).toHaveBeenCalledWith({ message: "No Yoti Session found with ID" }, {
				yotiSessionID: sessionId,
				messageCode: MessageCodes.VENDOR_SESSION_NOT_FOUND,
			});
		});

		it("sends correctly formatted message to TxMA if all checks pass", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValue(f2fSessionItem);
			mockYotiService.getCompletedSessionInfo.mockResolvedValue(yotiSessionItem);
			// Mocking this so that our tests don't fail when daylight savings changes
			jest.spyOn(Date.prototype, "toLocaleDateString").mockReturnValue("07/09/2023");
			jest.spyOn(Date.prototype, "toLocaleTimeString").mockReturnValue("15:30:37");

			await thankYouEmailProcessor.processRequest({ session_id: sessionId, topic: "session_completion" });

			expect(Date.prototype.toLocaleDateString).toHaveBeenCalledWith("en-GB");
			expect(Date.prototype.toLocaleTimeString).toHaveBeenCalledWith("en-GB");
			expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith({
				event_name: "F2F_DOCUMENT_UPLOADED",
				client_id: "ipv-core-stub",
				component_id: "https://XXX-c.env.account.gov.uk",
				timestamp: 1585695600,
				user: {
					ip_address: "127.0.0.1",
					persistent_session_id: "sdgsdg",
					session_id: "RandomF2FSessionID",
					user_id: "sub",
				},
  			extensions: {
  				previous_govuk_signin_journey_id: f2fSessionItem.clientSessionId,
  				post_office_visit_details: {
  					post_office_date_of_visit: "07/09/2023",
  					post_office_time_of_visit: "15:30",
  				},
  			},
			});
			expect(logger.info).toHaveBeenCalledWith("Post office visit details", { postOfficeDateOfVisit: "07/09/2023", postOfficeTimeOfVisit: "15:30" });
		});
	});
});
