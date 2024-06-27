import { Response, GenericServerError } from "../utils/Response";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { Constants } from "../utils/Constants";
import { absoluteTimeNow } from "../utils/DateTimeUtils";

export class ExpiredSessionsProcessor {
  private static instance: ExpiredSessionsProcessor;

  private readonly f2fService: F2fService;

  constructor(private readonly logger: Logger, private readonly metrics: Metrics) {
  	const envVariables = new EnvironmentVariables(logger, ServicesEnum.REMINDER_SERVICE);
  	this.f2fService = F2fService.getInstance(envVariables.sessionTable(), logger, createDynamoDbClient());
  }

  static getInstance(logger: Logger, metrics: Metrics): ExpiredSessionsProcessor {
  	return this.instance || (this.instance = new ExpiredSessionsProcessor(logger, metrics));
  }

  async processRequest(): Promise<Response> {
  	try {
  		const sessionStates = [
  			AuthSessionState.F2F_YOTI_SESSION_CREATED,
  			AuthSessionState.F2F_AUTH_CODE_ISSUED,
  			AuthSessionState.F2F_ACCESS_TOKEN_ISSUED,
  		];

  		const records = await this.f2fService.getSessionsByAuthSessionStates(sessionStates, Constants.EXPIRED_SESSIONS_INDEX_NAME);

  		if (!records.length) {
  			this.logger.info(`No users with session states ${sessionStates}`);
  			return { statusCode: HttpCodesEnum.OK, body: "No Session Records matching state" };
  		}

  		const yotiSessionTTL = process.env.YOTI_SESSION_TTL_DAYS ? +process.env.YOTI_SESSION_TTL_DAYS : NaN;
  		if (isNaN(yotiSessionTTL)) {
  			throw new Error("YOTI_SESSION_TTL_DAYS is not defined or not a valid number.");
  		}

  		const expirationTime = absoluteTimeNow() - ((yotiSessionTTL + 1) * 24 * 60 * 60);
  		const sessionsToExpire = records.filter(
  			({ createdDate, expiredNotificationSent }) =>
  				(createdDate <= expirationTime) && !expiredNotificationSent,
  		);

  		if (!sessionsToExpire.length) {
  			this.logger.info(`No users with session states ${sessionStates} older than ${yotiSessionTTL + 1} days`);
  			return { statusCode: HttpCodesEnum.OK, body: "No Sessions older than specified TTL" };
  		}

  		this.logger.info("Total num. of user sessions to send expired notifications:", { numOfExpiredSessions: sessionsToExpire.length });

  		const ipvCoreSessionLogs: string[] = [];

  		await Promise.all(sessionsToExpire.map(async (session) => {
  			try {
  				await this.f2fService.sendToIPVCore({
  					sub: session.subject,
  					state: session.state,
  					error: "access_denied",
  					error_description: "Time given to visit PO has expired",
  				});
  				ipvCoreSessionLogs.push(session.sessionId);
  			} catch (error) {
  				this.logger.error("Failed to send error message to IPV Core Queue", {
  					sessionId: session.sessionId,
  					error,
  					session,
  					messageCode: MessageCodes.FAILED_SENDING_VC,
  				});
  			}
  		}));

  		this.logger.info("Successfully sent error message to IPV Core Queue", { count: ipvCoreSessionLogs.length, sessions: ipvCoreSessionLogs });

  		const markSessionsLogs: string[] = [];

  		await Promise.all(sessionsToExpire.map(async (session) => {
  			try {
  				await this.f2fService.markSessionAsExpired(session.sessionId);
  				markSessionsLogs.push(session.sessionId);
  			} catch (error) {
  				this.logger.error("Failed to set expired notification flag", {
  					sessionId: session.sessionId,
  					error,
  				});
  			}
  		}));

  		this.logger.info("Sessions marked as Expired", { count: markSessionsLogs.length, sessions: markSessionsLogs });

  		this.logger.info("All expired session notifications have been processed.");
  	} catch (error) {
  		this.logger.error("Unexpected error accessing session table", {
  			error,
  			messageCode: MessageCodes.FAILED_FETCHING_SESSIONS,
  		});
  		return GenericServerError;
  	}

  	return { statusCode: HttpCodesEnum.OK, body: "Success" };
  }
}
