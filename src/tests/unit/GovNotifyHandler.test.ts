import { mock } from "vitest-mock-extended";
import { lambdaHandler } from "../../GovNotifyHandler";
import { SendEmailProcessor } from "../../services/SendEmailProcessor";
import { VALID_SQS_EVENT } from "./data/sqs-events";
import { HttpCodesEnum } from "../../utils/HttpCodesEnum";
import { AppError } from "../../utils/AppError";
import { CONTEXT } from "./data/context";
import { failEntireBatch } from "../../utils/SqsBatchResponseHelper";

const mockedSendEmailRequestProcessor = mock<SendEmailProcessor>();

vi.mock("../../services/SendEmailProcessor", () => {
	return {
		SendEmailProcessor: vi.fn(() => mockedSendEmailRequestProcessor),
	};
});

vi.mock("../../utils/Config", () => {
	return {
		getParameter: vi.fn(() => {return "dgsdgsg";}),
	};
});
describe("GovNotifyHandler", () => {
	it("return success response for govNotify", async () => {
		SendEmailProcessor.getInstance = vi.fn().mockReturnValue(mockedSendEmailRequestProcessor);
		await lambdaHandler(VALID_SQS_EVENT, CONTEXT );

		 
		expect(mockedSendEmailRequestProcessor.processRequest).toHaveBeenCalledTimes(1);
	});

	it("returns Bad request when number of records in the SQS message is more than 1", async () => {
		const event = { "Records": [] };
		const response = await lambdaHandler(event, CONTEXT);
		expect(response).toEqual(failEntireBatch);
	});

	it("errors when email processor throws AppError", async () => {
		SendEmailProcessor.getInstance = vi.fn().mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "emailSending - failed: got error while sending email.");
		});
		const response = await lambdaHandler(VALID_SQS_EVENT, CONTEXT);
		expect(response).toEqual(failEntireBatch);

	});

	it("errors when email processor throws AppError with shouldThrow set to true", async () => {
		SendEmailProcessor.getInstance = vi.fn().mockImplementation(() => {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "GOV UK Notify unable to send email.", { shouldThrow: true });
		});

		const response = await lambdaHandler(VALID_SQS_EVENT, CONTEXT);
		expect(response).toEqual(expect.objectContaining({
			batchItemFailures: expect.anything(),
		}));

	});
});
