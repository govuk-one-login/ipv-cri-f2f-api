import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
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
import { YotiSessionDocument, ID_DOCUMENT_TEXT_DATA_EXTRACTION } from "../utils/YotiPayloadEnums";
import { MessageCodes } from "../models/enums/MessageCodes";
import { DocumentNames, DocumentTypes } from "../models/enums/DocumentTypes";
import { DrivingPermit, IdentityCard, Passport, Name } from "../utils/IVeriCredential";
import { personIdentityUtils } from "../utils/PersonIdentityUtils";
import { YotiCallbackPayload } from "../type/YotiCallbackPayload";
import { ISessionItem } from "../models/ISessionItem";
import { TxmaEventNames } from "../models/enums/TxmaEvents";
import { getClientConfig } from "../utils/ClientConfig";
import { ValidationHelper } from "../utils/ValidationHelper";
import { Constants } from "../utils/Constants";
import { APIGatewayProxyResult } from "aws-lambda";

export class YotiSessionCompletionProcessor {

  private static instance: YotiSessionCompletionProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private yotiService!: YotiService;

  private readonly f2fService: F2fService;

  private readonly environmentVariables: EnvironmentVariables;

  private readonly verifiableCredentialService: VerifiableCredentialService;

  private readonly kmsJwtAdapter: KmsJwtAdapter;

  private readonly generateVerifiableCredential: GenerateVerifiableCredential;

	private readonly YOTI_PRIVATE_KEY: string;

	private readonly validationHelper: ValidationHelper;

	constructor(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
	) {
  	this.logger = logger;
  	this.metrics = metrics;
  	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.CALLBACK_SERVICE);
  	this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, this.metrics, createDynamoDbClient());
  	this.kmsJwtAdapter = new KmsJwtAdapter(this.environmentVariables.kmsKeyArn());
  	this.verifiableCredentialService = VerifiableCredentialService.getInstance(this.environmentVariables.sessionTable(), this.kmsJwtAdapter, this.environmentVariables.issuer(), this.logger, this.environmentVariables.dnsSuffix());
  	this.generateVerifiableCredential = GenerateVerifiableCredential.getInstance(this.logger);
		this.YOTI_PRIVATE_KEY = YOTI_PRIVATE_KEY;
		this.validationHelper = new ValidationHelper();
	}

	isTaskDone(data: any, taskType: string): boolean {
  	if (data.tasks && Array.isArray(data.tasks)) {
  		for (const task of data.tasks) {
  			if (task.type === taskType && task.state === YotiSessionDocument.DONE_STATE) {
  				return true;
  			}
  		}
  	}
  	return false;
	}

	static getInstance(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
	): YotiSessionCompletionProcessor {
  	if (!YotiSessionCompletionProcessor.instance) {
  		YotiSessionCompletionProcessor.instance = new YotiSessionCompletionProcessor(
  			logger,
  			metrics,
  			YOTI_PRIVATE_KEY,
  		);
  	}
  	return YotiSessionCompletionProcessor.instance;
	}

	// eslint-disable-next-line complexity
	async processRequest(eventBody: YotiCallbackPayload): Promise<APIGatewayProxyResult> {
		if (!this.validationHelper.checkRequiredYotiVars) throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		
  	const yotiSessionID = eventBody.session_id;

  	this.logger.info({ message: "Fetching F2F Session info with Yoti SessionID" }, { yotiSessionID });
	  if (yotiSessionID) {
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

			//Initialise Yoti Service base on session client_id
			const clientConfig = getClientConfig(this.environmentVariables.clientConfig(), f2fSession.clientId, this.logger);

			if (!clientConfig) {
				this.logger.error("Unrecognised client in request", {
					messageCode: MessageCodes.UNRECOGNISED_CLIENT,
				});
				return Response(HttpCodesEnum.BAD_REQUEST, "Bad Request");
			}

			this.yotiService = YotiService.getInstance(this.logger, this.metrics, this.YOTI_PRIVATE_KEY);


		  this.logger.info({ message: "Fetching status for Yoti SessionID" });
		  // eslint-disable-next-line max-len
		  const completedYotiSessionInfo = await this.yotiService.getCompletedSessionInfo(yotiSessionID, this.environmentVariables.fetchYotiSessionBackoffPeriod(), this.environmentVariables.fetchYotiSessionMaxRetries(), clientConfig.YotiBaseUrl);

		  if (!completedYotiSessionInfo) {
			  this.logger.error({ message: "No YOTI Session found with ID:" }, {
				  messageCode: MessageCodes.VENDOR_SESSION_NOT_FOUND,
			  });
			  await this.sendErrorMessageToIPVCore(f2fSession, "Yoti Session not found");
			  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti Session not found");
		  }

		  if (completedYotiSessionInfo.state !== YotiSessionDocument.COMPLETED) {
			  this.logger.error({ message: "Session in Yoti does not have status COMPLETED" }, {
				  messageCode: MessageCodes.VENDOR_SESSION_STATE_MISMATCH,
			  });
			  await this.sendErrorMessageToIPVCore(f2fSession, "Yoti Session not complete");
			  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti Session not complete", { shouldThrow: true });
		  }

		  this.logger.appendKeys({
			  yotiUserTrackingId: completedYotiSessionInfo.user_tracking_id,
		  });

  		const idDocuments = completedYotiSessionInfo.resources.id_documents;
  		const idDocumentsDocumentFields = [];

  		for (const document of idDocuments) {
  			if (document.document_fields) {
  				const taskTypeToCheck = ID_DOCUMENT_TEXT_DATA_EXTRACTION;
  				const isDone = this.isTaskDone(document, taskTypeToCheck);
  				if (isDone) idDocumentsDocumentFields.push(document.document_fields);
  			}
  		}

  		if (idDocumentsDocumentFields.length === 0) {
  			// If there is no document_fields, yoti have told us there will always be ID_DOCUMENT_TEXT_DATA_CHECK
  			const documentTextDataCheck = completedYotiSessionInfo.checks.find((check) => check.type === "ID_DOCUMENT_TEXT_DATA_CHECK");

			  this.logger.error({ message: "No document_fields found in completed Yoti Session" }, {
				  messageCode: MessageCodes.VENDOR_SESSION_MISSING_DATA,
  				ID_DOCUMENT_TEXT_DATA_CHECK: documentTextDataCheck?.report?.recommendation,
			  });
			  await this.sendErrorMessageToIPVCore(f2fSession, "Yoti document_fields not populated");
			  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti document_fields not populated");
  		} else if (idDocumentsDocumentFields.length > 1) {
  			this.logger.error({ message: "Multiple document_fields found in completed Yoti Session" }, {
				  messageCode: MessageCodes.UNEXPECTED_VENDOR_MESSAGE,
			  });
			  await this.sendErrorMessageToIPVCore(f2fSession, "Multiple document_fields in response");
			  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Multiple document_fields in response");
  		}

		  const documentFieldsId = idDocumentsDocumentFields[0].media.id;
		  if (!documentFieldsId) {
			  this.logger.error({ message: "No media ID found in completed Yoti Session" }, {
				  messageCode: MessageCodes.VENDOR_SESSION_MISSING_DATA,
			  });
			  await this.sendErrorMessageToIPVCore(f2fSession, "Yoti document_fields media ID not found");
			  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti document_fields media ID not found");
		  }

		  const documentFields = await this.yotiService.getMediaContent(yotiSessionID, clientConfig.YotiBaseUrl, documentFieldsId);
		  if (!documentFields) {
			  this.logger.error({ message: "No document fields info found" }, {
				  documentFieldsId,
				  messageCode: MessageCodes.VENDOR_SESSION_MISSING_DATA,
			  });
			  await this.sendErrorMessageToIPVCore(f2fSession, "Yoti document fields info not found");
			  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti document fields info not found");
		  }

		  // Validate the AuthSessionState to be "F2F_ACCESS_TOKEN_ISSUED" or "F2F_AUTH_CODE_ISSUED"
		  if (
			  f2fSession.authSessionState === AuthSessionState.F2F_ACCESS_TOKEN_ISSUED ||
			  f2fSession.authSessionState === AuthSessionState.F2F_AUTH_CODE_ISSUED
		  ) {
  			const coreEventFields = buildCoreEventFields(f2fSession, this.environmentVariables.issuer(), f2fSession.clientIpAddress);
			  try {
				  await this.f2fService.sendToTXMA({
					  event_name: TxmaEventNames.F2F_YOTI_RESPONSE_RECEIVED,
					  ...coreEventFields,
  					user: {
  						...coreEventFields.user,
  					},
					  extensions: {
  						previous_govuk_signin_journey_id: f2fSession.clientSessionId,
						  evidence: [
							  {
								  txn: yotiSessionID,
							  },
						  ],
					  },

				  });
				// ignored so as not log PII
				/* eslint-disable @typescript-eslint/no-unused-vars */
			  } catch (error) {
				  this.logger.error("Failed to write TXMA event F2F_YOTI_RESPONSE_RECEIVED to SQS queue.", {
					  messageCode: MessageCodes.FAILED_TO_WRITE_TXMA,
				  });
			  }
			
			this.metrics.addMetric("SessionCompletion_yoti_response_parsed", MetricUnits.Count, 1);

  			const { given_names, family_name, full_name } = documentFields;

  			const missingGivenName = this.checkMissingField(given_names, "given_names");
  			const missingFamilyName = this.checkMissingField(family_name, "family_name");
  			const missingFullName = this.checkMissingField(full_name, "full_name");
  			let VcNameParts: Name[];

  			this.logger.info("Missing details check", { missingGivenName, missingFamilyName, missingFullName });

  			// If all three name fields are missing, log an error and throw an exception
  			if (missingGivenName && missingFamilyName && missingFullName) {
  				this.logger.error({ message: "Missing Name Info in DocumentFields" }, {
  					messageCode: MessageCodes.VENDOR_SESSION_MISSING_DATA,
  				});
  				await this.sendErrorMessageToIPVCore(f2fSession, "Missing Name Info in DocumentFields");
  				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing Name Info in DocumentFields");
  			}

  			if (missingGivenName || missingFamilyName) {
  				const personDetails = await this.f2fService.getPersonIdentityById(f2fSession.sessionId, this.environmentVariables.personIdentityTableName());

  				if (!personDetails) {
  					this.logger.warn("Missing details in PERSON IDENTITY tables", {
  						messageCode: MessageCodes.PERSON_NOT_FOUND,
  					});
  					await this.sendErrorMessageToIPVCore(f2fSession, "Missing details in PERSON IDENTITY tables");
  					throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing details in PERSON IDENTITY tables");
  				}

  				this.logger.info("Getting NameParts using F2F Person Identity Info");
  				VcNameParts = personIdentityUtils.getNamesFromPersonIdentity(personDetails, documentFields, this.logger);
  			} else {
  				this.logger.info("Getting NameParts using Yoti DocumentFields Info");
  				VcNameParts = personIdentityUtils.getNamesFromYoti(given_names, family_name);
  			}


			  const { credentialSubject, evidence, rejectionReasons } = this.generateVerifiableCredential.getVerifiedCredentialInformation(yotiSessionID, completedYotiSessionInfo, documentFields, VcNameParts);

			  if (!credentialSubject || !evidence) {
				  this.logger.error({ message: "Missing Credential Subject or Evidence payload" }, {
					  messageCode: MessageCodes.VENDOR_SESSION_MISSING_DATA,
				  });
				  await this.sendErrorMessageToIPVCore(f2fSession, "Missing Credential Subject or Evidence payload");
				  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing Credential Subject or Evidence payload");
			  }

			  let signedJWT;
			  let unsignedJWT;
			  try {
				  unsignedJWT = this.verifiableCredentialService.generateVerifiableCredentialJwt(f2fSession, credentialSubject, evidence, absoluteTimeNow);
				  if (unsignedJWT) {
					  signedJWT = await this.verifiableCredentialService.signGeneratedVerifiableCredentialJwt(unsignedJWT);
				  }
			  } catch (error) {
				  if (error instanceof AppError) {
					  this.logger.error({ message: "Error generating signed verifiable credential jwt" }, {
						  error,
						  messageCode: MessageCodes.FAILED_SIGNING_JWT,
					  });
					  await this.sendErrorMessageToIPVCore(f2fSession, "Failed to sign the verifiableCredential Jwt");
					  return Response(HttpCodesEnum.SERVER_ERROR, "Failed to sign the verifiableCredential Jwt");
				  }
			  }

			  if (!signedJWT) {
  				await this.sendErrorMessageToIPVCore(f2fSession, "Unable to create signed JWT");
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

			  await this.sendYotiEventsToTxMA(documentFields, VcNameParts, f2fSession, yotiSessionID, evidence, rejectionReasons);

			  await this.f2fService.updateSessionAuthState(
				  f2fSession.sessionId,
				  AuthSessionState.F2F_CREDENTIAL_ISSUED,
			  );

			  this.metrics.addMetric("state-F2F_CREDENTIAL_ISSUED", MetricUnits.Count, 1);
			  this.metrics.addMetric("SessionCompletion_VC_issued_successfully", MetricUnits.Count, 1);
			  return Response(HttpCodesEnum.OK, "OK");
		  } else {
			  this.logger.error({ message: "AuthSession is in wrong Auth state", sessionState: f2fSession.authSessionState });
			  await this.sendErrorMessageToIPVCore(f2fSession, "AuthSession is in wrong Auth state"); 
			  return Response(HttpCodesEnum.UNAUTHORIZED, `AuthSession is in wrong Auth state: Expected state- ${AuthSessionState.F2F_ACCESS_TOKEN_ISSUED} or ${AuthSessionState.F2F_AUTH_CODE_ISSUED}, actual state- ${f2fSession.authSessionState}`);
		  }
	  } else {
		  //log error
		  // throw error response
		  throw new AppError(HttpCodesEnum.SERVER_ERROR, "");
	  }

	}

	checkMissingField(field: string, fieldName: string): boolean {
  	if (!field || field.trim() === "") {
  		this.logger.info({ message: `Missing ${fieldName} field in documentFields response` });
  		return true;
  	}
  	return false;
	}

	async sendYotiEventsToTxMA(documentFields: any, VcNameParts: Name[], f2fSession: any, yotiSessionID: string, evidence: any, rejectionReasons: [{ ci: string; reason: string }]): Promise<any> {
	  // Document type objects to pass into TxMA event F2F_CRI_VC_ISSUED

	  let docName: DocumentNames.PASSPORT | DocumentNames.DRIVING_LICENCE | DocumentNames.NATIONAL_ID;
	  let documentInfo: Passport | DrivingPermit | IdentityCard;
	  switch (documentFields.document_type) {
		  case DocumentTypes.PASSPORT:
			  docName = DocumentNames.PASSPORT;
			  documentInfo = {
				  documentType: documentFields.document_type,
				  documentNumber: documentFields.document_number,
				  expiryDate: documentFields.expiration_date,
				  icaoIssuerCode: documentFields.issuing_country,
			  };
			  break;
		  case DocumentTypes.DRIVING_LICENCE:
			  docName = DocumentNames.DRIVING_LICENCE;
			  documentInfo = {
				  documentType: documentFields.document_type,
				  personalNumber: documentFields.document_number,
				  expiryDate: documentFields.expiration_date,
				  issuingCountry: documentFields.issuing_country,
			  };
			  if (documentFields.issuing_country !== "GBR") {
				  documentInfo.issuedBy = documentFields.place_of_issue;
				  documentInfo.issueDate = documentFields.date_of_issue;
			  } else {
				  documentInfo.issuedBy = documentFields.issuing_authority;
				  documentInfo.issueDate = documentFields.date_of_issue;
				  documentInfo.fullAddress = documentFields.structured_postal_address?.formatted_address;
			  }
			  break;
		  case DocumentTypes.NATIONAL_ID:
			  docName = DocumentNames.NATIONAL_ID;
			  documentInfo = {
				  documentType: documentFields.document_type,
				  documentNumber: documentFields.document_number,
				  expiryDate: documentFields.expiration_date,
				  issueDate: documentFields.date_of_issue,
				  icaoIssuerCode: documentFields.issuing_country,
			  };
			  break;
		  default:
			  this.logger.error({ message: `Unable to find document type ${documentFields.document_type}`, messageCode: MessageCodes.INVALID_DOCUMENT_TYPE });
			  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Unknown document type");
	  }
	  try {
		  await this.f2fService.sendToTXMA({
			  event_name: TxmaEventNames.F2F_CRI_VC_ISSUED,
			  ...buildCoreEventFields(
				  f2fSession,
				  this.environmentVariables.issuer(),
				  f2fSession.clientIpAddress,
			  ),
			  extensions: {
  				previous_govuk_signin_journey_id: f2fSession.clientSessionId,
				  evidence: [
					  {
						  type: evidence[0].type,
						  txn: yotiSessionID,
						  strengthScore: evidence[0].strengthScore,
						  validityScore: evidence[0].validityScore,
						  verificationScore: evidence[0].verificationScore,
						  ci: evidence[0].ci,
  						  ciReasons: rejectionReasons,
						  checkDetails: evidence[0].checkDetails,
					  },
				  ],
			  },
			  restricted: {
				  name: VcNameParts,
				  birthDate: [{ value: documentFields.date_of_birth }],
				  [docName]: [documentInfo],
			  },
		  });

	  } catch (error) {
		  this.logger.error("Failed to write TXMA event F2F_CRI_VC_ISSUED to SQS queue.", {
			  error,
			  messageCode: MessageCodes.FAILED_TO_WRITE_TXMA,
		  });
	  }
	}

	async sendErrorMessageToIPVCore(f2fSession: ISessionItem, errorMessage: string) : Promise<any> {
  	this.logger.error(`VC generation failed : ${errorMessage}`, {		
  		messageCode: MessageCodes.ERROR_GENERATING_VC,
  	});
  	try {
  		await this.f2fService.sendToIPVCore({
  			sub: f2fSession.subject,
  			state: f2fSession.state,
  			error: "access_denied",
  			error_description: `VC generation failed : ${errorMessage}`,
  		});
  	} catch (error) {
  		this.logger.error({ message: "Failed to send error message to IPV Core Queue" }, {
  			error,
  			messageCode: MessageCodes.FAILED_SENDING_VC,
  		});		
  	}
	}
}

