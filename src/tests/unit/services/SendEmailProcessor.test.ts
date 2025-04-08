import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
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
const metrics = mock<Metrics>();
let sqsEvent: SQSEvent;
let reminderEmailEvent: SQSEvent;
let dynamicEmailEvent: SQSEvent;

describe("SendEmailProcessor", () => {
	beforeAll(() => {

		sendEmailProcessorTest = new SendEmailProcessor(logger, metrics, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, "serviceId");
		// @ts-expect-error linting to be updated
		sendEmailProcessorTest.govNotifyService = mockGovNotifyService;
		sqsEvent = VALID_SQS_EVENT;
		reminderEmailEvent = VALID_REMINDER_SQS_EVENT;
		dynamicEmailEvent = VALID_DYNAMIC_REMINDER_SQS_EVENT;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		sqsEvent = VALID_SQS_EVENT;
		metrics.singleMetric.mockReturnValue(metrics);
	});

	describe("PDF_EMAIL", () => {
		it("Returns success response when all required Email attributes exists", async () => {
			const expectedDateTime = new Date().toISOString();
			const mockEmailResponse = new EmailResponse(expectedDateTime, "", 201, "1001");
			mockGovNotifyService.sendYotiPdfEmail.mockResolvedValue(mockEmailResponse);
			const eventBody = JSON.parse(sqsEvent.Records[0].body);
			const emailResponse = await sendEmailProcessorTest.processRequest(eventBody);

			expect(emailResponse?.emailSentDateTime).toEqual(expectedDateTime);
			expect(emailResponse?.emailFailureMessage).toBe("");
			expect(metrics.addDimension).toHaveBeenCalledWith("emailType", "Pdf");
			expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "GovNotify_email_sent", MetricUnits.Count, 1);
			expect(metrics.addMetric).toHaveBeenNthCalledWith(2, "GovNotify_PDF_email_sent", MetricUnits.Count, 1);
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
			expect(metrics.addMetric).not.toHaveBeenCalled();
		});
	});

	describe("REMINDER_EMAIL", () => {
		it("Returns success response when all required Email attributes exists", async () => {
			const expectedDateTime = new Date().toISOString();
			const mockEmailResponse = new EmailResponse(expectedDateTime, "", 201, "1002");
			mockGovNotifyService.sendReminderEmail.mockResolvedValue(mockEmailResponse);
			const eventBody = JSON.parse(reminderEmailEvent.Records[0].body);
			const emailResponse = await sendEmailProcessorTest.processRequest(eventBody);

			expect(emailResponse?.emailSentDateTime).toEqual(expectedDateTime);
			expect(emailResponse?.emailFailureMessage).toBe("");
			expect(metrics.addDimension).toHaveBeenCalledWith("emailType", "reminder");
			expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "GovNotify_email_sent", MetricUnits.Count, 1);
		});

		it.each([
			"emailAddress",
		])("Throws error when event body message is missing required attributes", async (attribute) => {
			const eventBody = JSON.parse(reminderEmailEvent.Records[0].body);
			const eventBodyMessage = eventBody.Message;
			delete eventBodyMessage[attribute];
			eventBody.Message = eventBodyMessage;
			await expect(sendEmailProcessorTest.processRequest(eventBody)).rejects.toThrow();
			expect(metrics.addMetric).not.toHaveBeenCalled();
		});
	});

	describe("REMINDER_EMAIL_DYNAMIC", () => {
		it("Returns success response when all required Email attributes exists", async () => {
			const expectedDateTime = new Date().toISOString();
			const mockEmailResponse = new EmailResponse(expectedDateTime, "", 201, "1003");
			mockGovNotifyService.sendDynamicReminderEmail.mockResolvedValue(mockEmailResponse);
			const eventBody = JSON.parse(dynamicEmailEvent.Records[0].body);
			const emailResponse = await sendEmailProcessorTest.processRequest(eventBody);

			expect(emailResponse?.emailSentDateTime).toEqual(expectedDateTime);
			expect(emailResponse?.emailFailureMessage).toBe("");
			expect(metrics.addDimension).toHaveBeenCalledWith("emailType", "dynamic_reminder");
			expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "GovNotify_email_sent", MetricUnits.Count, 1);
		});

		it.each([
			"sessionId",
			"yotiSessionId",
			"firstName",
			"lastName",
			"emailAddress",
		])("Throws error when event body message is missing required attributes", async (attribute) => {
			const eventBody = JSON.parse(dynamicEmailEvent.Records[0].body);
			const eventBodyMessage = eventBody.Message;
			delete eventBodyMessage[attribute];
			eventBody.Message = eventBodyMessage;
			await expect(sendEmailProcessorTest.processRequest(eventBody)).rejects.toThrow();
			expect(metrics.addMetric).not.toHaveBeenCalled();
		});
	});

});
