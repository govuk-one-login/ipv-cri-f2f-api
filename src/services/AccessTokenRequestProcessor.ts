import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { CicService } from "./CicService";
import { KmsJwtAdapter } from "../utils/KmsJwtAdapter";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Response } from "../utils/Response";
import { AccessTokenRequestValidationHelper } from "../utils/AccessTokenRequestValidationHelper";
import { ISessionItem } from "../models/ISessionItem";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { Constants } from "../utils/Constants";

const SESSION_TABLE = process.env.SESSION_TABLE;
const KMS_KEY_ARN = process.env.KMS_KEY_ARN;
const ISSUER = process.env.ISSUER;

export class AccessTokenRequestProcessor {
    private static instance: AccessTokenRequestProcessor;

    private readonly logger: Logger;

    private readonly metrics: Metrics;

    private readonly accessTokenRequestValidationHelper: AccessTokenRequestValidationHelper;

    private readonly cicService: CicService;

    private readonly kmsJwtAdapter: KmsJwtAdapter;

    constructor(logger: Logger, metrics: Metrics) {
    	if (!SESSION_TABLE || !KMS_KEY_ARN || !ISSUER) {
    		logger.error("Environment variable SESSION_TABLE or KMS_KEY_ARN or ISSUER is not configured");
    		throw new AppError("Service incorrectly configured, missing some environment variables.", HttpCodesEnum.SERVER_ERROR);
    	}
    	this.logger = logger;
    	this.kmsJwtAdapter = new KmsJwtAdapter(KMS_KEY_ARN);
    	this.accessTokenRequestValidationHelper = new AccessTokenRequestValidationHelper();
    	this.metrics = metrics;
    	this.cicService = CicService.getInstance(SESSION_TABLE, this.logger, createDynamoDbClient());
    }

    static getInstance(logger: Logger, metrics: Metrics): AccessTokenRequestProcessor {
    	if (!AccessTokenRequestProcessor.instance) {
    		AccessTokenRequestProcessor.instance = new AccessTokenRequestProcessor(logger, metrics);
    	}
    	return AccessTokenRequestProcessor.instance;
    }

    async processRequest(event: APIGatewayProxyEvent): Promise<Response> {
    	try {
    		const requestPayload = this.accessTokenRequestValidationHelper.validatePayload(event.body);
    		let session :ISessionItem | undefined;
    		try {
    			session = await this.cicService.getSessionByAuthorizationCode(requestPayload.code);
    			this.logger.info({ message :"Found Session: " + JSON.stringify(session) });
    			if (!session) {
    				return new Response(HttpCodesEnum.UNAUTHORIZED, `No session found by authorization code: ${requestPayload.code}`);
    			}
    		} catch (err) {
    			return new Response(HttpCodesEnum.UNAUTHORIZED, "Error while retrieving the session");
    		}

    		this.accessTokenRequestValidationHelper.validateTokenRequestToRecord(session, requestPayload.redirectUri);
    		// Generate access token
    		const jwtPayload = {
    			sub: session.sessionId,
    			aud: ISSUER,
    			iss: ISSUER,
    			exp: absoluteTimeNow() + Constants.TOKEN_EXPIRY_SECONDS,
    		};
    		let accessToken;
    		try {
    			accessToken = await this.kmsJwtAdapter.sign(jwtPayload);
    		} catch (error) {
    			return new Response( HttpCodesEnum.SERVER_ERROR, "Failed to sign the accessToken Jwt" );
    		}

    		// Update the sessionTable with accessTokenExpiryDate and AuthSessionState.
    		await this.cicService.updateSessionWithAccessTokenDetails(session.sessionId, jwtPayload.exp);

    		this.logger.info({ message: "Access token generated successfully" });

    		return {
    			statusCode: HttpCodesEnum.CREATED,
    			body: JSON.stringify({
    				access_token: accessToken,
    				token_type: Constants.BEARER,
    				expires_in: Constants.TOKEN_EXPIRY_SECONDS,
    			}),
    		};
    	} catch (err: any) {
    		return new Response(err.statusCode, err.message);
    	}
    }
}
