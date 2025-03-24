import { Response } from "../utils/Response";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { ValidationHelper } from "../utils/ValidationHelper";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { KmsJwtAdapter } from "../utils/KmsJwtAdapter";
import { ISessionItem } from "../models/ISessionItem";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { F2fService } from "./F2fService";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";

export class UserInfoRequestProcessor {
    private static instance: UserInfoRequestProcessor;

    private readonly logger: Logger;

    private readonly metrics: Metrics;

    private readonly validationHelper: ValidationHelper;

    private readonly f2fService: F2fService;

    private readonly kmsJwtAdapter: KmsJwtAdapter;

	private readonly environmentVariables: EnvironmentVariables;

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.USERINFO_SERVICE);
		this.validationHelper = new ValidationHelper();
		this.metrics = metrics;
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, this.metrics, createDynamoDbClient());
		this.kmsJwtAdapter = new KmsJwtAdapter(this.environmentVariables.kmsKeyArn());
	}

	static getInstance(logger: Logger, metrics: Metrics): UserInfoRequestProcessor {
    	if (!UserInfoRequestProcessor.instance) {
    		UserInfoRequestProcessor.instance = new UserInfoRequestProcessor(logger, metrics);
    	}
    	return UserInfoRequestProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    	// Validate the Authentication header and retrieve the sub (sessionId) from the JWT token.
    	let sub;
    	try {
    		sub = await this.validationHelper.eventToSubjectIdentifier(this.kmsJwtAdapter, event);
    	} catch (error) {
    		if (error instanceof AppError) {
    			this.logger.error({ message: "Error validating Authentication Access token from headers", error });
    			return Response( HttpCodesEnum.BAD_REQUEST, "Failed to Validate - Authentication header: " + error.message );
    		}
    	}

    	let session :ISessionItem | undefined;
    	try {
    		session = await this.f2fService.getSessionById(sub as string);
    		if (!session) {
				this.logger.error(`No session found with the sessionId: ${sub}`, { messageCode: MessageCodes.SESSION_NOT_FOUND });
    			return Response(HttpCodesEnum.BAD_REQUEST, `No session found with the sessionId: ${sub}`);
    		}
			this.logger.info({ message :"Found Session: " });
			this.logger.appendKeys({ sessionId: session.sessionId });
			this.logger.appendKeys({
				govuk_signin_journey_id: session?.clientSessionId,
			});
    	} catch (error) {
			this.logger.error({ message: "Error processing userInfo request", error });
    		return Response(HttpCodesEnum.BAD_REQUEST, `No session found with the sessionId: ${sub}`);
    	}

    	this.metrics.addMetric("found session", MetricUnits.Count, 1);
    	// Validate the AuthSessionState to be "F2F_ACCESS_TOKEN_ISSUED"
    	if (session.authSessionState === AuthSessionState.F2F_ACCESS_TOKEN_ISSUED) {
			this.logger.info("Returning success response");
			this.metrics.addMetric("UserInfo_pending_VC_returned", MetricUnits.Count, 1);

			return Response(HttpCodesEnum.ACCEPTED, JSON.stringify({
				sub: session.subject,
				"https://vocab.account.gov.uk/v1/credentialStatus": "pending",
			}));
		} else {
			this.logger.error({ message: `AuthSession is in wrong Auth state: Expected state- ${AuthSessionState.F2F_ACCESS_TOKEN_ISSUED}, actual state- ${session.authSessionState}` },
				{ messageCode: MessageCodes.INCORRECT_SESSION_STATE });
			return Response(HttpCodesEnum.UNAUTHORIZED, `AuthSession is in wrong Auth state: Expected state- ${AuthSessionState.F2F_ACCESS_TOKEN_ISSUED}, actual state- ${session.authSessionState}`);
		}
	}
}
