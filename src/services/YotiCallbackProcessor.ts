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
import { MessageCodes } from "../models/enums/MessageCodes";

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
  	this.yotiService = YotiService.getInstance(this.logger, this.environmentVariables.yotiSdk(), this.environmentVariables.resourcesTtlInSeconds(), this.environmentVariables.clientSessionTokenTtlInDays(), YOTI_PRIVATE_KEY, this.environmentVariables.yotiBaseUrl());
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

  	this.logger.info({ message: "Fetching F2F Session info with Yoti SessionID" }, { yotiSessionID });
  	const f2fSession = await this.f2fService.getSessionByYotiId(yotiSessionID);

  	if (!f2fSession) {
  		this.logger.error("Session not found", {
  			messageCode: MessageCodes.SESSION_NOT_FOUND,
  		});
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing Info in Session Table");
  	}

  	this.logger.appendKeys({
  		sessionId: f2fSession.sessionId,
  		govuk_signin_journey_id: f2fSession.clientSessionId,
  	});

  	this.logger.info({ message: "Fetching status for Yoti SessionID" });
  	const completedYotiSessionInfo = await this.yotiService.getCompletedSessionInfo(yotiSessionID);

  	if (!completedYotiSessionInfo) {
  		this.logger.error({ message: "No YOTI Session found with ID:" }, {
  			messageCode: MessageCodes.VENDOR_SESSION_NOT_FOUND,
  		});
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti Session not found");
  	}

  	if (completedYotiSessionInfo.state !== YotiSessionDocument.COMPLETED) {
  		this.logger.error({ message: "Session in Yoti does not have status COMPLETED" }, {
  			messageCode: MessageCodes.VENDOR_SESSION_STATE_MISMATCH,
  		});
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti Session not complete", { shouldThrow: true });
  	}

  	this.logger.appendKeys({
  		yotiUserTrackingId: completedYotiSessionInfo.user_tracking_id,
  	});

  	this.logger.info({ message: "Completed Yoti Session:" });

  	const documentFieldsId = completedYotiSessionInfo.resources.id_documents[0].document_fields.media.id;

  	if (!documentFieldsId) {
  		this.logger.error({ message: "No document_fields ID found in completed Yoti Session" }, {
  			messageCode: MessageCodes.VENDOR_SESSION_MISSING_DATA,
  		});
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti document_fields ID not found");
  	}
  	const documentFields = await this.yotiService.getMediaContent(yotiSessionID, documentFieldsId);
  	if (!documentFields) {
  		this.logger.error({ message: "No document fields info found" }, {
  			documentFieldsId,
  			messageCode: MessageCodes.VENDOR_SESSION_MISSING_DATA,
  		});
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti document fields info not found");
  	}

  	this.logger.info({ message: "Document Fields" }, { documentFields });

  	this.logger.info({ message: "Fetching F2F Session info with Yoti SessionID" }, { yotiSessionID });

  	if (!f2fSession) {
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing Info in Session Table");
  	}

  	// Validate the AuthSessionState to be "F2F_ACCESS_TOKEN_ISSUED"
  	if (
  		f2fSession.authSessionState === AuthSessionState.F2F_ACCESS_TOKEN_ISSUED ||
      f2fSession.authSessionState === AuthSessionState.F2F_AUTH_CODE_ISSUED
  	) {
  		try {
  			await this.f2fService.sendToTXMA({
  				event_name: "F2F_YOTI_RESPONSE_RECEIVED",
  				...buildCoreEventFields(
  					f2fSession,
  					this.environmentVariables.issuer(),
  					f2fSession.clientIpAddress,
  					absoluteTimeNow,
  				),
					
  			});
  		} catch (error) {
  			this.logger.error("Failed to write TXMA event F2F_YOTI_RESPONSE_RECEIVED to SQS queue.", {
  				messageCode: MessageCodes.FAILED_TO_WRITE_TXMA,
  			});
  		}

  		const { credentialSubject, evidence } =
        this.generateVerifiableCredential.getVerifiedCredentialInformation(yotiSessionID, completedYotiSessionInfo, documentFields);

  		if (!credentialSubject || !evidence) {
  			this.logger.error({ message: "Missing Credential Subject or Evidence payload" }, {
  				messageCode: MessageCodes.VENDOR_SESSION_MISSING_DATA,
  			});
  			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing Credential Subject or Evidence payload");
  		}



  		let signedJWT;
  		try {
  			signedJWT = await this.verifiableCredentialService.generateSignedVerifiableCredentialJwt(f2fSession, credentialSubject, evidence, absoluteTimeNow);
  		} catch (error) {
  			if (error instanceof AppError) {
  				this.logger.error({ message: "Error generating signed verifiable credential jwt" }, {
  					error,
  					messageCode: MessageCodes.FAILED_SIGNING_JWT,
  				});
  				return new Response(HttpCodesEnum.SERVER_ERROR, "Failed to sign the verifiableCredential Jwt");
  			}
  		}
  		if (!signedJWT) {
  			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Unable to create signed JWT", {
  				messageCode: MessageCodes.FAILED_SIGNING_JWT,
  			});
  		}

  		try {
  			await this.f2fService.sendToIPVCore({
  				sub: f2fSession.subject,
  				state: f2fSession.state,
  				"https://vocab.account.gov.uk/v1/credentialJWT": [signedJWT],
  			});
  		} catch (error) {
  			this.logger.error({ message: "Failed to send VC to IPV Core Queue" }, {
  				error,
  				messageCode: MessageCodes.FAILED_SENDING_VC,
  			});
  			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to send to IPV Core", { shouldThrow: true });
  		}

  		// Document type objects to pass into TxMA event F2F_CRI_VC_ISSUED

  		let documentInfo;
  		let docName: any;

  		if (documentFields.document_type === "PASSPORT") {
  			docName = "passport";
  			documentInfo = [{
  				documentType: documentFields.document_type,
  				documentNumber: documentFields.document_number,
  				expiryDate: documentFields.expiration_date,
  				icaoIssuerCode: documentFields.issuing_country,
  			} ];
  		} else if (documentFields.document_type === "RESIDENCE_PERMIT") {
  			docName = "residencePermit";
  			documentInfo = [{
  				documentType: documentFields.document_type,
  				documentNumber: documentFields.document_number,
  				expiryDate: documentFields.expiration_date,
  				issueDate: documentFields.date_of_issue,
  				icaoIssuerCode: documentFields.issuing_country,
  			}];
  		} else if (documentFields.document_type === "DRIVING_LICENCE" && documentFields.issuing_country != "GBR") {
  			docName = "drivingPermit";
  			documentInfo = [{
  				documentType: documentFields.document_type,
  				personalNumber: documentFields.document_number,
  				expiryDate: documentFields.expiration_date,
  				issuedBy: documentFields.place_of_issue,
  				issueDate: documentFields.date_of_issue,
  				issuingCountry: documentFields.issuing_country,
  			}];

  		} else if (documentFields.document_type === "DRIVING_LICENCE") {
  			docName = "drivingPermit";
  			documentInfo = [{
  				documentType: documentFields.document_type,
  				personalNumber: documentFields.document_number,
  				expiryDate: documentFields.expiration_date,
  				issuedBy: documentFields.issuing_authority,
  				issueDate: documentFields.date_of_issue,
  				fullAddress: documentFields.structured_postal_address.formatted_address,
  				issuingCountry: documentFields.issuing_country,
  			}];
  		} else if (documentFields.document_type === "NATIONAL_ID") {
  			docName = "idCard";
  			documentInfo = [{
  				documentType: documentFields.document_type,
  				documentNumber: documentFields.document_number,
  				expiryDate: documentFields.expiration_date,
  				issueDate: documentFields.date_of_issue,
  				icaoIssuerCode: documentFields.issuing_country,
  			}];
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
  				extensions: {
  					evidence: [
  						{
  							type: evidence[0].type,
  							strengthScore: evidence[0].strengthScore,
  							validityScore: evidence[0].validityScore,
  							verificationScore: evidence[0].verificationScore,
  							ci: evidence[0].ci,
  							checkDetails: evidence[0].checkDetails,
  						},
  					],
  				},
  				restricted: {
  					user: {
  						name: documentFields.full_name,
  						birthDate: documentFields.date_of_birth,
  					},
  					[docName]: documentInfo,

  				},
  			});
  		} catch (error) {
  			this.logger.error("Failed to write TXMA event F2F_CRI_VC_ISSUED to SQS queue.", {
  				error,
  				messageCode: MessageCodes.FAILED_TO_WRITE_TXMA,
  			});
  		}
	
  		await this.f2fService.updateSessionAuthState(
  			f2fSession.sessionId,
  			AuthSessionState.F2F_CREDENTIAL_ISSUED,
  		);

  		return new Response(HttpCodesEnum.OK, "OK");
  	} else {
  		this.logger.error({ message: "AuthSession is in wrong Auth state", sessionState: f2fSession.authSessionState });
  		return new Response(HttpCodesEnum.UNAUTHORIZED, `AuthSession is in wrong Auth state: Expected state- ${AuthSessionState.F2F_ACCESS_TOKEN_ISSUED} or ${AuthSessionState.F2F_AUTH_CODE_ISSUED}, actual state- ${f2fSession.authSessionState}`);
  	}
  }
}
