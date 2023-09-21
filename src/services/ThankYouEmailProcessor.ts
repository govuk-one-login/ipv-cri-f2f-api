import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { MessageCodes } from "../models/enums/MessageCodes";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { YotiCompletedSession } from "../models/YotiPayloads";
import { YotiCallbackPayload } from "../type/YotiCallbackPayload";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { AppError } from "../utils/AppError";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { Response } from "../utils/Response";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { YotiService } from "./YotiService";

export class ThankYouEmailProcessor {

  private static instance: ThankYouEmailProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private readonly f2fService: F2fService;

  private readonly yotiService: YotiService;

  private readonly environmentVariables: EnvironmentVariables;

  constructor(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
  ) {
  	this.logger = logger;
  	this.metrics = metrics;
  	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.THANK_YOU_EMAIL_SERVICE);
  	this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
  	this.yotiService = YotiService.getInstance(this.logger, this.environmentVariables.yotiSdk(), this.environmentVariables.resourcesTtlInSeconds(), this.environmentVariables.clientSessionTokenTtlInDays(), YOTI_PRIVATE_KEY, this.environmentVariables.yotiBaseUrl());
  }

  static getInstance(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
  ): ThankYouEmailProcessor {
  	if (!ThankYouEmailProcessor.instance) {
  		ThankYouEmailProcessor.instance = new ThankYouEmailProcessor(
  			logger,
  			metrics,
  			YOTI_PRIVATE_KEY,
  		);
  	}
  	return ThankYouEmailProcessor.instance;
  }

  async processRequest(eventBody: YotiCallbackPayload): Promise<Response> {
  	const yotiSessionID = eventBody.session_id;

  	this.logger.info({ message: "Fetching F2F Session info with Yoti SessionID" }, { yotiSessionID });
	  if (yotiSessionID) {
		  const f2fSession = await this.f2fService.getSessionByYotiId(yotiSessionID);

  		if (!f2fSession) {
			  this.logger.error("Session not found", {
				  messageCode: MessageCodes.SESSION_NOT_FOUND,
			  });
			  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing info in session table");
		  }

  		this.logger.appendKeys({
			  sessionId: f2fSession.sessionId,
			  govuk_signin_journey_id: f2fSession.clientSessionId,
		  });

  		this.logger.info({ message: "Fetching yoti session" });
		  const yotiSessionInfo: YotiCompletedSession | undefined = await this.yotiService.getCompletedSessionInfo(yotiSessionID);

		  if (!yotiSessionInfo) {
			  this.logger.error({ message: "No Yoti Session found with ID" }, {
  				yotiSessionID,
				  messageCode: MessageCodes.VENDOR_SESSION_NOT_FOUND,
			  });
			  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti Session not found");
		  }

  		const yotiSessionCreatedAt = yotiSessionInfo.resources.id_documents[0].created_at;
  		const dateObject = new Date(yotiSessionCreatedAt);
  		const postOfficeDateOfVisit = dateObject.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });
  		const postOfficeTimeOfVisit = dateObject.toLocaleTimeString("en-GB", { hour: "numeric", minute: "numeric", hour12: true });

  		this.logger.info("Post office visit details", { postOfficeDateOfVisit, postOfficeTimeOfVisit });

  		await this.f2fService.sendToTXMA({
  			event_name: "F2F_DOCUMENT_UPLOADED",
  			...buildCoreEventFields(f2fSession, this.environmentVariables.issuer() as string, f2fSession.clientIpAddress, absoluteTimeNow),
  			extensions: {
  				previous_govuk_signin_journey_id: f2fSession.clientSessionId,
  				post_office_visit_details: [{
  					post_office_date_of_visit: postOfficeDateOfVisit,
  					post_office_time_of_visit: postOfficeTimeOfVisit,
  				}],
  			},
  		});

  		return new Response(HttpCodesEnum.OK, "OK");

  	} else {
  		this.logger.error("Event does not include yoti session_id", { messageCode: MessageCodes.MISSING_SESSION_ID });
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Event does not include yoti session_id");
  	}
  }
}
