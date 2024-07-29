/* eslint-disable @typescript-eslint/unbound-method */
import { lambdaHandler, logger } from "../../GenerateYotiLetterHandler";
import { GenerateYotiLetterProcessor } from "../../services/GenerateYotiLetterProcessor";
import { mock } from "jest-mock-extended";
import { CONTEXT } from "./data/context";
import { getParameter } from "../../utils/Config";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockedGenerateYotiLetterProcessor = mock<GenerateYotiLetterProcessor>();

jest.mock("../../services/GenerateYotiLetterProcessor", () => {
	return {
		GenerateYotiLetterProcessor: jest.fn(() => mockedGenerateYotiLetterProcessor),
	};
});

jest.mock("../../utils/Config", () => ({
	getParameter: jest.fn(),
}));


describe("GenerateYotiLetterHandler", () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		loggerSpy = jest.spyOn(logger, "error");
	});

	it("calls GenerateYotiLetterProcessor if Yoti SSM key is present", async () => {
		const key = "YOTI/PRIVATE_KEY";
		(getParameter as jest.Mock).mockResolvedValueOnce(key);
		GenerateYotiLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGenerateYotiLetterProcessor);

		await lambdaHandler({ "sessionId":"randomSessionId" }, CONTEXT);

		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockedGenerateYotiLetterProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(mockedGenerateYotiLetterProcessor.processRequest).toHaveBeenCalledWith({ "sessionId":"randomSessionId" });
	});

	it("fails to call GenerateYotiLetterProcessor if there is an error retrieving Yoti SSM key", async () => {
		GenerateYotiLetterProcessor.getInstance = jest.fn().mockReturnValue(mockedGenerateYotiLetterProcessor);
		(getParameter as jest.Mock).mockRejectedValueOnce("Error");
		
		const result = await lambdaHandler({ "sessionId":"randomSessionId" }, CONTEXT);

		expect(loggerSpy).toHaveBeenCalledWith({
			message: "Error fetching Yoti private key",
			error: "Error",
			messageCode: MessageCodes.SERVER_ERROR,
		});
		expect(mockedGenerateYotiLetterProcessor.processRequest).toHaveBeenCalledTimes(0);
		expect(result.statusCode).toBe(500);

	});
});
