import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { randomUUID } from "crypto";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { MessageCodes } from "../models/enums/MessageCodes";
import { TxmaEventNames } from "../models/enums/TxmaEvents";

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
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, this.metrics, createDynamoDbClient());
	}

	static getInstance(logger: Logger, metrics: Metrics): AuthorizationRequestProcessor {
		if (!AuthorizationRequestProcessor.instance) {
			AuthorizationRequestProcessor.instance = new AuthorizationRequestProcessor(logger, metrics);
		}
		return AuthorizationRequestProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent, sessionId: string): Promise<APIGatewayProxyResult> {
		this.logger.appendKeys({ sessionId });
		const session = await this.f2fService.getSessionById(sessionId);

		if (session != null) {
			if (session.expiryDate < absoluteTimeNow()) {
				this.logger.error("Session has expired", { messageCode: MessageCodes.EXPIRED_SESSION });
				return Response(HttpCodesEnum.UNAUTHORIZED, `Session with session id: ${sessionId} has expired`);
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
					const coreEventFields = buildCoreEventFields(session, this.environmentVariables.issuer(), session.clientIpAddress);
					await this.f2fService.sendToTXMA({
						event_name: TxmaEventNames.F2F_CRI_AUTH_CODE_ISSUED,
						...coreEventFields,
						user: {
							...coreEventFields.user,
							govuk_signin_journey_id: session.clientSessionId,
						},

					});
					// ignored so as not log PII
					/* eslint-disable @typescript-eslint/no-unused-vars */
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
						event_name: TxmaEventNames.F2F_CRI_END,
						...buildCoreEventFields(session, this.environmentVariables.issuer(), session.clientIpAddress),
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

				return Response(HttpCodesEnum.OK, JSON.stringify(f2fResp));
			} else {
				this.metrics.addMetric("AuthRequest_error_user_state_incorrect", MetricUnits.Count, 1);
				this.logger.warn( { message: `Session for journey ${session?.clientSessionId} is in the wrong Auth state: expected state - ${AuthSessionState.F2F_YOTI_SESSION_CREATED}, actual state - ${session.authSessionState}` }, { messageCode: MessageCodes.INCORRECT_SESSION_STATE });
				return Response(HttpCodesEnum.UNAUTHORIZED, `Session for journey ${session?.clientSessionId} is in the wrong Auth state: expected state - ${AuthSessionState.F2F_YOTI_SESSION_CREATED}, actual state - ${session.authSessionState}`);
			}
		} else {
			this.logger.error("No session found for session id", {
				messageCode: MessageCodes.SESSION_NOT_FOUND,
			});
			return Response(HttpCodesEnum.UNAUTHORIZED, `No session found with the session id: ${sessionId}`);
		}
	}
}
