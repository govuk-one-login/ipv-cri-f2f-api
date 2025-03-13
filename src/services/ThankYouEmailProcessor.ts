import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { MessageCodes } from "../models/enums/MessageCodes";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { YotiCompletedSession } from "../models/YotiPayloads";
import { YotiCallbackPayload } from "../type/YotiCallbackPayload";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { Response } from "../utils/Response";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { YotiService } from "./YotiService";
import { TxmaEventNames } from "../models/enums/TxmaEvents";
import { getClientConfig } from "../utils/ClientConfig";
import { ValidationHelper } from "../utils/ValidationHelper";
import { Constants } from "../utils/Constants";
import { APIGatewayProxyResult } from "aws-lambda";

export class ThankYouEmailProcessor {

  private static instance: ThankYouEmailProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private readonly f2fService: F2fService;

	private yotiService!: YotiService;

  private readonly environmentVariables: EnvironmentVariables;

	private readonly YOTI_PRIVATE_KEY: string;
	
	private readonly validationHelper: ValidationHelper;

	constructor(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
	) {
  	this.logger = logger;
  	this.metrics = metrics;
  	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.THANK_YOU_EMAIL_SERVICE);
  	this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
		this.YOTI_PRIVATE_KEY = YOTI_PRIVATE_KEY;
		this.validationHelper = new ValidationHelper();
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

	async processRequest(eventBody: YotiCallbackPayload): Promise<APIGatewayProxyResult> {
		if (!this.validationHelper.checkRequiredYotiVars) throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		
		const startMetric = this.metrics.singleMetric();
		startMetric.addDimension("document_process_started", "true");

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

			//Initialise Yoti Service base on session client_id
			const clientConfig = getClientConfig(this.environmentVariables.clientConfig(), f2fSession.clientId, this.logger);

			if (!clientConfig) {
				this.logger.error("Unrecognised client in request", {
					messageCode: MessageCodes.UNRECOGNISED_CLIENT,
				});
				return Response(HttpCodesEnum.BAD_REQUEST, "Bad Request");
			}

			this.yotiService = YotiService.getInstance(this.logger, this.metrics, this.YOTI_PRIVATE_KEY);

  		this.logger.info({ message: "Fetching yoti session" });
		  const yotiSessionInfo: YotiCompletedSession | undefined = await this.yotiService.getCompletedSessionInfo(yotiSessionID, this.environmentVariables.fetchYotiSessionBackoffPeriod(), this.environmentVariables.fetchYotiSessionMaxRetries(), clientConfig.YotiBaseUrl);

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
  		const postOfficeTimeOfVisit = new Intl.DateTimeFormat("en-GB", {
				hour: "numeric",
				minute: "numeric",
				hourCycle: "h12",
				timeZone: "Europe/London",
			}).format(dateObject);

  		this.logger.info("Post office visit details", { postOfficeDateOfVisit, postOfficeTimeOfVisit });

  		await this.f2fService.sendToTXMA({
  			event_name: TxmaEventNames.F2F_DOCUMENT_UPLOADED,
  			...buildCoreEventFields(f2fSession, this.environmentVariables.issuer() as string, f2fSession.clientIpAddress),
  			extensions: {
  				previous_govuk_signin_journey_id: f2fSession.clientSessionId,
  				post_office_visit_details: [{
  					post_office_date_of_visit: postOfficeDateOfVisit,
  					post_office_time_of_visit: postOfficeTimeOfVisit,
  				}],
  			},
  		});


			this.metrics.addMetric("document_uploaded_at_PO", MetricUnits.Count, 1);
  		return Response(HttpCodesEnum.OK, "OK");

  	} else {
  		this.logger.error("Event does not include yoti session_id", { messageCode: MessageCodes.MISSING_SESSION_ID });
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Event does not include yoti session_id");
  	}
	}
}
