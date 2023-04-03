import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { SQSEvent } from "aws-lambda";
// @ts-ignore
import { NotifyClient } from "notifications-node-client";
import { VALID_SQS_EVENT } from "../data/sqs-events";
import { SendEmailProcessor } from "../../../services/SendEmailProcessor";
import { GovNotifyService } from "../../../services/GovNotifyService";
import { mock } from "jest-mock-extended";
import { EmailResponse } from "../../../models/EmailResponse";
import { Email } from "../../../models/Email";
import { AppError } from "../../../utils/AppError";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import {YotiService} from "../../../services/YotiService";

const mockGovNotify = mock<NotifyClient>();
const mockYotiService = mock<YotiService>();
let govNotifyServiceTest: GovNotifyService;
const YOTI_PRIVATE_KEY = "sdfsdf";
const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "F2F",
});
const metrics = new Metrics({ namespace: "F2F" });
let sqsEvent: SQSEvent;

describe("SendEmailProcessor", () => {
	beforeAll(() => {
		govNotifyServiceTest = GovNotifyService.getInstance(logger, YOTI_PRIVATE_KEY);
		// @ts-ignore
		govNotifyServiceTest.govNotify = mockGovNotify;
		// @ts-ignore
		govNotifyServiceTest.yotiService = mockYotiService;
		sqsEvent = VALID_SQS_EVENT;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		sqsEvent = VALID_SQS_EVENT;
	});

	it("Returns EmailResponse when email is sent successfully", async () => {
		const mockEmailResponse = new EmailResponse(new Date().toISOString(), "", 201);

		mockGovNotify.sendEmail.mockResolvedValue(mockEmailResponse);
		mockYotiService.fetchInstructionsPdf.mockResolvedValue("gkiiho");
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(eventBody.Message);
		const emailResponse = await govNotifyServiceTest.sendEmail(email);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockGovNotify.sendEmail).toHaveBeenCalledTimes(1);
		expect(emailResponse.emailFailureMessage).toBe("");
	});

	it("GovNotifyService fails when GovNotify throws an error", async () => {
		mockGovNotify.sendEmail.mockImplementation(() => {
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Using team-only API key");
		});
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const email = Email.parseRequest(eventBody.Message);
		await expect(govNotifyServiceTest.sendEmail(email)).rejects.toThrow();
	});

});
