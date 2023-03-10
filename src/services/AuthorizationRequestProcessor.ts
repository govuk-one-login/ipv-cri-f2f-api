import { Response } from "../utils/Response";
import { CicService } from "./CicService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { randomUUID } from "crypto";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { ValidationHelper } from "../utils/ValidationHelper";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { buildCoreEventFields } from "../utils/TxmaEvent";

const SESSION_TABLE = process.env.SESSION_TABLE;
const TXMA_QUEUE_URL = process.env.TXMA_QUEUE_URL;
const ISSUER = process.env.ISSUER!;

export class AuthorizationRequestProcessor {
	private static instance: AuthorizationRequestProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private readonly validationHelper: ValidationHelper;

	private readonly cicService: CicService;

	constructor(logger: Logger, metrics: Metrics) {
		if (!SESSION_TABLE || !TXMA_QUEUE_URL || !ISSUER) {
			logger.error("Environment variable SESSION_TABLE or TXMA_QUEUE_URL or ISSUER is not configured");
			throw new AppError( "Service incorrectly configured", HttpCodesEnum.SERVER_ERROR);
		}
		this.logger = logger;
		this.validationHelper = new ValidationHelper();
		this.metrics = metrics;
		this.cicService = CicService.getInstance(SESSION_TABLE, this.logger, createDynamoDbClient());
	}

	static getInstance(logger: Logger, metrics: Metrics): AuthorizationRequestProcessor {
		if (!AuthorizationRequestProcessor.instance) {
			AuthorizationRequestProcessor.instance = new AuthorizationRequestProcessor(logger, metrics);
		}
		return AuthorizationRequestProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent, sessionId: string): Promise<Response> {

		const session = await this.cicService.getSessionById(sessionId);

		if (session != null) {
			if (session.expiryDate < absoluteTimeNow()) {
				return new Response(HttpCodesEnum.UNAUTHORIZED, `Session with session id: ${sessionId} has expired`);
			}

			this.logger.info({ message: "found session", session });
			this.metrics.addMetric("found session", MetricUnits.Count, 1);
			if (session.authSessionState !== AuthSessionState.CIC_DATA_RECEIVED) {
				this.logger.warn(`Session is in the wrong state: ${session.authSessionState}, expected state should be ${AuthSessionState.CIC_DATA_RECEIVED}`);
				return new Response(HttpCodesEnum.UNAUTHORIZED, `Session is in the wrong state: ${session.authSessionState}`);
			}

			const authorizationCode = randomUUID();

			await this.cicService.setAuthorizationCode(sessionId, authorizationCode);

			this.metrics.addMetric("Set authorization code", MetricUnits.Count, 1);
			try {
				await this.cicService.sendToTXMA({
					event_name: "CIC_CRI_AUTH_CODE_ISSUED",
					...buildCoreEventFields(session, ISSUER, session.clientIpAddress, absoluteTimeNow),

				});
			} catch (error) {
				this.logger.error("Failed to write TXMA event CIC_CRI_AUTH_CODE_ISSUED to SQS queue.");
			}

			const cicResp = {
				authorizationCode: {
					value: authorizationCode,
				},
				redirect_uri: session?.redirectUri,
				state: session?.state,
			};

			return new Response(HttpCodesEnum.OK, JSON.stringify(cicResp));
		} else {
			return new Response(HttpCodesEnum.UNAUTHORIZED, `No session found with the session id: ${sessionId}`);
		}
	}
}
