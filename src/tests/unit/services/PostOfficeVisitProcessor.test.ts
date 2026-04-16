import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { mock } from "jest-mock-extended";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { YotiCallbackTopics } from "../../../models/enums/YotiCallbackTopics";
import { TxmaEventNames } from "../../../models/enums/TxmaEvents";
import { ISessionItem } from "../../../models/ISessionItem";
import { YotiCompletedSession } from "../../../models/YotiPayloads";
import { F2fService } from "../../../services/F2fService";
import { PostOfficeVisitProcessor } from "../../../services/PostOfficeVisitProcessor";
import { YotiService } from "../../../services/YotiService";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { VALID_FIRST_BRANCH_VISIT_EVENT, VALID_THANK_YOU_EMAIL_EVENT } from "../data/callback-events";
import { mockYotiSessionItemBST, mockYotiSessionItemGMT } from "../data/yoti-session";

const mockF2fService = mock<F2fService>();
const mockYotiService = mock<YotiService>();
const logger = mock<Logger>();
const metrics = mock<Metrics>();
// pragma: allowlist nextline secret
const YOTI_PRIVATE_KEY = "YOTI_PRIVATE_KEY";
const sessionId = "RandomF2FSessionID";

let postOfficeVisitProcessor: PostOfficeVisitProcessor;
let f2fSessionItem: ISessionItem;
let yotiSessionItem: YotiCompletedSession;

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

describe("PostOfficeVisitProcessor", () => {
	beforeAll(() => {
		postOfficeVisitProcessor = new PostOfficeVisitProcessor(logger, metrics, YOTI_PRIVATE_KEY);
		postOfficeVisitProcessor.f2fService = mockF2fService;
		YotiService.getInstance = jest.fn(() => mockYotiService);

		f2fSessionItem = getMockSessionItem();
		yotiSessionItem = mockYotiSessionItemGMT;
		jest.useFakeTimers();
		jest.setSystemTime(new Date(1585695600000)); // == 2020-03-31T23:00:00.000Z
	});

	beforeEach(() => {
		jest.restoreAllMocks();
	});

	describe("#processRequest", () => {
		it("routes first_branch_visit to processFirstBranchVisit", async () => {
			const processFirstBranchVisitSpy = jest
				.spyOn(postOfficeVisitProcessor, "processFirstBranchVisit")
				.mockResolvedValue({ statusCode: HttpCodesEnum.OK, headers: {}, body: "OK" });

			await postOfficeVisitProcessor.processRequest(VALID_FIRST_BRANCH_VISIT_EVENT);

			expect(processFirstBranchVisitSpy).toHaveBeenCalledWith(VALID_FIRST_BRANCH_VISIT_EVENT);
		});

		it("routes thank_you_email_requested to processThankYouEmail", async () => {
			const processThankYouEmailSpy = jest
				.spyOn(postOfficeVisitProcessor, "processThankYouEmail")
				.mockResolvedValue({ statusCode: HttpCodesEnum.OK, headers: {}, body: "OK" });

			await postOfficeVisitProcessor.processRequest(VALID_THANK_YOU_EMAIL_EVENT);

			expect(processThankYouEmailSpy).toHaveBeenCalledWith(VALID_THANK_YOU_EMAIL_EVENT);
		});

		it("returns OK response for unsupported topic", async () => {
			const response = await postOfficeVisitProcessor.processRequest({
				session_id: "123456789",
				topic: "unsupported_topic",
			});

			expect(logger.info).toHaveBeenCalledWith({
				message: "Ignoring unsupported yoti callback topic",
				topic: "unsupported_topic",
			});
			expect(response).toEqual(expect.objectContaining({
				statusCode: HttpCodesEnum.OK,
				body: "Ignored unsupported yoti callback topic",
			}));
		});
	});

	describe("#processFirstBranchVisit", () => {
		it("throws error if session_id is missing", async () => {
			await expect(
				postOfficeVisitProcessor.processFirstBranchVisit({
					session_id: "",
					topic: YotiCallbackTopics.FIRST_BRANCH_VISIT,
				}),
			).rejects.toThrow(
				expect.objectContaining({
					statusCode: HttpCodesEnum.BAD_REQUEST,
					message: "Missing session_id",
				}),
			);

			expect(logger.error).toHaveBeenCalledWith(
				"Missing session_id in FIRST_BRANCH_VISIT payload",
				{ messageCode: MessageCodes.UNEXPECTED_VENDOR_MESSAGE },
			);
			expect(metrics.addMetric).not.toHaveBeenCalled();
		});

		it("throws error if session cannot be found", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(undefined);

			await expect(
				postOfficeVisitProcessor.processFirstBranchVisit({
					session_id: "123456789",
					topic: YotiCallbackTopics.FIRST_BRANCH_VISIT,
				}),
			).rejects.toThrow(
				expect.objectContaining({
					statusCode: HttpCodesEnum.SERVER_ERROR,
					message: "Missing Info in Session Table",
				}),
			);

			expect(logger.error).toHaveBeenCalledWith("Session not found", {
				messageCode: MessageCodes.SESSION_NOT_FOUND,
			});
			expect(metrics.addMetric).not.toHaveBeenCalled();
		});

		it("records metric when session exists", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce({
				sessionId: "RandomF2FSessionID",
				clientSessionId: "govuk-journey-id",
			} as any);

			await postOfficeVisitProcessor.processFirstBranchVisit({
				session_id: "123456789",
				topic: YotiCallbackTopics.FIRST_BRANCH_VISIT,
			});

			expect(mockF2fService.getSessionByYotiId).toHaveBeenCalledWith("123456789");
			expect(logger.appendKeys).toHaveBeenCalledWith({
				sessionId: "RandomF2FSessionID",
				govuk_signin_journey_id: "govuk-journey-id",
			});
			expect(metrics.addMetric).toHaveBeenCalledWith("first_branch_visit", MetricUnits.Count, 1);
		});

		it("processFirstBranchVisit changes AuthSessionState to F2F_POST_OFFICE_VISITED", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValue(f2fSessionItem);

			await(postOfficeVisitProcessor.processFirstBranchVisit({
					session_id: "123456789",
					topic: YotiCallbackTopics.FIRST_BRANCH_VISIT,
				}))
			expect(mockF2fService.updateSessionAuthState).toHaveBeenCalledWith(
				"RandomF2FSessionID",
				AuthSessionState.F2F_POST_OFFICE_VISITED,
			)
		});
	});

	describe("#processThankYouEmail", () => {
		it("throws error if yoti session ID has not been provided", async () => {
			await expect(postOfficeVisitProcessor.processThankYouEmail({ session_id: "", topic: YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED })).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Event does not include yoti session_id",
			}));
			expect(logger.error).toHaveBeenCalledWith("Event does not include yoti session_id", {
				messageCode: MessageCodes.MISSING_SESSION_ID,
			});
			expect(metrics.addMetric).not.toHaveBeenCalled();
		});

		it("throws error if F2F session can't be found", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(undefined);

			await expect(postOfficeVisitProcessor.processThankYouEmail({ session_id: sessionId, topic: YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED })).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Missing info in session table",
			}));
			expect(logger.error).toHaveBeenCalledWith("Session not found", {
				messageCode: MessageCodes.SESSION_NOT_FOUND,
			});
			expect(metrics.addMetric).not.toHaveBeenCalled();
		});

		it("throws error if yoti session can't be found", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValue(f2fSessionItem);
			mockYotiService.getCompletedSessionInfo.mockResolvedValueOnce(undefined);

			await expect(postOfficeVisitProcessor.processThankYouEmail({ session_id: sessionId, topic: YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED })).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Yoti Session not found",
			}));
			expect(logger.error).toHaveBeenCalledWith({ message: "No Yoti Session found with ID" }, {
				yotiSessionID: sessionId,
				messageCode: MessageCodes.VENDOR_SESSION_NOT_FOUND,
			});
			expect(metrics.addMetric).not.toHaveBeenCalled();
		});

		it("records metric and sends correctly formatted message to TxMA if all checks pass", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValue(f2fSessionItem);
			mockYotiService.getCompletedSessionInfo.mockResolvedValue(yotiSessionItem);

			await postOfficeVisitProcessor.processThankYouEmail({ session_id: sessionId, topic: YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED });

			expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith({
				event_name: TxmaEventNames.F2F_DOCUMENT_UPLOADED,
				component_id: "https://XXX-c.env.account.gov.uk",
				timestamp: 1585695600,
				event_timestamp_ms: 1585695600000,
				user: {
					ip_address: "127.0.0.1",
					persistent_session_id: "sdgsdg",
					session_id: "RandomF2FSessionID",
					user_id: "sub",
				},
				extensions: {
					previous_govuk_signin_journey_id: f2fSessionItem.clientSessionId,
					post_office_visit_details: [{
						post_office_date_of_visit: "7 February 2023", post_office_time_of_visit: "2:30 pm",
					}],
				},
			});
			expect(logger.info).toHaveBeenCalledWith("Post office visit details", { postOfficeDateOfVisit: "7 February 2023", postOfficeTimeOfVisit: "2:30 pm" });
			expect(metrics.addMetric).toHaveBeenCalledWith("document_uploaded_at_PO", MetricUnits.Count, 1);
		});

		it("adjusts for BST correctly", async () => {
			yotiSessionItem = mockYotiSessionItemBST;
			mockF2fService.getSessionByYotiId.mockResolvedValue(f2fSessionItem);
			mockYotiService.getCompletedSessionInfo.mockResolvedValue(yotiSessionItem);

			await postOfficeVisitProcessor.processThankYouEmail({ session_id: sessionId, topic: YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED });

			expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith({
				event_name: TxmaEventNames.F2F_DOCUMENT_UPLOADED,
				component_id: "https://XXX-c.env.account.gov.uk",
				timestamp: 1585695600,
				event_timestamp_ms: 1585695600000,
				user: {
					ip_address: "127.0.0.1",
					persistent_session_id: "sdgsdg",
					session_id: "RandomF2FSessionID",
					user_id: "sub",
				},
				extensions: {
					previous_govuk_signin_journey_id: f2fSessionItem.clientSessionId,
					post_office_visit_details: [{
						post_office_date_of_visit: "7 September 2023", post_office_time_of_visit: "3:30 pm",
					}],
				},
			});
			expect(logger.info).toHaveBeenCalledWith("Post office visit details", { postOfficeDateOfVisit: "7 September 2023", postOfficeTimeOfVisit: "3:30 pm" });
			expect(metrics.addMetric).toHaveBeenCalledWith("document_uploaded_at_PO", MetricUnits.Count, 1);
		});

		it("processThankYouEmail changes AuthSessionState to F2F_YOTI_SESSION_COMPLETE", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValue(f2fSessionItem);

			await(postOfficeVisitProcessor.processThankYouEmail({
					session_id: sessionId,
					topic: YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED,
				}))
			expect(mockF2fService.updateSessionAuthState).toHaveBeenCalledWith(
				"RandomF2FSessionID",
				AuthSessionState.F2F_YOTI_SESSION_COMPLETE,
			)
		});
	});
});
