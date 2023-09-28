import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { SQSEvent } from "aws-lambda";
import { VALID_SQS_EVENT, VALID_DYNAMIC_REMINDER_SQS_EVENT, VALID_REMINDER_SQS_EVENT } from "../data/sqs-events";
import { SendEmailProcessor } from "../../../services/SendEmailProcessor";
import { SendEmailService } from "../../../services/SendEmailService";
import { mock } from "jest-mock-extended";
import { EmailResponse } from "../../../models/EmailResponse";

let sendEmailProcessorTest: SendEmailProcessor;
const mockGovNotifyService = mock<SendEmailService>();
// pragma: allowlist nextline secret
const YOTI_PRIVATE_KEY = "sdfsdf";
// pragma: allowlist nextline secret
const GOVUKNOTIFY_API_KEY = "sdhohofsdf";
const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "F2F",
});
const metrics = new Metrics({ namespace: "F2F" });
let sqsEvent: SQSEvent;
let reminderEmailEvent: SQSEvent;
let dynamicEmailEvent: SQSEvent;

describe("SendEmailProcessor", () => {
	beforeAll(() => {

		sendEmailProcessorTest = new SendEmailProcessor(logger, metrics, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, "serviceId");
		// @ts-ignore
		sendEmailProcessorTest.govNotifyService = mockGovNotifyService;
		sqsEvent = VALID_SQS_EVENT;
		reminderEmailEvent = VALID_REMINDER_SQS_EVENT;
		dynamicEmailEvent = VALID_DYNAMIC_REMINDER_SQS_EVENT;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		sqsEvent = VALID_SQS_EVENT;
	});

	describe("PDF_EMAIL", () => {
		it("Returns success response when all required Email attributes exists", async () => {
			const expectedDateTime = new Date().toISOString();
			const mockEmailResponse = new EmailResponse(expectedDateTime, "", 201);
			mockGovNotifyService.sendYotiPdfEmail.mockResolvedValue(mockEmailResponse);
			const eventBody = JSON.parse(sqsEvent.Records[0].body);
			const emailResponse = await sendEmailProcessorTest.processRequest(eventBody);

			expect(emailResponse?.emailSentDateTime).toEqual(expectedDateTime);
			expect(emailResponse?.emailFailureMessage).toBe("");
		});

		it.each([
			"firstName",
			"lastName",
			"emailAddress",
		])("Throws error when event body message is missing required attributes", async (attribute) => {
			const eventBody = JSON.parse(sqsEvent.Records[0].body);
			const eventBodyMessage = eventBody.Message;
			delete eventBodyMessage[attribute];
			eventBody.Message = eventBodyMessage;
			await expect(sendEmailProcessorTest.processRequest(eventBody)).rejects.toThrow();
		});
	});

	describe("REMINDER_EMAIL", () => {
		it("Returns success response when all required Email attributes exists", async () => {
			const expectedDateTime = new Date().toISOString();
			const mockEmailResponse = new EmailResponse(expectedDateTime, "", 201);
			mockGovNotifyService.sendReminderEmail.mockResolvedValue(mockEmailResponse);
			const eventBody = JSON.parse(reminderEmailEvent.Records[0].body);
			const emailResponse = await sendEmailProcessorTest.processRequest(eventBody);

			expect(emailResponse?.emailSentDateTime).toEqual(expectedDateTime);
			expect(emailResponse?.emailFailureMessage).toBe("");
		});

		it.each([
			"emailAddress",
		])("Throws error when event body message is missing required attributes", async (attribute) => {
			const eventBody = JSON.parse(reminderEmailEvent.Records[0].body);
			const eventBodyMessage = eventBody.Message;
			delete eventBodyMessage[attribute];
			eventBody.Message = eventBodyMessage;
			await expect(sendEmailProcessorTest.processRequest(eventBody)).rejects.toThrow();
		});
	});

	describe("REMINDER_EMAIL_DYNAMIC", () => {
		it("Returns success response when all required Email attributes exists", async () => {
			const expectedDateTime = new Date().toISOString();
			const mockEmailResponse = new EmailResponse(expectedDateTime, "", 201);
			mockGovNotifyService.sendDynamicReminderEmail.mockResolvedValue(mockEmailResponse);
			const eventBody = JSON.parse(dynamicEmailEvent.Records[0].body);
			const emailResponse = await sendEmailProcessorTest.processRequest(eventBody);

			expect(emailResponse?.emailSentDateTime).toEqual(expectedDateTime);
			expect(emailResponse?.emailFailureMessage).toBe("");
		});

		it.each([
			"firstName",
			"lastName",
			"emailAddress",
			"docType",
		])("Throws error when event body message is missing required attributes", async (attribute) => {
			const eventBody = JSON.parse(dynamicEmailEvent.Records[0].body);
			const eventBodyMessage = eventBody.Message;
			delete eventBodyMessage[attribute];
			eventBody.Message = eventBodyMessage;
			await expect(sendEmailProcessorTest.processRequest(eventBody)).rejects.toThrow();
		});
	});

});
