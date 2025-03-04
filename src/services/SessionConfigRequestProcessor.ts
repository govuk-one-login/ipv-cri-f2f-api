import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { ValidationHelper } from "../utils/ValidationHelper";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { getParameter } from "../utils/Config";

export class SessionConfigRequestProcessor {
	private static instance: SessionConfigRequestProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private readonly validationHelper: ValidationHelper;

	private readonly f2fService: F2fService;

	private readonly environmentVariables: EnvironmentVariables;
	

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.SESSION_CONFIG_SERVICE);
		this.validationHelper = new ValidationHelper();
		this.metrics = metrics;
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient(), this.metrics);
	}

	static getInstance(logger: Logger, metrics: Metrics): SessionConfigRequestProcessor {
		if (!SessionConfigRequestProcessor.instance) {
			SessionConfigRequestProcessor.instance = new SessionConfigRequestProcessor(logger, metrics);
		}
		return SessionConfigRequestProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent, sessionId: string): Promise<APIGatewayProxyResult> {

		this.logger.appendKeys({ sessionId });
		const session = await this.f2fService.getSessionById(sessionId);

		if (session != null) {
			if (session.expiryDate < absoluteTimeNow()) {
				this.logger.error("Session has expired", { messageCode: MessageCodes.EXPIRED_SESSION });
				return Response(HttpCodesEnum.UNAUTHORIZED, `Session with session id: ${sessionId} has expired`);
			}

			this.logger.info({ message: "Found Session, processing /sessionConfiguration" });
			this.logger.appendKeys({ sessionId: session.sessionId });
			this.logger.appendKeys({
				govuk_signin_journey_id: session?.clientSessionId,
			});

			this.metrics.addMetric("found session", MetricUnits.Count, 1);

			const f2fResp : { [key: string]: any } = {
				evidence_requested: session.evidence_requested,
			};

			this.logger.info({ message: "Fetching PRINTED_CUSTOMER_LETTER_ENABLED flag from SSM" });
			try {
				const PRINTED_CUSTOMER_LETTER_ENABLED = await getParameter(this.environmentVariables.printedCustomerLetterEnabledSsmPath());
				f2fResp.pcl_enabled = PRINTED_CUSTOMER_LETTER_ENABLED;
			} catch (error) {
				this.logger.error(`Failed to get param from ssm at ${this.environmentVariables.printedCustomerLetterEnabledSsmPath()}`, {
					messageCode: MessageCodes.MISSING_PRINTED_CUSTOMER_LETTER_ENABLED_CONFIGURATION,
					error,
				});
			}

			if (session.evidence_requested?.strengthScore && session.evidence_requested?.strengthScore === 4) {
				this.logger.info("Requested Strength score is 4");
			} else if (session.evidence_requested?.strengthScore && session.evidence_requested?.strengthScore < 4) {
				this.logger.info("Requested Strength score is less than 4");
			} else {
				this.logger.info("Requested Strength score is not present");
			}

			return Response(HttpCodesEnum.OK, JSON.stringify(f2fResp));

		} else {
			this.logger.error("No session found for session id", {
				messageCode: MessageCodes.SESSION_NOT_FOUND,
			});
			return Response(HttpCodesEnum.UNAUTHORIZED, `No session found with the session id: ${sessionId}`);
		}
	}
}
