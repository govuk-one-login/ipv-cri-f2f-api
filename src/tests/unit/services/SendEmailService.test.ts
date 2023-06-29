import { Logger } from "@aws-lambda-powertools/logger";
import { SQSEvent } from "aws-lambda";
// @ts-ignore
import { NotifyClient } from "notifications-node-client";
import { VALID_SQS_EVENT } from "../data/sqs-events";
import { SendEmailProcessor } from "../../../services/SendEmailProcessor";
import { SendEmailService } from "../../../services/SendEmailService";
import { mock } from "jest-mock-extended";
import { EmailResponse } from "../../../models/EmailResponse";
import { Email } from "../../../models/Email";
import { AppError } from "../../../utils/AppError";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { YotiService } from "../../../services/YotiService";
import { F2fService } from "../../../services/F2fService";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { Response } from "../../../utils/Response";
import { VALID_AUTHCODE } from "../data/auth-events";
import { F2fResponse } from "../../../utils/F2fResponse";

const mockGovNotify = mock<NotifyClient>();
const mockYotiService = mock<YotiService>();
let sendEmailServiceTest: SendEmailService;
// pragma: allowlist nextline secret
const YOTI_PRIVATE_KEY = "sdfsdf";
// pragma: allowlist nextline secret
const GOVUKNOTIFY_API_KEY = "sdhohofsdf";
const logger = mock<Logger>();
let sqsEvent: SQSEvent;
const mockF2fService = mock<F2fService>();
function getMockSessionItem(): ISessionItem {
	const sess: ISessionItem = {
		sessionId: "sdfsdg",
		clientId: "ipv-core-stub",
		accessToken: "123456",
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
		authSessionState: AuthSessionState.F2F_YOTI_SESSION_CREATED,
	};
	return sess;
}
describe("SendEmailProcessor", () => {
	beforeAll(() => {
		sendEmailServiceTest = SendEmailService.getInstance(logger, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY);
		// @ts-ignore
		sendEmailServiceTest.govNotify = mockGovNotify;
		// @ts-ignore
		sendEmailServiceTest.yotiService = mockYotiService;
		// @ts-ignore
		sendEmailServiceTest.f2fService = mockF2fService;
		sqsEvent = VALID_SQS_EVENT;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		sqsEvent = VALID_SQS_EVENT;
	});

	it("Returns EmailResponse when email is sent successfully", async () => {
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		const sess = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(sess);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		mockYotiService.fetchInstructionsPdf.mockResolvedValue("gkiiho");
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message));
		const emailResponse = await sendEmailServiceTest.sendEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		expect(emailResponse?.emailFailureMessage).toBe("");
	});

	it("SendEmailService fails and doesnt retry when GovNotify throws an error", async () => {
		mockGovNotify.sendEmail = jest.fn().mockRejectedValue( {
			"response": {
				"data": {
					"errors": [
						{
							"error": "BadRequestError",
							"message": "Can't send to this recipient using a team-only API key",
						},
					],
					"status_code": 400,
				},

			},
		});
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message));
		await expect(sendEmailServiceTest.sendEmail(email)).rejects.toThrow();
		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
	});

	it("SendEmailService retries when GovNotify throws a 500 error", async () => {
		mockGovNotify.sendEmail = jest.fn().mockRejectedValue( {
			"response": {
				"data": {
					"errors": [
						{
							"error": "Exception",
							"message": "Internal server error",
						},
					],
					"status_code": 500,
				},

			},
		});

		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message));
		await expect(sendEmailServiceTest.sendEmail(email)).rejects.toThrow();
		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(4);
	});

	it("SendEmailService retries when GovNotify throws a 429 error", async () => {
		mockGovNotify.sendEmail = jest.fn().mockRejectedValue( {
			"response": {
				"data": {
					"errors": [
						{
							"error": "TooManyRequestsError",
							"message": "Exceeded send limits (LIMIT NUMBER) for today",
						},
					],
					"status_code": 429,
				},

			},
		});

		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message));
		await expect(sendEmailServiceTest.sendEmail(email)).rejects.toThrow();
		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(4);
	});

	it("Write to txMA fails when session id not found in the DB", async () => {
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		mockYotiService.fetchInstructionsPdf.mockResolvedValue("gkiiho");
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message));
		const emailResponse = await sendEmailServiceTest.sendEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(0);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue, session not found for sessionId: ", "eb26c8e0-397b-4f5e-b7a5-62cd0c6e510b");
		expect(emailResponse?.emailFailureMessage).toBe("");
	});

	it("Returns EmailResponse when email is sent successfully and write to txMA fails", async () => {
		const sess = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(sess);
		mockF2fService.sendToTXMA.mockRejectedValue({});

		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		mockYotiService.fetchInstructionsPdf.mockResolvedValue("gkiiho");
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message));
		const emailResponse = await sendEmailServiceTest.sendEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue.");
		expect(emailResponse?.emailFailureMessage).toBe("");
	});

});
