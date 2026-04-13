import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { MessageCodes } from "../models/enums/MessageCodes";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { AuthSessionState } from "../models/enums/AuthSessionState";
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
import { APIGatewayProxyResult } from "aws-lambda";
import { Constants } from "../utils/Constants";
import { YotiCallbackTopics } from "../models/enums/YotiCallbackTopics";

export class PostOfficeVisitProcessor {
	private static instance: PostOfficeVisitProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	f2fService: F2fService;

	private yotiService!: YotiService;

	private readonly environmentVariables: EnvironmentVariables;

	private YOTI_PRIVATE_KEY?: string;

	private readonly validationHelper: ValidationHelper;

	constructor(
		logger: Logger,
		metrics: Metrics,
		YOTI_PRIVATE_KEY?: string,
	) {
		this.logger = logger;
		this.metrics = metrics;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.THANK_YOU_EMAIL_SERVICE);
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, this.metrics, createDynamoDbClient());
		this.YOTI_PRIVATE_KEY = YOTI_PRIVATE_KEY;
		this.validationHelper = new ValidationHelper();
	}

	static getInstance(
		logger: Logger,
		metrics: Metrics,
		YOTI_PRIVATE_KEY?: string,
	): PostOfficeVisitProcessor {
		if (!PostOfficeVisitProcessor.instance) {
			PostOfficeVisitProcessor.instance = new PostOfficeVisitProcessor(
				logger,
				metrics,
				YOTI_PRIVATE_KEY,
			);
		}
		if (YOTI_PRIVATE_KEY) {
			PostOfficeVisitProcessor.instance.YOTI_PRIVATE_KEY = YOTI_PRIVATE_KEY;
		}
		return PostOfficeVisitProcessor.instance;
	}

	async processRequest(eventBody: YotiCallbackPayload): Promise<void | APIGatewayProxyResult> {
		if (eventBody.topic === YotiCallbackTopics.FIRST_BRANCH_VISIT) {
			return this.processFirstBranchVisit(eventBody);
		}

		if (eventBody.topic === YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED) {
			return this.processThankYouEmail(eventBody);
		}

		this.logger.info({ message: "Ignoring unsupported yoti callback topic", topic: eventBody.topic });
		return Response(HttpCodesEnum.OK, "Ignored unsupported yoti callback topic");
	}

	async processFirstBranchVisit(eventBody: YotiCallbackPayload): Promise<APIGatewayProxyResult> {
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
			this.logger.error("Session not found", { messageCode: MessageCodes.SESSION_NOT_FOUND });
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
		return Response(HttpCodesEnum.OK, "OK");
	}

	async processThankYouEmail(eventBody: YotiCallbackPayload): Promise<APIGatewayProxyResult> {
		if (!this.validationHelper.checkRequiredYotiVars()) {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		}

		const yotiSessionID = eventBody.session_id;
		if (!yotiSessionID) {
			this.logger.error("Event does not include yoti session_id", {
				messageCode: MessageCodes.MISSING_SESSION_ID,
			});
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Event does not include yoti session_id");
		}

		this.logger.info("Fetching F2F Session info with Yoti SessionID", { yotiSessionID });
		const f2fSession = await this.f2fService.getSessionByYotiId(yotiSessionID);
		if (!f2fSession) {
			this.logger.error("Session not found", { messageCode: MessageCodes.SESSION_NOT_FOUND });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing info in session table");
		}

		this.logger.appendKeys({
			sessionId: f2fSession.sessionId,
			govuk_signin_journey_id: f2fSession.clientSessionId,
		});

		if (!this.YOTI_PRIVATE_KEY) {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "YOTI private key is not set");
		}

		//Initialise Yoti Service based on session client_id
		const clientConfig = getClientConfig(this.environmentVariables.clientConfig(), f2fSession.clientId, this.logger);

		if (!clientConfig) {
			this.logger.error("Unrecognised client in request", {
				messageCode: MessageCodes.UNRECOGNISED_CLIENT,
			});
			return Response(HttpCodesEnum.BAD_REQUEST, "Bad Request");
		}

		this.yotiService = YotiService.getInstance(this.logger, this.metrics, this.YOTI_PRIVATE_KEY);

		this.logger.info({ message: "Fetching yoti session" });
		const yotiSessionInfo: YotiCompletedSession | undefined = await this.yotiService.getCompletedSessionInfo(yotiSessionID, clientConfig.YotiBaseUrl);

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

		await this.f2fService.updateSessionAuthState(
			f2fSession.sessionId,
			AuthSessionState.F2F_POST_OFFICE_VISITED,
		);

		this.metrics.addMetric("document_uploaded_at_PO", MetricUnits.Count, 1);
		return Response(HttpCodesEnum.OK, "OK");
	}
}
