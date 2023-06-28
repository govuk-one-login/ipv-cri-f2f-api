import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { VerifiableCredentialService } from "./VerifiableCredentialService";
import { KmsJwtAdapter } from "../utils/KmsJwtAdapter";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { GenerateVerifiableCredential } from "./GenerateVerifiableCredential";
import { YotiSessionDocument } from "../utils/YotiPayloadEnums";

export class YotiCallbackProcessor {

  private static instance: YotiCallbackProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private readonly yotiService: YotiService;

  private readonly f2fService: F2fService;

  private readonly environmentVariables: EnvironmentVariables;

  private readonly verifiableCredentialService: VerifiableCredentialService;

  private readonly kmsJwtAdapter: KmsJwtAdapter;

  private readonly generateVerifiableCredential: GenerateVerifiableCredential;

  constructor(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
  ) {
  	this.logger = logger;
  	this.metrics = metrics;
  	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.CALLBACK_SERVICE);
  	this.yotiService = YotiService.getInstance(this.logger, this.environmentVariables.yotiSdk(), this.environmentVariables.resourcesTtlInSeconds(), this.environmentVariables.clientSessionTokenTtlInSeconds(), YOTI_PRIVATE_KEY, this.environmentVariables.yotiBaseUrl());
  	this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
  	this.kmsJwtAdapter = new KmsJwtAdapter(this.environmentVariables.kmsKeyArn());
  	this.verifiableCredentialService = VerifiableCredentialService.getInstance(this.environmentVariables.sessionTable(), this.kmsJwtAdapter, this.environmentVariables.issuer(), this.logger);
  	this.generateVerifiableCredential = GenerateVerifiableCredential.getInstance(this.logger);
  }

  static getInstance(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
  ): YotiCallbackProcessor {
  	if (!YotiCallbackProcessor.instance) {
  		YotiCallbackProcessor.instance = new YotiCallbackProcessor(
  			logger,
  			metrics,
  			YOTI_PRIVATE_KEY,
  		);
  	}
  	return YotiCallbackProcessor.instance;
  }

  async processRequest(eventBody: any): Promise<Response> {
  	const yotiSessionID = eventBody.session_id;

  	this.logger.info({ message: "Fetching status for Yoti SessionID" }, { yotiSessionID });
  	const completedYotiSessionInfo = await this.yotiService.getCompletedSessionInfo(yotiSessionID);

  	if (!completedYotiSessionInfo) {
  		this.logger.error({ message: "No YOTI Session found with ID:" }, { yotiSessionID });
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti Session not found");
  	}

  	if (completedYotiSessionInfo.state !== YotiSessionDocument.COMPLETED) {
  		this.logger.error({ message: "Session in Yoti does not have status COMPLETED" }, { yotiSessionID });
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti Session not complete", { shouldThrow: true });
  	}

  	this.logger.info({ message: "Completed Yoti Session:" }, { completedYotiSessionInfo });

  	const documentFieldsId = completedYotiSessionInfo.resources.id_documents[0].document_fields.media.id;

  	if (!documentFieldsId) {
  		this.logger.error({ message: "No document_fields ID found in completed Yoti Session" }, { yotiSessionID });
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti document_fields ID not found");
  	}
  	const documentFields = await this.yotiService.getMediaContent(yotiSessionID, documentFieldsId);
  	if (!documentFields) {
  		this.logger.error({ message: "No document fields info found" }, { documentFieldsId });
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti document fields info not found");
  	}

  	this.logger.info({ message: "Document Fields" }, { documentFields });

  	this.logger.info({ message: "Fetching F2F Session info with Yoti SessionID" }, { yotiSessionID });
  	const f2fSession = await this.f2fService.getSessionByYotiId(yotiSessionID);

		try {
			await this.f2fService.sendToTXMA({
				event_name: "F2F_YOTI_RESPONSE_RECEIVED",
				...buildCoreEventFields(
					f2fSession!,
					this.environmentVariables.issuer(),
					f2fSession!.clientIpAddress,
					absoluteTimeNow,
				),
				
			});
		} catch (error) {
			this.logger.error("Failed to write TXMA event F2F_YOTI_RESPONSE_RECEIVED to SQS queue.");
		}
  	if (!f2fSession) {
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing Info in Session Table");
  	}

		

  	// Validate the AuthSessionState to be "F2F_ACCESS_TOKEN_ISSUED"
  	if (
  		f2fSession.authSessionState === AuthSessionState.F2F_ACCESS_TOKEN_ISSUED ||
      f2fSession.authSessionState === AuthSessionState.F2F_AUTH_CODE_ISSUED
  	) {
  		
  		const { credentialSubject, evidence } =
        this.generateVerifiableCredential.getVerifiedCredentialInformation(yotiSessionID, completedYotiSessionInfo, documentFields);

  		if (!credentialSubject || !evidence) {
  			this.logger.error({ message: "Missing Credential Subject or Evidence payload" }, { credentialSubject, evidence });
  			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing Credential Subject or Evidence payload");
  		}


  		let signedJWT;
  		try {
  			signedJWT = await this.verifiableCredentialService.generateSignedVerifiableCredentialJwt(f2fSession, credentialSubject, evidence, absoluteTimeNow);
  		} catch (error) {
  			if (error instanceof AppError) {
  				this.logger.error({ message: "Error generating signed verifiable credential jwt: " + error.message });
  				return new Response(HttpCodesEnum.SERVER_ERROR, "Failed to sign the verifiableCredential Jwt");
  			}
  		}

  		if (!signedJWT) {
  			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Unable to create signed JWT");
  		}

  		try {
  			await this.f2fService.sendToIPVCore({
  				sub: f2fSession.subject,
  				state: f2fSession.state,
  				"https://vocab.account.gov.uk/v1/credentialJWT": [signedJWT],
  			});
  		} catch (error) {
  			this.logger.error({ message: "Failed to send VC to IPV Core Queue" }, { error });
  			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to send to IPV Core", { shouldThrow: true });
  		}

  		try {
  			await this.f2fService.sendToTXMA({
  				event_name: "F2F_CRI_VC_ISSUED",
  				...buildCoreEventFields(
  					f2fSession,
  					this.environmentVariables.issuer(),
  					f2fSession.clientIpAddress,
  					absoluteTimeNow,
  				),
					document_details: documentFields,
					gpg45_score: evidence,
					contra_indicators: evidence[0].ci
  			});
  		} catch (error) {
  			this.logger.error("Failed to write TXMA event F2F_CRI_VC_ISSUED to SQS queue.");
  		}

  		await this.f2fService.updateSessionAuthState(
  			f2fSession.sessionId,
  			AuthSessionState.F2F_CREDENTIAL_ISSUED,
  		);

  		return new Response(HttpCodesEnum.OK, "OK");
  	} else {
  		return new Response(HttpCodesEnum.UNAUTHORIZED, `AuthSession is in wrong Auth state: Expected state- ${AuthSessionState.F2F_ACCESS_TOKEN_ISSUED} or ${AuthSessionState.F2F_AUTH_CODE_ISSUED}, actual state- ${f2fSession.authSessionState}`);
  	}
  }
}
