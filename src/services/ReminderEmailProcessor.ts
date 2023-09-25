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
import { buildReminderEmailEventFields } from "../utils/GovNotifyEvent";

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

  async processRequest(): Promise<Response> {
  	try {
  		const F2FSessionCreatedRecords = await this.f2fService.getSessionsByAuthSessionState(AuthSessionState.F2F_YOTI_SESSION_CREATED);

  		if (F2FSessionCreatedRecords.length === 0) {
  			this.logger.info(`No users with session state ${AuthSessionState.F2F_YOTI_SESSION_CREATED}`);
  			return { statusCode: HttpCodesEnum.OK, body: "No F2F_YOTI_SESSION_CREATED Records" };
  		}
 
  		const filteredSessions = F2FSessionCreatedRecords.filter(
  			({ createdDate, reminderEmailSent }) =>
  				createdDate >= Date.now() - 5 * 24 * 60 * 60 * 1000 && !reminderEmailSent,
  		);

  		if (filteredSessions.length === 0) {
  			this.logger.info(`No users with session state ${AuthSessionState.F2F_YOTI_SESSION_CREATED} older than 5 days`);
  			return { statusCode: HttpCodesEnum.OK, body: "No F2F_YOTI_SESSION_CREATED Sessions older than 5 days" };
  		}

  		this.logger.info("Total num. of users to send reminder emails to:", { numOfUsers: filteredSessions.length });

  		const usersToRemind = await Promise.all(
  			filteredSessions.map(async ({ sessionId }) => {
  				try {
  					const envVariables = new EnvironmentVariables(this.logger, ServicesEnum.REMINDER_SERVICE);
  					const personIdentityItem = await this.f2fService.getPersonIdentityById(sessionId, envVariables.personIdentityTableName());
  					if ( personIdentityItem ) {
  						return { sessionId, emailAddress: personIdentityItem.emailAddress };
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
  			.filter((user): user is { sessionId: any; emailAddress: string } => user !== null)
  			.map(async ({ sessionId, emailAddress }) => {
  				try {
  					await this.f2fService.sendToGovNotify(buildReminderEmailEventFields(emailAddress));
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
  			messageCode: MessageCodes.FAILED_FETHCING_SESSIONS,
  		});
  		return GenericServerError;
  	}

  	return { statusCode: HttpCodesEnum.OK, body: "Success" };
  }
}
