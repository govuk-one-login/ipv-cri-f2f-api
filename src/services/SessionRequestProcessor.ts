/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
import { Response, SECURITY_HEADERS } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
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
import { MessageCodes } from "../models/enums/MessageCodes";
import { TxmaEventNames } from "../models/enums/TxmaEvents";
import { Constants } from "../utils/Constants";

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
  	this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, this.metrics, createDynamoDbClient());
  	this.kmsDecryptor = new KmsJwtAdapter(this.environmentVariables.encryptionKeyIds(), logger);
  	this.validationHelper = new ValidationHelper();
  }

  static getInstance(logger: Logger, metrics: Metrics): SessionRequestProcessor {
  	if (!SessionRequestProcessor.instance) {
  		SessionRequestProcessor.instance = new SessionRequestProcessor(logger, metrics);
  	}
  	return SessionRequestProcessor.instance;
  }

  async processRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  	let encodedHeader, clientIpAddress;
  	if (event.headers) {
	  encodedHeader = event.headers[Constants.ENCODED_AUDIT_HEADER] ?? "";
	  clientIpAddress = event.headers[Constants.X_FORWARDED_FOR] ?? event.requestContext.identity?.sourceIp;
  	} else {
  		clientIpAddress = event.requestContext.identity?.sourceIp;
  	}

  	const deserialisedRequestBody = JSON.parse(event.body as string);
  	const requestBodyClientId = deserialisedRequestBody.client_id;
  	const sessionId: string = randomUUID();

  	let configClient;
  	try {
  		const config = JSON.parse(this.environmentVariables.clientConfig()) as ClientConfig[];
  		configClient = config.find(c => c.clientId === requestBodyClientId);
  	} catch (error) {
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

  	let urlEncodedJwt: string;
  	try {
  		urlEncodedJwt = await this.kmsDecryptor.decrypt(deserialisedRequestBody.request);
  	} catch (error) {
  		this.logger.error("Failed to decrypt supplied JWE request", {
  			error,
  			messageCode: MessageCodes.FAILED_DECRYPTING_JWE,
  		});
  		return Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorized");
  	}

  	let parsedJwt: Jwt;
  	try {
  		parsedJwt = this.kmsDecryptor.decode(urlEncodedJwt);
  	} catch (error) {
  		this.logger.error("Failed to decode supplied JWT", {
  			error,
  			messageCode: MessageCodes.FAILED_DECODING_JWT,
  		});
  		return Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorized");
  	}

  	const jwtPayload: JwtPayload = parsedJwt.payload;
	const jwtTargetKid: string | undefined = parsedJwt.header?.kid;
  	this.logger.appendKeys({
  		govuk_signin_journey_id: jwtPayload.govuk_signin_journey_id as string,
  		sessionId,
  	});
  	try {
  		if (configClient?.jwksEndpoint) {
  			const payload = await this.kmsDecryptor.verifyWithJwks(urlEncodedJwt, configClient.jwksEndpoint, jwtTargetKid);
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
  	} catch (error) {
  		this.logger.error("Could not verify JWT", {
  			error,
  			messageCode: MessageCodes.FAILED_VERIFYING_JWT,
  		});
  		return Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorized");
  	}

  	const JwtErrors = this.validationHelper.isJwtValid(jwtPayload, requestBodyClientId, configClient.redirectUri);
  	if (JwtErrors.length > 0) {
  		this.logger.error(JwtErrors, {
  			messageCode: MessageCodes.FAILED_VALIDATING_JWT,
  		});
  		return Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorized");
  	}

  	// Validate the user details of the shared_claims received from the JWT.
  	const data = this.validationHelper.isPersonDetailsValid(jwtPayload.shared_claims.emailAddress, jwtPayload.shared_claims.name);
  	if (data.errorMessage.length > 0) {
  		this.logger.error( { message: data.errorMessage + "  from shared claims data" }, { messageCode : data.errorMessageCode });
  		return Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorized");
  	}

  	// Validate the address format of the shared_claims received from the JWT.
  	const { errorMessage, errorMessageCode } = this.validationHelper.isAddressFormatValid(jwtPayload);
  	if (errorMessage.length > 0) {
  		this.logger.error( { message: errorMessage }, { messageCode : errorMessageCode });
  		return Response(HttpCodesEnum.UNAUTHORIZED, "Unauthorized");
  	}

  	try {
  		if (await this.f2fService.getSessionById(sessionId)) {
  			this.logger.error("SESSION_ALREADY_EXISTS", {
  				fieldName: "sessionId",
  				value: sessionId,
  				reason: "sessionId already exists in the database",
  				messageCode: "SESSION_ALREADY_EXISTS",
  			});
  			return Response(HttpCodesEnum.SERVER_ERROR, "Internal server error");
  		}
  	} catch (error) {
  		this.logger.error("Unexpected error accessing session table", {
  			error,
  			messageCode: MessageCodes.UNEXPECTED_ERROR_SESSION_EXISTS,
  		});
  		return Response(HttpCodesEnum.SERVER_ERROR, "Internal server error");
  	}

  	const session: ISessionItem = {
  		sessionId,
  		clientId: jwtPayload.client_id,
  		clientSessionId: jwtPayload.govuk_signin_journey_id as string,
  		redirectUri: jwtPayload.redirect_uri,
  		expiryDate: absoluteTimeNow() + this.environmentVariables.authSessionTtlInSecs(),
  		createdDate: absoluteTimeNow(),
  		state: jwtPayload.state,
  		subject: jwtPayload.sub ?? "",
  		persistentSessionId: jwtPayload.persistent_session_id, //Might not be used
  		clientIpAddress,
  		attemptCount: 0,
  		authSessionState: "F2F_SESSION_CREATED",
  		evidence_requested: jwtPayload.evidence_requested,
  	};

  	try {
  		await this.f2fService.createAuthSession(session);
		this.metrics.addMetric("state-F2F_SESSION_CREATED", MetricUnits.Count, 1);
  	} catch (error) {
  		this.logger.error("Failed to create session in session table", {
  			error,
  			messageCode: MessageCodes.FAILED_CREATING_SESSION,
  		});
  		return Response(HttpCodesEnum.SERVER_ERROR, "Internal server error");
  	}

  	try {
  		// If multiple addresses present, retrieve preferred address from shared_claims
  		const preferredAddress = this.validationHelper.getPreferredAddress(jwtPayload.shared_claims.address);
  		jwtPayload.shared_claims.address = [preferredAddress];

  		await this.f2fService.savePersonIdentity(jwtPayload.shared_claims, sessionId);
  	} catch (error) {
  		this.logger.error("Failed to create session in person identity table", {
  			error,
  			messageCode: MessageCodes.FAILED_SAVING_PERSON_IDENTITY,
  		});
  		return Response(HttpCodesEnum.SERVER_ERROR, "Internal server error");
  	}

  	try {
  		const coreEventFields = buildCoreEventFields(session, this.environmentVariables.issuer() as string, clientIpAddress);
  		await this.f2fService.sendToTXMA({
  			event_name: TxmaEventNames.F2F_CRI_START,
  			...coreEventFields,
  			user: {
  				...coreEventFields.user,
  				govuk_signin_journey_id: session.clientSessionId,
  			},  			
  		}, encodedHeader);
  	} catch (error) {
  		this.logger.error("Auth session successfully created. Failed to send CIC_CRI_START event to TXMA", {
  			sessionId: session.sessionId,
  			error,
  			messageCode: MessageCodes.FAILED_TO_WRITE_TXMA,
  		});
  	}

  	this.logger.info("Session created successfully. Returning 200OK");

	this.metrics.addMetric("session_created", MetricUnits.Count, 1);

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
