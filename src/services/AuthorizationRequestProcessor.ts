/* eslint-disable max-lines-per-function */
import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { randomUUID } from "crypto";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";

export class AuthorizationRequestProcessor {
	private static instance: AuthorizationRequestProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private readonly f2fService: F2fService;

	private readonly environmentVariables: EnvironmentVariables;

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.AUTHORIZATION_SERVICE);
		this.metrics = metrics;
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
	}

	static getInstance(logger: Logger, metrics: Metrics): AuthorizationRequestProcessor {
		if (!AuthorizationRequestProcessor.instance) {
			AuthorizationRequestProcessor.instance = new AuthorizationRequestProcessor(logger, metrics);
		}
		return AuthorizationRequestProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent, sessionId: string): Promise<Response> {
		
		this.logger.appendKeys({ sessionId });
		const session = await this.f2fService.getSessionById(sessionId);
		
		if (session != null) {
			if (session.expiryDate < absoluteTimeNow()) {
				this.logger.error("Session has expired", { messageCode: MessageCodes.EXPIRED_SESSION });
				return new Response(HttpCodesEnum.UNAUTHORIZED, `Session with session id: ${sessionId} has expired`);
			}

			this.logger.info({ message: "Found Session" });
			this.logger.appendKeys({ sessionId: session.sessionId });
			this.logger.appendKeys({
				govuk_signin_journey_id: session?.clientSessionId,
			});

			this.metrics.addMetric("found session", MetricUnits.Count, 1);
			if (session.authSessionState === AuthSessionState.F2F_YOTI_SESSION_CREATED) {

				const authorizationCode = randomUUID();

				await this.f2fService.setAuthorizationCode(sessionId, authorizationCode);

				this.metrics.addMetric("Set authorization code", MetricUnits.Count, 1);
				try {
					const coreEventFields = buildCoreEventFields(session, this.environmentVariables.issuer(), session.clientIpAddress, absoluteTimeNow);
					await this.f2fService.sendToTXMA({
						event_name: "F2F_CRI_AUTH_CODE_ISSUED",
						...coreEventFields,
						user: {
							...coreEventFields.user,
							govuk_signin_journey_id: session.clientSessionId,
						},

					});
				} catch (error) {
					this.logger.error("Failed to write TXMA event F2F_CRI_AUTH_CODE_ISSUED to SQS queue.", {
						messageCode: MessageCodes.ERROR_WRITING_TXMA,
					});
				}

				const f2fResp = {
					authorizationCode: {
						value: authorizationCode,
					},
					redirect_uri: session?.redirectUri,
					state: session?.state,
				};

				try {
					await this.f2fService.sendToTXMA({
						event_name: "F2F_CRI_END",
						...buildCoreEventFields(session, this.environmentVariables.issuer(), session.clientIpAddress, absoluteTimeNow),
						extensions: {
							previous_govuk_signin_journey_id: session.clientSessionId,
							evidence: [
								{
									txn: session.yotiSessionId || "",
								},
							],
						},
					});
				} catch (error) {
					this.logger.error("Failed to write TXMA event F2F_CRI_END to SQS queue.", { error, messageCode: MessageCodes.FAILED_TO_WRITE_TXMA });
				}

				return new Response(HttpCodesEnum.OK, JSON.stringify(f2fResp));
			} else {
				this.logger.warn(`Session is in the wrong state: ${session.authSessionState}, expected state should be ${AuthSessionState.F2F_YOTI_SESSION_CREATED}`, {
					messageCode: MessageCodes.INCORRECT_SESSION_STATE,
				});
				return new Response(HttpCodesEnum.UNAUTHORIZED, `Session is in the wrong state: ${session.authSessionState}`);
			}
		} else {
			this.logger.error("No session found for session id", {
				messageCode: MessageCodes.SESSION_NOT_FOUND,
			});
			return new Response(HttpCodesEnum.UNAUTHORIZED, `No session found with the session id: ${sessionId}`);
		}
	}
}
