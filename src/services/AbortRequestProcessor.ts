import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { AuthSessionState } from "../models/enums/AuthSessionState";

export class AbortRequestProcessor {

  private static instance: AbortRequestProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private readonly f2fService: F2fService;

  private readonly environmentVariables: EnvironmentVariables;

  constructor(logger: Logger, metrics: Metrics) {
  	this.logger = logger;
  	this.metrics = metrics;
  	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.DOCUMENT_SELECTION_SERVICE);
  	this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
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

  async processRequest(sessionId: string): Promise<Response> {
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


  	if (f2fSessionInfo.authSessionState === AuthSessionState.F2F_CRI_SESSION_ABORTED) {
  		this.logger.info("Session has already been aborted");
  	  return new Response(HttpCodesEnum.OK, "Session has already been aborted");
  	}

  	try {
  	  await this.f2fService.updateSessionAuthState(f2fSessionInfo.sessionId, AuthSessionState.F2F_CRI_SESSION_ABORTED);
  	} catch (error) {
  		this.logger.error("Error occurred while aborting the session", {
  			error,
  			messageCode: MessageCodes.SERVER_ERROR,
  		});
  		if (error instanceof AppError) {
  			return new Response(HttpCodesEnum.SERVER_ERROR, error.message);
  		} else {
  			return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
  		}
  	}

  	// TODO this maybe needs to be a redirect?
  	return new Response(HttpCodesEnum.OK, "Session has been aborted");
  }
}
