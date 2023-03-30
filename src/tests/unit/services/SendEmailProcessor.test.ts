import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import {SQSEvent} from "aws-lambda";
import {VALID_SQS_EVENT} from "../data/sqs-events";
import {SendEmailProcessor} from "../../../services/SendEmailProcessor";

let sendEmailProcessorTest: SendEmailProcessor;
jest.mock("../../../services/GovNotifyService");

const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "F2F",
});
const metrics = new Metrics({ namespace: "F2F" });
let sqsEvent: SQSEvent;

describe("SendEmailProcessor", () => {
	beforeAll(() => {
		sendEmailProcessorTest = new SendEmailProcessor(logger, metrics);
		sqsEvent = VALID_SQS_EVENT;
	});

	beforeEach(() => {
		jest.clearAllMocks();
		sqsEvent = VALID_SQS_EVENT;
	});

	it.each([
		"fileName",
		"firstName",
		"lastName",
		"emailAddress"
	])("Throws error when event body message is missing required attributes", async (attribute) => {
		const eventBody = JSON.parse(sqsEvent.Records[0].body);
		const eventBodyMessage = JSON.parse(eventBody.Message);
		delete eventBodyMessage[attribute];
		eventBody.Message = eventBodyMessage;
		await expect(sendEmailProcessorTest.processRequest(eventBody)).rejects.toThrow();
	});

});
