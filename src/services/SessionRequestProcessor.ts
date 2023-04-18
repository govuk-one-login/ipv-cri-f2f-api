import { Response, GenericServerError, unauthorizedResponse, SECURITY_HEADERS } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { KmsJwtAdapter } from "../utils/KmsJwtAdapter";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { randomUUID } from "crypto";
import { ISessionItem } from "../models/ISessionItem";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { ValidationHelper } from "../utils/ValidationHelper";
import { JwtPayload, Jwt } from "../utils/IVeriCredential";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";


interface ClientConfig {
	jwksEndpoint: string;
	clientId: string;
	redirectUri: string;
}

export class SessionRequestProcessor {
	private static instance: SessionRequestProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private readonly f2fService: F2fService;

	private readonly kmsDecryptor: KmsJwtAdapter;

	private readonly validationHelper: ValidationHelper;

	private readonly environmentVariables: EnvironmentVariables;

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.metrics = metrics;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.SESSION_SERVICE);
		logger.debug("metrics is  " + JSON.stringify(this.metrics));
		this.metrics.addMetric("Called", MetricUnits.Count, 1);
		this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
		this.kmsDecryptor = new KmsJwtAdapter(this.environmentVariables.encryptionKeyIds());
		this.validationHelper = new ValidationHelper();
	}

	static getInstance(logger: Logger, metrics: Metrics): SessionRequestProcessor {
		if (!SessionRequestProcessor.instance) {
			SessionRequestProcessor.instance = new SessionRequestProcessor(logger, metrics);
		}
		return SessionRequestProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent): Promise<Response> {
		const deserialisedRequestBody = JSON.parse(event.body as string);
		const requestBodyClientId = deserialisedRequestBody.client_id;
		const clientIpAddress = event.headers["x-forwarded-for"];


		let configClient;
		if (this.environmentVariables.clientConfig()) {
			const config = JSON.parse(this.environmentVariables.clientConfig()) as ClientConfig[];
			configClient = config.find(c => c.clientId === requestBodyClientId);
		} else {
			this.logger.error("MISSING_CLIENT_CONFIG");
			return new Response(HttpCodesEnum.BAD_REQUEST, "Missing client config");
		}


		let urlEncodedJwt;
		try {
			urlEncodedJwt = await this.kmsDecryptor.decrypt(deserialisedRequestBody.request);
		} catch (error) {
			this.logger.error("FAILED_DECRYPTING_JWE", { error });
			return unauthorizedResponse("Invalid request: Request failed to be decrypted");
		}

		let parsedJwt: Jwt;
		try {
			parsedJwt = this.kmsDecryptor.decode(urlEncodedJwt);
		} catch (error) {
			this.logger.error("FAILED_DECODING_JWT", { error });
			return unauthorizedResponse("Invalid request: Rejected jwt");
		}

		const jwtPayload: JwtPayload = parsedJwt.payload;
		try {
			if (configClient?.jwksEndpoint) {
				const payload = await this.kmsDecryptor.verifyWithJwks(urlEncodedJwt, configClient.jwksEndpoint);
				if (!payload) {
					return unauthorizedResponse("JWT verification failed");
				}
			} else {
				return new Response(HttpCodesEnum.BAD_REQUEST, "Missing client config");
			}
		} catch (error) {
			this.logger.debug("UNEXPECTED_ERROR_VERIFYING_JWT", { error });
			return unauthorizedResponse("Invalid request: Could not verify jwt");
		}

		if (configClient) {
			const JwtErrors = this.validationHelper.isJwtValid(jwtPayload, requestBodyClientId, configClient.redirectUri);
			if (JwtErrors.length > 0) {
				this.logger.error(JwtErrors);
				return unauthorizedResponse("JWT validation/verification failed");
			}
		} else {
			this.logger.error("Missing Client Config");
			return unauthorizedResponse("JWT validation/verification failed");
		}


		const sessionId: string = randomUUID();
		try {
			if (await this.f2fService.getSessionById(sessionId)) {
				this.logger.error("SESSION_ALREADY_EXISTS", { fieldName: "sessionId", value: sessionId, reason: "sessionId already exists in the database" });
				return GenericServerError;
			}
		} catch (err) {
			this.logger.error("UNEXPECTED_ERROR_SESSION_EXISTS", { error: err });
			return GenericServerError;
		}

		const session: ISessionItem = {
			sessionId,
			clientId: jwtPayload.client_id,
			clientSessionId: jwtPayload.govuk_signin_journey_id as string,
			redirectUri: jwtPayload.redirect_uri,
			expiryDate: Date.now() + Number(this.environmentVariables.authSessionTtl()) * 1000,
			createdDate: Date.now(),
			state: jwtPayload.state,
			subject: jwtPayload.sub ? jwtPayload.sub : "",
			persistentSessionId: jwtPayload.persistent_session_id, //Might not be used
			clientIpAddress: clientIpAddress as string,
			attemptCount: 0,
			authSessionState: "F2F_SESSION_CREATED",
		};

		try {
			await this.f2fService.createAuthSession(session);
		} catch (error) {
			this.logger.error("FAILED_CREATING_SESSION", { error });
			return GenericServerError;
		}

		if (jwtPayload.shared_claims) {
			try {
				await this.f2fService.savePersonIdentity(jwtPayload.shared_claims, sessionId);
			} catch (error) {
				this.logger.error("FAILED_SAVING_PERSON_IDENTITY", { error });
				return GenericServerError;
			}
		}

		try {
			await this.f2fService.sendToTXMA({
				event_name: "F2F_CRI_START",
				...buildCoreEventFields(session, this.environmentVariables.issuer() as string, session.clientIpAddress, absoluteTimeNow),
			});
		} catch (error) {
			this.logger.error("FAILED_TO_WRITE_TXMA", {
				session,
				issues: this.environmentVariables.issuer(),
				reason: "Auth session successfully created. Failed to send DCMAW_CRI_START event to TXMA",
				error,
			});
			return GenericServerError;
		}

		return {
			statusCode: HttpCodesEnum.OK,
			headers: SECURITY_HEADERS,
			body: JSON.stringify({
				session_id: sessionId,
				state: jwtPayload.state,
				redirect_uri: jwtPayload.redirect_uri,
			}),
		};
	}
}
