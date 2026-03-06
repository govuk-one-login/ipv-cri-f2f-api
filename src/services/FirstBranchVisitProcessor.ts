import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { F2fService } from "./F2fService";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { YotiCallbackPayload } from "../type/YotiCallbackPayload";
import { MessageCodes } from "../models/enums/MessageCodes";

export class FirstBranchVisitProcessor {
	private static instance: FirstBranchVisitProcessor;

	private readonly logger: Logger;
	private readonly metrics: Metrics;
	f2fService: F2fService;
	private readonly environmentVariables: EnvironmentVariables;

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.metrics = metrics;
		this.environmentVariables = new EnvironmentVariables(
			logger,
			ServicesEnum.CALLBACK_SERVICE,
		);

		this.f2fService = F2fService.getInstance(
			this.environmentVariables.sessionTable(),
			this.logger,
			this.metrics,
			createDynamoDbClient(),
		);
	}

	static getInstance(
		logger: Logger,
		metrics: Metrics,
	): FirstBranchVisitProcessor {
		if (!FirstBranchVisitProcessor.instance) {
			FirstBranchVisitProcessor.instance = new FirstBranchVisitProcessor(
				logger,
				metrics,
			);
		}
		return FirstBranchVisitProcessor.instance;
	}

	async processRequest(eventBody: YotiCallbackPayload): Promise<void> {
		const yotiSessionID = eventBody.session_id;

		if (!yotiSessionID) {
			this.logger.error("Missing session_id in FIRST_BRANCH_VISIT payload", {
				messageCode: MessageCodes.UNEXPECTED_VENDOR_MESSAGE,
			});
			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing session_id");
		}

		this.logger.info("Fetching F2F Session info with Yoti SessionID", { yotiSessionID });
		const f2fSession = await this.f2fService.getSessionByYotiId(yotiSessionID);

		if (!f2fSession) {
			this.logger.error("Session not found", {
				messageCode: MessageCodes.SESSION_NOT_FOUND,
			});
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing Info in Session Table");
		}

		this.logger.appendKeys({
			sessionId: f2fSession.sessionId,
			govuk_signin_journey_id: f2fSession.clientSessionId,
		});

		this.metrics.addMetric("first_branch_visit", MetricUnits.Count, 1);

		this.logger.info({
			message: "Recorded FIRST_BRANCH_VISIT metric",
			sessionId: f2fSession.sessionId,
			yotiSessionId: yotiSessionID,
		});
	}
}