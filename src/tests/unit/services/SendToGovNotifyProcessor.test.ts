import { Logger } from "@aws-lambda-powertools/logger";
import { SendToGovNotifyService } from "../../../services/SendToGovNotifyService";
import { ValidationHelper } from "../../../utils/ValidationHelper";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";
import { AppError } from "../../../utils/AppError";
import { SendToGovNotifyProcessor } from "../../../services/SendToGovNotifyProcessor";
import { mock } from "jest-mock-extended";


let sendToGovNotifyProcessor: SendToGovNotifyProcessor;
const mockSendToGovNotifyService = mock<SendToGovNotifyService>();
// pragma: allowlist nextline secret
const GOVUKNOTIFY_API_KEY = "sdhohofsdf";
const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "F2F",
});

describe("SendToGovNotify processor", () => {
	beforeAll(() => {
		sendToGovNotifyProcessor = SendToGovNotifyProcessor.getInstance(logger, GOVUKNOTIFY_API_KEY, "serviceId");
		// @ts-ignore
		sendToGovNotifyProcessor.sendToGovNotifyService = mockSendToGovNotifyService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("successfully calls the SendToGovNotifyService with incoming event", async () => {
		await sendToGovNotifyProcessor.processRequest("24a61cb9-5930-46e1-8913-588c135431fb");
	
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockSendToGovNotifyService.sendYotiInstructions).toHaveBeenCalledTimes(1);
	});

	it("throws AppError when SendToGovNotifyService throws error", async () => {
		mockSendToGovNotifyService.sendYotiInstructions.mockRejectedValueOnce("sendYotiInstructions - Cannot send Email");

		await expect(sendToGovNotifyProcessor.processRequest("sessionId")).rejects.toThrow("sendYotiInstructions - Cannot send Email");
	});

});
