import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { TxmaEventNames } from "../models/enums/TxmaEvents";
import { APIGatewayProxyResult } from "aws-lambda";

export class AbortRequestProcessor {

  private static instance: AbortRequestProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private readonly f2fService: F2fService;

  private readonly environmentVariables: EnvironmentVariables;

  constructor(logger: Logger, metrics: Metrics) {
  	this.logger = logger;
  	this.metrics = metrics;
  	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.ABORT_SERVICE);
  	this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, this.metrics, createDynamoDbClient());
  }

  static getInstance(
  	logger: Logger,
  	metrics: Metrics,
  ): AbortRequestProcessor {
  	if (!AbortRequestProcessor.instance) {
  		AbortRequestProcessor.instance =
        new AbortRequestProcessor(logger, metrics);
  	}
  	return AbortRequestProcessor.instance;
  }

  async processRequest(sessionId: string, encodedHeader: string): Promise<APIGatewayProxyResult> {
  	const f2fSessionInfo = await this.f2fService.getSessionById(sessionId);
  	this.logger.appendKeys({
  		govuk_signin_journey_id: f2fSessionInfo?.clientSessionId,
  	});

  	if (!f2fSessionInfo) {
  		this.logger.warn("Missing details in SESSION TABLE", {
  			messageCode: MessageCodes.SESSION_NOT_FOUND,
  		});
  		throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing details in SESSION table");
  	}

  	const decodedRedirectUri = decodeURIComponent(f2fSessionInfo.redirectUri);
  	const hasQuestionMark = decodedRedirectUri.includes("?");
  	const redirectUri = `${decodedRedirectUri}${hasQuestionMark ? "&" : "?"}error=access_denied&state=${f2fSessionInfo.state}`;

  	if (f2fSessionInfo.authSessionState === AuthSessionState.F2F_CRI_SESSION_ABORTED) {
  		this.logger.info("Session has already been aborted");
  		return Response(HttpCodesEnum.OK, "Session has already been aborted", { Location: encodeURIComponent(redirectUri) });
  	}

  	try {
  	  await this.f2fService.updateSessionAuthState(f2fSessionInfo.sessionId, AuthSessionState.F2F_CRI_SESSION_ABORTED);
	  this.metrics.addMetric("state-F2F_CRI_SESSION_ABORTED", MetricUnits.Count, 1);

  	} catch (error) {
  		this.logger.error("Error occurred while aborting the session", {
  			error,
  			messageCode: MessageCodes.SERVER_ERROR,
  		});
  		if (error instanceof AppError) {
  			return Response(HttpCodesEnum.SERVER_ERROR, error.message);
  		} else {
  			return Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
  		}
  	}

  	try {
  		const coreEventFields = buildCoreEventFields(
  			f2fSessionInfo,
  			this.environmentVariables.issuer() as string,
  			f2fSessionInfo.clientIpAddress,
  		);
  		await this.f2fService.sendToTXMA({
  			event_name: TxmaEventNames.F2F_CRI_SESSION_ABORTED,
  			...coreEventFields,
  			user: {
  				...coreEventFields.user,
  				govuk_signin_journey_id: f2fSessionInfo.clientSessionId,
  			},
  		}, encodedHeader);
  	} catch (error) {
  		this.logger.error("Auth session successfully aborted. Failed to send F2F_CRI_SESSION_ABORTED event to TXMA", {
  			error,
  			messageCode: MessageCodes.FAILED_TO_WRITE_TXMA,
  		});
  	}

  	return Response(HttpCodesEnum.OK, "Session has been aborted", { Location: encodeURIComponent(redirectUri) });
  }
}
