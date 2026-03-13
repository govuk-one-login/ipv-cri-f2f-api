import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { F2fService } from "./F2fService";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { YotiCallbackPayload } from "../type/YotiCallbackPayload";
import { MessageCodes } from "../models/enums/MessageCodes";
import { CallbackSessionHelper } from "./callback/CallbackSessionHelper";

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
		const yotiSessionID = CallbackSessionHelper.getYotiSessionIdOrThrow(
			eventBody,
			this.logger,
			"Missing session_id in FIRST_BRANCH_VISIT payload",
			MessageCodes.UNEXPECTED_VENDOR_MESSAGE,
			HttpCodesEnum.BAD_REQUEST,
			"Missing session_id",
		);

		const f2fSession = await CallbackSessionHelper.getSessionByYotiIdOrThrow({
			f2fService: this.f2fService,
			logger: this.logger,
			yotiSessionID,
			notFoundStatusCode: HttpCodesEnum.SERVER_ERROR,
			notFoundErrorMessage: "Missing Info in Session Table",
		});

		this.metrics.addMetric("first_branch_visit", MetricUnits.Count, 1);

		this.logger.info({
			message: "Recorded FIRST_BRANCH_VISIT metric",
			sessionId: f2fSession.sessionId,
			yotiSessionId: yotiSessionID,
		});
	}
}
