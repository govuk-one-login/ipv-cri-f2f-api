import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Logger } from "@aws-lambda-powertools/logger";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { buildDynamicReminderEmailEventFields, buildReminderEmailEventFields } from "../utils/GovNotifyEvent";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { personIdentityUtils } from "../utils/PersonIdentityUtils";
import { APIGatewayProxyResult } from "aws-lambda";
import { Response } from "../utils/Response";

export class ReminderEmailProcessor {
  private static instance: ReminderEmailProcessor;

  private readonly f2fService: F2fService;

  constructor(private readonly logger: Logger, private readonly metrics: Metrics) {
  	const envVariables = new EnvironmentVariables(logger, ServicesEnum.REMINDER_SERVICE);
  	this.f2fService = F2fService.getInstance(envVariables.sessionTable(), logger, createDynamoDbClient());
  }

  static getInstance(logger: Logger, metrics: Metrics): ReminderEmailProcessor {
  	return this.instance || (this.instance = new ReminderEmailProcessor(logger, metrics));
  }

  async processRequest(): Promise<APIGatewayProxyResult> {
  	try {
  		const F2FSessionCreatedRecords = await this.f2fService.getSessionsByAuthSessionStates([AuthSessionState.F2F_YOTI_SESSION_CREATED, AuthSessionState.F2F_AUTH_CODE_ISSUED, AuthSessionState.F2F_ACCESS_TOKEN_ISSUED]);

  		if (F2FSessionCreatedRecords.length === 0) {
  			this.logger.info(`No users with session states ${[AuthSessionState.F2F_YOTI_SESSION_CREATED, AuthSessionState.F2F_AUTH_CODE_ISSUED, AuthSessionState.F2F_ACCESS_TOKEN_ISSUED]}`);
  			return { statusCode: HttpCodesEnum.OK, body: "No Session Records matching state" };
  		}
 
  		const filteredSessions = F2FSessionCreatedRecords.filter(
  			({ createdDate, reminderEmailSent }) =>
  				(createdDate <= absoluteTimeNow() - 5 * 24 * 60 * 60) && !reminderEmailSent,
  		);

  		if (filteredSessions.length === 0) {
  			this.logger.info(`No users with session states ${[AuthSessionState.F2F_YOTI_SESSION_CREATED, AuthSessionState.F2F_AUTH_CODE_ISSUED, AuthSessionState.F2F_ACCESS_TOKEN_ISSUED]} older than 5 days`);
  			return { statusCode: HttpCodesEnum.OK, body: "No Sessions older than 5 days" };
  		}

  		this.logger.info("Total num. of users to send reminder emails to:", { numOfUsers: filteredSessions.length });

  		const usersToRemind = await Promise.all(
  			filteredSessions.map(async ({ sessionId, documentUsed }) => {
  				try {
  					const envVariables = new EnvironmentVariables(this.logger, ServicesEnum.REMINDER_SERVICE);
  					const personIdentityItem = await this.f2fService.getPersonIdentityById(sessionId, envVariables.personIdentityTableName());
  					if ( personIdentityItem ) {
  						const nameParts = personIdentityUtils.getNames(personIdentityItem);
  						return { sessionId, emailAddress: personIdentityItem.emailAddress, firstName: nameParts.givenNames[0], lastName: nameParts.familyNames[0], documentUsed };
  					} else {
  						this.logger.warn("No records returned from Person Identity Table");
  						return null;
  					}
  				} catch (error) {
  					this.logger.error("Error fetching record from Person Identity Table", { error });
  				}
  			}),
  		);

  		if (usersToRemind.length === 0) {
  			return { statusCode: HttpCodesEnum.OK, body: "No PersonIdentity Records" };
  		}

  		const sendEmailPromises = usersToRemind
  			.filter((user): user is { sessionId: any; emailAddress: string; firstName: string; lastName: string; documentUsed: string } => user !== null)
  			.map(async ({ sessionId, emailAddress, firstName, lastName, documentUsed }) => {
  				try {
  					if (firstName && lastName && documentUsed) {
  						this.logger.info("Sending Dynamic Reminder Email", { sessionId });
  						await this.f2fService.sendToGovNotify(buildDynamicReminderEmailEventFields(emailAddress, firstName, lastName, documentUsed));
  					} else { 
  						this.logger.info("Sending Static Reminder Email", { sessionId });
  						await this.f2fService.sendToGovNotify(buildReminderEmailEventFields(emailAddress));
  					}
  					await this.f2fService.updateReminderEmailFlag(sessionId, true);
  					this.logger.info("Reminder email sent to user: ", { sessionId });
  				} catch (error) {
  					this.logger.error("Failed to send reminder email or update flag", { error });
  				}
  			});

  		await Promise.all(sendEmailPromises);
  	} catch (error) {
  		this.logger.error("Unexpected error accessing session table", {
  			error,
  			messageCode: MessageCodes.FAILED_FETCHING_SESSIONS,
  		});
  		return Response(HttpCodesEnum.SERVER_ERROR, "Internal server error");
  	}

  	return { statusCode: HttpCodesEnum.OK, body: "Success" };
  }
}
