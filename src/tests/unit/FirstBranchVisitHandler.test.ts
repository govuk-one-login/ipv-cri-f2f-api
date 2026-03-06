import { lambdaHandler, logger } from "../../FirstBranchVisitHandler";
import { FirstBranchVisitProcessor } from "../../services/FirstBranchVisitProcessor";
import { mock } from "jest-mock-extended";
import { CONTEXT } from "./data/context";
import { MessageCodes } from "../../models/enums/MessageCodes";

const mockedFirstBranchVisitProcessor = mock<FirstBranchVisitProcessor>();

jest.mock("../../services/FirstBranchVisitProcessor", () => {
	return {
		FirstBranchVisitProcessor: jest.fn(() => mockedFirstBranchVisitProcessor),
	};
});

describe("FirstBranchVisitHandler", () => {
	let loggerSpy: jest.SpyInstance;

	beforeEach(() => {
		jest.clearAllMocks();
		loggerSpy = jest.spyOn(logger, "error");
	});

	it("calls FirstBranchVisitProcessor when required attributes are present", async () => {
		FirstBranchVisitProcessor.getInstance = jest.fn().mockReturnValue(mockedFirstBranchVisitProcessor);

		await lambdaHandler(
			{ session_id: "1b655a2e-44e4-4b21-a626-7825abd9c93e", topic: "first_branch_visit" },
			CONTEXT,
		);

		expect(mockedFirstBranchVisitProcessor.processRequest).toHaveBeenCalledTimes(1);
		expect(mockedFirstBranchVisitProcessor.processRequest).toHaveBeenCalledWith({
			session_id: "1b655a2e-44e4-4b21-a626-7825abd9c93e",
			topic: "first_branch_visit",
		});
	});

	it("throws error if processor fails", async () => {
		FirstBranchVisitProcessor.getInstance = jest.fn().mockReturnValue(mockedFirstBranchVisitProcessor);
		mockedFirstBranchVisitProcessor.processRequest.mockRejectedValueOnce(new Error("boom"));

		await expect(
			lambdaHandler(
				{ session_id: "1b655a2e-44e4-4b21-a626-7825abd9c93e", topic: "first_branch_visit" },
				CONTEXT,
			),
		).rejects.toThrow(
			expect.objectContaining({
				message: "Failed to process first_branch_visit event",
			}),
		);

		expect(loggerSpy).toHaveBeenCalledWith({
			message: "Failed to process first_branch_visit event",
			error: expect.any(Error),
			messageCode: MessageCodes.BATCH_PROCESSING_FAILURE,
		});
	});
});