import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { F2fService } from "./F2fService";
import { KmsJwtAdapter } from "../utils/KmsJwtAdapter";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Response } from "../utils/Response";
import { AccessTokenRequestValidationHelper } from "../utils/AccessTokenRequestValidationHelper";
import { ISessionItem } from "../models/ISessionItem";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { Constants } from "../utils/Constants";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { MessageCodes } from "../models/enums/MessageCodes";
import { AppError } from "../utils/AppError";
import { Jwt } from "../utils/IVeriCredential";

interface ClientConfig {
	jwksEndpoint: string;
	clientId: string;
}

export class AccessTokenRequestProcessor {
	private static instance: AccessTokenRequestProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private readonly accessTokenRequestValidationHelper: AccessTokenRequestValidationHelper;

	private readonly f2fService: F2fService;

	private readonly kmsJwtAdapter: KmsJwtAdapter;

	private readonly environmentVariables: EnvironmentVariables;

	private readonly clientConfig: string;

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.AUTHORIZATION_SERVICE);
		this.kmsJwtAdapter = new KmsJwtAdapter(this.environmentVariables.kmsKeyArn(), logger);
		this.accessTokenRequestValidationHelper = new AccessTokenRequestValidationHelper();
		this.metrics = metrics;
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, this.metrics, createDynamoDbClient());
		this.clientConfig = this.environmentVariables.clientConfig();
	}

	static getInstance(logger: Logger, metrics: Metrics): AccessTokenRequestProcessor {
		if (!AccessTokenRequestProcessor.instance) {
			AccessTokenRequestProcessor.instance = new AccessTokenRequestProcessor(logger, metrics);
		}
		return AccessTokenRequestProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
		try {
			let requestPayload;
			try {
				requestPayload = this.accessTokenRequestValidationHelper.validatePayload(event.body);
			} catch (error) {
				this.logger.error("Failed validating the Access token request body.", { messageCode: MessageCodes.FAILED_VALIDATING_ACCESS_TOKEN_REQUEST_BODY });
				if (error instanceof AppError) {
					return Response(error.statusCode, error.message);
				}
				return Response(HttpCodesEnum.UNAUTHORIZED, "An error has occurred while validating the Access token request payload.");
			}

			let session: ISessionItem | undefined;

				session = await this.f2fService.getSessionByAuthorizationCode(requestPayload.code);
				if (!session) {
					this.logger.info(`No session found by authorization code: : ${requestPayload.code}`, { messageCode: MessageCodes.SESSION_NOT_FOUND });
					return Response(HttpCodesEnum.UNAUTHORIZED, `No session found by authorization code: ${requestPayload.code}`);
				}
				this.logger.appendKeys({ sessionId: session.sessionId });
				this.logger.info({ message: "Found Session" });
				this.logger.appendKeys({
					govuk_signin_journey_id: session?.clientSessionId,
				});
				this.logger.info({ message: "LOG1" });
				let configClient: ClientConfig | undefined;
				try {
					const config = JSON.parse(this.clientConfig) as ClientConfig[];
					configClient = config.find(c => c.clientId === session?.clientId);
				} catch (error: any) {
					this.logger.error("Invalid or missing client configuration table", {
						error,
						messageCode: MessageCodes.MISSING_CONFIGURATION,
					});
					return Response(HttpCodesEnum.SERVER_ERROR, "Server Error");
				}
		
				if (!configClient) {
					this.logger.error("Unrecognised client in request", {
						messageCode: MessageCodes.UNRECOGNISED_CLIENT,
					});
					return Response(HttpCodesEnum.BAD_REQUEST, "Bad Request");
				}	

			if (session.authSessionState === AuthSessionState.F2F_AUTH_CODE_ISSUED) {
				const jwt: string = requestPayload.client_assertion;

				let parsedJwt: Jwt;
				try {
					parsedJwt = this.kmsJwtAdapter.decode(jwt);
				} catch (error: any) {
					this.logger.error("Failed to decode supplied JWT", {
						error,
						messageCode: MessageCodes.FAILED_DECODING_JWT,
					});
					return Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorized");
				}

				this.logger.info({ message: "ParsedJWT: " + parsedJwt });

				try {
					if (configClient.jwksEndpoint) {
						const payload = await this.kmsJwtAdapter.verifyWithJwks(jwt, configClient.jwksEndpoint, parsedJwt.header.kid);

						if (!payload) {
							this.logger.error("Failed to verify JWT", {
								messageCode: MessageCodes.FAILED_VERIFYING_JWT,
							});
							return Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorized");
						}
					} else {
						this.logger.error("Incomplete Client Configuration", {
							messageCode: MessageCodes.MISSING_CONFIGURATION,
						});
						return Response(HttpCodesEnum.SERVER_ERROR, "Server Error");
					}
				} catch (error: any) {
					this.logger.error("Invalid request: Could not verify JWT", {
						error,
						messageCode: MessageCodes.FAILED_VERIFYING_JWT,
					});
					return Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorized");
				}

				this.accessTokenRequestValidationHelper.validateTokenRequestToRecord(session, requestPayload.redirectUri);
				// Generate access token
				const jwtPayload = {
					sub: session.sessionId,
					aud: this.environmentVariables.issuer(),
					iss: this.environmentVariables.issuer(),
					exp: absoluteTimeNow() + Constants.TOKEN_EXPIRY_SECONDS,
				};
				let accessToken;
				try {
					accessToken = await this.kmsJwtAdapter.sign(jwtPayload, this.environmentVariables.dnsSuffix());
					// ignored so as not log PII
					/* eslint-disable @typescript-eslint/no-unused-vars */
				} catch (error) {
					this.logger.error("Failed to sign the accessToken Jwt", { messageCode: MessageCodes.FAILED_SIGNING_JWT });
					return Response(HttpCodesEnum.SERVER_ERROR, "Failed to sign the accessToken Jwt");
				}

				// Update the sessionTable with accessTokenExpiryDate and AuthSessionState.
				await this.f2fService.updateSessionWithAccessTokenDetails(session.sessionId, jwtPayload.exp);

				this.logger.info({ message: "Access token generated successfully" });

				return {
					statusCode: HttpCodesEnum.OK,
					body: JSON.stringify({
						access_token: accessToken,
						token_type: Constants.BEARER,
						expires_in: Constants.TOKEN_EXPIRY_SECONDS,
					}),
				};
			} else {
				this.metrics.addMetric("AccessToken_error_user_state_incorrect", MetricUnits.Count, 1);
				this.logger.warn(`Session for journey ${session?.clientSessionId} is in the wrong Auth state: expected state - ${AuthSessionState.F2F_AUTH_CODE_ISSUED}, actual state - ${session.authSessionState}`, { messageCode: MessageCodes.INCORRECT_SESSION_STATE });
				return Response(HttpCodesEnum.UNAUTHORIZED, `Session for journey ${session?.clientSessionId} is in the wrong Auth state: expected state - ${AuthSessionState.F2F_AUTH_CODE_ISSUED}, actual state - ${session.authSessionState}`);
			}
		} catch (err: any) {
			this.logger.error({ message: "Error processing access token request", err });
			return Response(err.statusCode, err.message);
		}
	}
}
