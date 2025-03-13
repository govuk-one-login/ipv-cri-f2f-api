/* eslint-disable max-lines-per-function */
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
import { TxmaEventNames } from "../../../models/enums/TxmaEvents";
import { mockYotiSessionItemBST, mockYotiSessionItemGMT } from "../data/yoti-session";

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


function getMockYotiSessionItem(mockYotiSessionItem: YotiCompletedSession): YotiCompletedSession {
	return mockYotiSessionItem;
}

describe("ThankYouEmailProcessor", () => {
	beforeAll(() => {
		thankYouEmailProcessor = new ThankYouEmailProcessor(logger, metrics, YOTI_PRIVATE_KEY);
		// @ts-expect-error linting to be updated
		thankYouEmailProcessor.f2fService = mockF2fService;
		
		YotiService.getInstance = jest.fn(() => mockYotiService);
		
		f2fSessionItem = getMockSessionItem();
		yotiSessionItem = getMockYotiSessionItem(mockYotiSessionItemGMT);
		jest.useFakeTimers();
		jest.setSystemTime(new Date(1585695600000)); // == 2020-03-31T23:00:00.000Z
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe("#processRequest", () =>{
		it("throws error if not yoti session ID has been provided", async () => {
			await expect(thankYouEmailProcessor.processRequest({ session_id: "", topic: "thank_you_email_requested" })).rejects.toThrow(expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Event does not include yoti session_id",
			}));
			expect(logger.error).toHaveBeenCalledWith("Event does not include yoti session_id", {
				messageCode: MessageCodes.MISSING_SESSION_ID,
			});
		});

		it("throws error if F2F session can't be found", async () => {
			mockF2fService.getSessionByYotiId.mockResolvedValueOnce(undefined);

			await expect(thankYouEmailProcessor.processRequest({ session_id: sessionId, topic: "thank_you_email_requested" })).rejects.toThrow(expect.objectContaining({
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

			await expect(thankYouEmailProcessor.processRequest({ session_id: sessionId, topic: "thank_you_email_requested" })).rejects.toThrow(expect.objectContaining({
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

			await thankYouEmailProcessor.processRequest({ session_id: sessionId, topic: "thank_you_email_requested" });

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
		});

		it("adjusts for BST correctly", async () => {
			yotiSessionItem = getMockYotiSessionItem(mockYotiSessionItemBST);
			mockF2fService.getSessionByYotiId.mockResolvedValue(f2fSessionItem);
			mockYotiService.getCompletedSessionInfo.mockResolvedValue(yotiSessionItem);

			await thankYouEmailProcessor.processRequest({ session_id: sessionId, topic: "thank_you_email_requested" });

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
		});
	});
});
