import { mock } from "jest-mock-extended";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { FirstBranchVisitProcessor } from "../../../services/FirstBranchVisitProcessor";
import { F2fService } from "../../../services/F2fService";
import { MessageCodes } from "../../../models/enums/MessageCodes";
import { HttpCodesEnum } from "../../../utils/HttpCodesEnum";

const mockF2fService = mock<F2fService>();
const logger = mock<Logger>();
const metrics = mock<Metrics>();

let firstBranchVisitProcessor: FirstBranchVisitProcessor;

describe("FirstBranchVisitProcessor", () => {
	beforeAll(() => {
		firstBranchVisitProcessor = new FirstBranchVisitProcessor(logger, metrics);
		firstBranchVisitProcessor.f2fService = mockF2fService;
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("throws error if session_id is missing", async () => {
		await expect(
			firstBranchVisitProcessor.processRequest({
				session_id: "",
				topic: "first_branch_visit",
			}),
		).rejects.toThrow(
			expect.objectContaining({
				statusCode: HttpCodesEnum.BAD_REQUEST,
				message: "Missing session_id",
			}),
		);

		expect(logger.error).toHaveBeenCalledWith(
			"Missing session_id in FIRST_BRANCH_VISIT payload",
			{ messageCode: MessageCodes.UNEXPECTED_VENDOR_MESSAGE },
		);
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("throws error if session cannot be found", async () => {
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce(undefined);

		await expect(
			firstBranchVisitProcessor.processRequest({
				session_id: "123456789",
				topic: "first_branch_visit",
			}),
		).rejects.toThrow(
			expect.objectContaining({
				statusCode: HttpCodesEnum.SERVER_ERROR,
				message: "Missing Info in Session Table",
			}),
		);

		expect(logger.error).toHaveBeenCalledWith("Session not found", {
			messageCode: MessageCodes.SESSION_NOT_FOUND,
		});
		expect(metrics.addMetric).not.toHaveBeenCalled();
	});

	it("records metric when session exists", async () => {
		mockF2fService.getSessionByYotiId.mockResolvedValueOnce({
			sessionId: "RandomF2FSessionID",
			clientSessionId: "govuk-journey-id",
		} as any);

		await firstBranchVisitProcessor.processRequest({
			session_id: "123456789",
			topic: "first_branch_visit",
		});

		expect(mockF2fService.getSessionByYotiId).toHaveBeenCalledWith("123456789");
		expect(logger.appendKeys).toHaveBeenCalledWith({
			sessionId: "RandomF2FSessionID",
			govuk_signin_journey_id: "govuk-journey-id",
		});
		expect(metrics.addMetric).toHaveBeenCalledWith("first_branch_visit", MetricUnits.Count, 1);
	});
});