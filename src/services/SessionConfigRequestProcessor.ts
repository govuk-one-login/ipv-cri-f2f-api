import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { captureMetric } from "@govuk-one-login/cri-metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "@govuk-one-login/cri-logger";
import { ValidationHelper } from "../utils/ValidationHelper";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";

export class SessionConfigRequestProcessor {
	private static instance: SessionConfigRequestProcessor;

	private readonly validationHelper: ValidationHelper;

	private readonly f2fService: F2fService;

	private readonly environmentVariables: EnvironmentVariables;
	

	constructor() {
		this.environmentVariables = new EnvironmentVariables(ServicesEnum.SESSION_CONFIG_SERVICE);
		this.validationHelper = new ValidationHelper();
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), createDynamoDbClient());
	}

	static getInstance(): SessionConfigRequestProcessor {
		if (!SessionConfigRequestProcessor.instance) {
			SessionConfigRequestProcessor.instance = new SessionConfigRequestProcessor();
		}
		return SessionConfigRequestProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent, sessionId: string): Promise<APIGatewayProxyResult> {

		logger.appendKeys({ sessionId });
		const session = await this.f2fService.getSessionById(sessionId);

		if (session != null) {
			if (session.expiryDate < absoluteTimeNow()) {
				logger.error("Session has expired", { messageCode: MessageCodes.EXPIRED_SESSION });
				return Response(HttpCodesEnum.UNAUTHORIZED, `Session with session id: ${sessionId} has expired`);
			}

			logger.info({ message: "Found Session, processing /sessionConfiguration" });
			logger.appendKeys({ sessionId: session.sessionId });
			logger.appendKeys({
				govuk_signin_journey_id: session?.clientSessionId,
			});

			captureMetric("found session");

			const f2fResp : { [key: string]: any } = {
				evidence_requested: session.evidence_requested,
			};

			if (session.evidence_requested?.strengthScore && session.evidence_requested?.strengthScore === 4) {
				logger.info("Requested Strength score is 4");
			} else if (session.evidence_requested?.strengthScore && session.evidence_requested?.strengthScore < 4) {
				logger.info("Requested Strength score is less than 4");
			} else {
				logger.info("Requested Strength score is not present");
			}

			return Response(HttpCodesEnum.OK, JSON.stringify(f2fResp));

		} else {
			logger.error("No session found for session id", {
				messageCode: MessageCodes.SESSION_NOT_FOUND,
			});
			return Response(HttpCodesEnum.UNAUTHORIZED, `No session found with the session id: ${sessionId}`);
		}
	}
}
