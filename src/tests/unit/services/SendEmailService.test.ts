/* eslint-disable @typescript-eslint/unbound-method */
import { Logger } from "@aws-lambda-powertools/logger";
import { SQSEvent } from "aws-lambda";
// @ts-ignore
import { NotifyClient } from "notifications-node-client";
import { VALID_SQS_EVENT, VALID_REMINDER_SQS_EVENT, VALID_DYNAMIC_REMINDER_SQS_EVENT } from "../data/sqs-events";
import { SendEmailService } from "../../../services/SendEmailService";
import { mock } from "jest-mock-extended";
import { EmailResponse } from "../../../models/EmailResponse";
import { Email } from "../../../models/Email";
import { YotiService } from "../../../services/YotiService";
import { F2fService } from "../../../services/F2fService";
import { ISessionItem } from "../../../models/ISessionItem";
import { AuthSessionState } from "../../../models/enums/AuthSessionState";
import { ReminderEmail } from "../../../models/ReminderEmail";
import { DynamicReminderEmail } from "../../../models/DynamicReminderEmail";

const mockGovNotify = mock<NotifyClient>();
const mockYotiService = mock<YotiService>();
let sendEmailServiceTest: SendEmailService;
// pragma: allowlist nextline secret
const YOTI_PRIVATE_KEY = "sdfsdf";
// pragma: allowlist nextline secret
const GOVUKNOTIFY_API_KEY = "sdhohofsdf";
const logger = mock<Logger>();
let sqsEvent: SQSEvent;
let reminderEmailEvent: SQSEvent;
let dynamicEmailEvent: SQSEvent;
const mockF2fService = mock<F2fService>();
function getMockSessionItem(): ISessionItem {
	const session: ISessionItem = {
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
		yotiSessionId: "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
	};
	return session;
}

const timestamp = 1689952318;

jest.mock("../../../utils/DateTimeUtils", () => ({
	absoluteTimeNow: () => timestamp,
}));

describe("SendEmailProcessor", () => {
	beforeAll(() => {
		sendEmailServiceTest = SendEmailService.getInstance(logger, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, "serviceId");
		// @ts-ignore
		sendEmailServiceTest.govNotify = mockGovNotify;
		// @ts-ignore
		sendEmailServiceTest.f2fService = mockF2fService;
		sqsEvent = VALID_SQS_EVENT;
		reminderEmailEvent = VALID_REMINDER_SQS_EVENT;
		dynamicEmailEvent = VALID_DYNAMIC_REMINDER_SQS_EVENT;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		sqsEvent = VALID_SQS_EVENT;
	});

	it.only("Returns EmailResponse when YOTI PDF email is sent successfully", async () => {
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		const session = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		mockYotiService.fetchInstructionsPdf.mockResolvedValue("gkiiho");
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message), logger);
		const emailResponse = await sendEmailServiceTest.sendYotiPdfEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledWith({
			event_name: "F2F_YOTI_PDF_EMAILED",
			client_id: "ipv-core-stub",
			component_id: "https://XXX-c.env.account.gov.uk",
			timestamp,
			extensions: {
				evidence: [
					{
						txn: "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
					},
				],
			},
			user: {
			  email: email.emailAddress,
			  govuk_signin_journey_id: session.clientSessionId,
			  ip_address: session.clientIpAddress,
			  persistent_session_id: session.persistentSessionId,
			  session_id: session.sessionId,
			  user_id: session.subject,
			},
		});
		expect(emailResponse.emailFailureMessage).toBe("");
	});

	it("SendEmailService fails and doesnt retry when GovNotify throws an error", async () => {
		mockGovNotify.sendEmail.mockRejectedValue( {
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
		const email = Email.parseRequest(JSON.stringify(eventBody.Message), logger);
		await expect(sendEmailServiceTest.sendYotiPdfEmail(email)).rejects.toThrow();
		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
	});

	it("SendEmailService retries when GovNotify throws a 500 error", async () => {
		mockGovNotify.sendEmail.mockRejectedValue( {
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
		const email = Email.parseRequest(JSON.stringify(eventBody.Message), logger);
		await expect(sendEmailServiceTest.sendYotiPdfEmail(email)).rejects.toThrow();
		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(4);
	});

	it("SendEmailService retries when GovNotify throws a 429 error", async () => {
		mockGovNotify.sendEmail.mockRejectedValue( {
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
		const email = Email.parseRequest(JSON.stringify(eventBody.Message), logger);
		await expect(sendEmailServiceTest.sendYotiPdfEmail(email)).rejects.toThrow();
		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(4);
	});

	it("Write to txMA fails when session id not found in the DB", async () => {
		mockF2fService.getSessionById.mockResolvedValue(undefined);
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		mockYotiService.fetchInstructionsPdf.mockResolvedValue("gkiiho");
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message), logger);
		const emailResponse = await sendEmailServiceTest.sendYotiPdfEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(0);
		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue, session not found for sessionId: ", "eb26c8e0-397b-4f5e-b7a5-62cd0c6e510b");
		expect(emailResponse?.emailFailureMessage).toBe("");
	});

	it("Returns EmailResponse when email is sent successfully and write to txMA fails", async () => {
		const session = getMockSessionItem();
		mockF2fService.getSessionById.mockResolvedValue(session);
		mockF2fService.sendToTXMA.mockRejectedValue({});

		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		mockYotiService.fetchInstructionsPdf.mockResolvedValue("gkiiho");
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(JSON.stringify(eventBody.Message), logger);
		const emailResponse = await sendEmailServiceTest.sendYotiPdfEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		expect(mockF2fService.sendToTXMA).toHaveBeenCalledTimes(1);
		expect(logger.error).toHaveBeenCalledWith("Failed to write TXMA event F2F_YOTI_PDF_EMAILED to SQS queue.");
		expect(emailResponse?.emailFailureMessage).toBe("");
	});

	it("Returns EmailResponse when Reminder email is sent successfully", async () => {
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		const eventBody = JSON.parse(reminderEmailEvent.Records[0].body);
		const email = ReminderEmail.parseRequest(JSON.stringify(eventBody.Message), logger);
		const emailResponse = await sendEmailServiceTest.sendReminderEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		expect(mockGovNotify.sendEmail).toHaveBeenCalledWith("1490de9b-d986-4404-b260-ece7f1837115", "example@test.com", { "reference": expect.any(String) });
		expect(emailResponse.emailFailureMessage).toBe("");
	});

	it("Returns EmailResponse when Dynamic Reminder email is sent successfully", async () => {
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);
		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		const eventBody = JSON.parse(dynamicEmailEvent.Records[0].body);
		const email = DynamicReminderEmail.parseRequest(JSON.stringify(eventBody.Message), logger);
		const emailResponse = await sendEmailServiceTest.sendDynamicReminderEmail(email);

		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		expect(mockGovNotify.sendEmail).toHaveBeenCalledWith("1490de9b-d986-4404-b260-ece7f1837116", "bhavana.hemanth@digital.cabinet-office.gov.uk", { "personalisation": { "chosen photo ID": "PASSPORT", "first name": "Frederick", "last name": "Flintstone" }, "reference": expect.any(String) });
		expect(emailResponse.emailFailureMessage).toBe("");
	});

});
