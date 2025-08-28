import { Logger } from "@aws-lambda-powertools/logger";
import { SendToGovNotifyService } from "../../../services/SendToGovNotifyService";
import { SendToGovNotifyProcessor } from "../../../services/SendToGovNotifyProcessor";
import { mock } from "jest-mock-extended";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";


let sendToGovNotifyProcessor: SendToGovNotifyProcessor;
const mockSendToGovNotifyService = mock<SendToGovNotifyService>();
// pragma: allowlist nextline secret
const GOVUKNOTIFY_API_KEY = "sdhohofsdf";
const logger = new Logger({
	logLevel: "DEBUG",
	serviceName: "F2F",
});
const metrics = mock<Metrics>();

describe("SendToGovNotify processor", () => {
	beforeAll(() => {
		sendToGovNotifyProcessor = SendToGovNotifyProcessor.getInstance(logger, metrics, GOVUKNOTIFY_API_KEY, "serviceId");
		// @ts-expect-error linting to be updated
		sendToGovNotifyProcessor.sendToGovNotifyService = mockSendToGovNotifyService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("successfully calls the SendToGovNotifyService with incoming event", async () => {
		await sendToGovNotifyProcessor.processRequest("24a61cb9-5930-46e1-8913-588c135431fb");
	
		 
		expect(mockSendToGovNotifyService.sendYotiInstructions).toHaveBeenCalledTimes(1);
	});

	it("throws AppError when SendToGovNotifyService throws error", async () => {
		mockSendToGovNotifyService.sendYotiInstructions.mockRejectedValueOnce("sendYotiInstructions - Cannot send Email");

		await expect(sendToGovNotifyProcessor.processRequest("sessionId")).rejects.toThrow("sendYotiInstructions - Cannot send Email");
		 
		expect(metrics.addMetric).toHaveBeenNthCalledWith(1, "SendToGovNotify_failed_to_send_instructions", MetricUnits.Count, 1);

	});

});
