/* eslint-disable complexity */
/* eslint-disable max-lines-per-function */
import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { buildGovNotifyEventFields } from "../utils/GovNotifyEvent";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { ISessionItem } from "../models/ISessionItem";
import { PersonIdentityItem } from "../models/PersonIdentityItem";
import { PostOfficeInfo } from "../models/YotiPayloads";
import { MessageCodes } from "../models/enums/MessageCodes";
import { AllDocumentTypes, DocumentNames, DocumentTypes } from "../models/enums/DocumentTypes";
import { ValidationHelper } from "../utils/ValidationHelper";
import { TxmaEventNames } from "../models/enums/TxmaEvents";
import { getClientConfig } from "../utils/ClientConfig";
import { Constants } from "../utils/Constants";

export class DocumentSelectionRequestProcessor {

  private static instance: DocumentSelectionRequestProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private yotiService!: YotiService;

  private readonly f2fService: F2fService;

  private readonly environmentVariables: EnvironmentVariables;

  private readonly validationHelper: ValidationHelper;

	private readonly YOTI_PRIVATE_KEY: string;

	constructor(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string) {
  	this.logger = logger;
  	this.metrics = metrics;
  	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.DOCUMENT_SELECTION_SERVICE);
  	this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
  	this.validationHelper = new ValidationHelper();
		this.YOTI_PRIVATE_KEY = YOTI_PRIVATE_KEY;
	}

	static getInstance(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
	): DocumentSelectionRequestProcessor {
  	if (!DocumentSelectionRequestProcessor.instance) {
  		DocumentSelectionRequestProcessor.instance =
        new DocumentSelectionRequestProcessor(logger, metrics, YOTI_PRIVATE_KEY);
  	}
  	return DocumentSelectionRequestProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent, sessionId: string, encodedHeader: string): Promise<Response> {
		
		if (!this.validationHelper.checkRequiredYotiVars) throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
		
  	let postOfficeSelection: PostOfficeInfo;
  	let selectedDocument;
  	let countryCode;
  	let yotiSessionId;
		let pdfPreference;
		let postalAddress;

  	if (!event.body) {
  		this.logger.error("No body present in post request", {
  			messageCode: MessageCodes.EMPTY_REQUEST,
  		});
  		throw new AppError(HttpCodesEnum.BAD_REQUEST, "No body present in post request");
  	}

  	try {
  		const eventBody = JSON.parse(event.body);
  		postOfficeSelection = eventBody.post_office_selection;
  		selectedDocument = eventBody.document_selection.document_selected;
  		countryCode = eventBody.document_selection.country_code;
			pdfPreference = eventBody.pdf_preference;
			postalAddress = eventBody.postal_address;
  		if (!postOfficeSelection || !selectedDocument || !pdfPreference) {
  			this.logger.error("Missing mandatory fields (post_office_selection, document_selection.document_selected or pdf_preference) in request payload", {
  				messageCode: MessageCodes.MISSING_MANDATORY_FIELDS,
  			});
  			return new Response(HttpCodesEnum.BAD_REQUEST, "Missing mandatory fields in request payload");
  		}
  	} catch (error) {
  		this.logger.error("Error parsing the payload", {
  			messageCode: MessageCodes.ERROR_PARSING_PAYLOAD,
  		});
  		return new Response(HttpCodesEnum.SERVER_ERROR, "An error occurred parsing the payload");
  	}


  	const f2fSessionInfo = await this.f2fService.getSessionById(sessionId);
  	this.logger.appendKeys({
  		govuk_signin_journey_id: f2fSessionInfo?.clientSessionId,
  	});

		await this.f2fService.userPdfPreferences(sessionId, pdfPreference, postalAddress, this.environmentVariables.personIdentityTableName());
	
		const personDetails = await this.f2fService.getPersonIdentityById(sessionId, this.environmentVariables.personIdentityTableName());
  	if (!personDetails || !f2fSessionInfo) {
  		this.logger.warn("Missing details in SESSION or PERSON IDENTITY tables", {
  			messageCode: MessageCodes.SESSION_NOT_FOUND,
  		});
  		throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing details in SESSION or PERSON IDENTITY tables");
  	}
		
		//Initialise Yoti Service base on session client_id
		const clientConfig = getClientConfig(this.environmentVariables.clientConfig(), f2fSessionInfo.clientId, this.logger);

		if (!clientConfig) {
  		this.logger.error("Unrecognised client in request", {
  			messageCode: MessageCodes.UNRECOGNISED_CLIENT,
  		});
  		return new Response(HttpCodesEnum.BAD_REQUEST, "Bad Request");
  	}

		this.yotiService = YotiService.getInstance(this.logger, this.YOTI_PRIVATE_KEY, clientConfig.YotiBaseUrl);

  	// Reject the request when session store does not contain email, familyName or GivenName fields
  	const data = this.validationHelper.isPersonDetailsValid(personDetails.emailAddress, personDetails.name);
  	if (data.errorMessage.length > 0) {
  		this.logger.error( data.errorMessage + " in the PERSON IDENTITY table", { messageCode : data.errorMessageCode });
  		return new Response(HttpCodesEnum.SERVER_ERROR, data.errorMessage + " in the PERSON IDENTITY table");
  	}

  	if (f2fSessionInfo.authSessionState === AuthSessionState.F2F_SESSION_CREATED && !f2fSessionInfo.yotiSessionId) {

  		try {
  			yotiSessionId = await this.createSessionGenerateInstructions(
  				personDetails,
  				f2fSessionInfo,
  				postOfficeSelection,
  				selectedDocument,
  				countryCode,
  			);
			  if (yotiSessionId) {
				  await this.postToGovNotify(f2fSessionInfo.sessionId, yotiSessionId, pdfPreference, personDetails);
				  await this.f2fService.updateSessionWithYotiIdAndStatus(
  					f2fSessionInfo.sessionId,
  					yotiSessionId,
  					AuthSessionState.F2F_YOTI_SESSION_CREATED,
  				);
				  const updatedTtl = absoluteTimeNow() + this.environmentVariables.authSessionTtlInSecs();
				  await this.f2fService.updateSessionTtl(f2fSessionInfo.sessionId, updatedTtl, this.environmentVariables.sessionTable());
				  await this.f2fService.updateSessionTtl(f2fSessionInfo.sessionId, updatedTtl, this.environmentVariables.personIdentityTableName());
			  } else {
				  this.logger.error(`No session found with yotiSessionId ${yotiSessionId}`);
				  throw new AppError(HttpCodesEnum.BAD_REQUEST, `No session found with yotiSessionId ${yotiSessionId}`);
			  }

  		} catch (error: any) {
  			this.logger.error("Error occurred during documentSelection orchestration", error.message,
  				{ messageCode: MessageCodes.FAILED_DOCUMENT_SELECTION_ORCHESTRATION });
  			if (error instanceof AppError) {
  				return new Response(HttpCodesEnum.SERVER_ERROR, error.message);
  			} else {
  				return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
  			}
  		}

  		let docName: DocumentNames.PASSPORT | DocumentNames.RESIDENCE_PERMIT | DocumentNames.DRIVING_LICENCE | DocumentNames.NATIONAL_ID;
		  let docType: DocumentTypes.PASSPORT | DocumentTypes.DRIVING_LICENCE | DocumentTypes.RESIDENCE_PERMIT | DocumentTypes.NATIONAL_ID;
  		switch (selectedDocument) {
  			case AllDocumentTypes.UK_PASSPORT:
  				docName = DocumentNames.PASSPORT;
				  docType = DocumentTypes.PASSPORT;
  				break;
  			case AllDocumentTypes.NON_UK_PASSPORT:
  				docName = DocumentNames.PASSPORT;
  				docType = DocumentTypes.PASSPORT;
  				break;
  			case AllDocumentTypes.BRP:
  				docName = DocumentNames.RESIDENCE_PERMIT;
  				docType = DocumentTypes.RESIDENCE_PERMIT;
  				break;
  			case AllDocumentTypes.UK_PHOTOCARD_DL:
  				docName = DocumentNames.DRIVING_LICENCE;
  				docType = DocumentTypes.DRIVING_LICENCE;
  				break;
  			case AllDocumentTypes.EU_PHOTOCARD_DL:
  				docName = DocumentNames.DRIVING_LICENCE;
  				docType = DocumentTypes.DRIVING_LICENCE;
  				break;
  			case AllDocumentTypes.EEA_IDENTITY_CARD:
  				docName = DocumentNames.NATIONAL_ID;
  				docType = DocumentTypes.NATIONAL_ID;
  				break;
  			default:
  				this.logger.error({ message: `Unable to find document type ${selectedDocument}`, messageCode: MessageCodes.INVALID_DOCUMENT_TYPE });
  				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Unknown document type");
  		}

  		try {
  			this.logger.info("Updating documentUsed in Session Table: ", { documentUsed: docType });
  			await this.f2fService.addUsersSelectedDocument(f2fSessionInfo.sessionId, docType, this.environmentVariables.sessionTable());
  		} catch (error: any) {
  			this.logger.error("Error occurred during documentSelection orchestration", error.message,
  				{ messageCode: MessageCodes.FAILED_DOCUMENT_SELECTION_ORCHESTRATION });
  			if (error instanceof AppError) {
  				return new Response(HttpCodesEnum.SERVER_ERROR, error.message);
  			} else {
  				return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
  			}
  		}

  		try {
  			const coreEventFields = buildCoreEventFields(
  				f2fSessionInfo,
  				this.environmentVariables.issuer(),
  				f2fSessionInfo.clientIpAddress,
  			);
  			await this.f2fService.sendToTXMA({
  				event_name: TxmaEventNames.F2F_YOTI_START,
  				...coreEventFields,
  				user: {
  					...coreEventFields.user,
  					govuk_signin_journey_id: f2fSessionInfo.clientSessionId,
  				},
  				extensions: {
  					evidence: [
  						{
  							txn: yotiSessionId,
  						},
  					],
  					post_office_details: [
						  {
							  name: postOfficeSelection.name,
							  address: postOfficeSelection.address,
							  post_code: postOfficeSelection.post_code,
							  location: [
								  {
									  latitude: postOfficeSelection.location.latitude,
									  longitude: postOfficeSelection.location.longitude,
								  },
							  ],
  						},
						  ],
  				},
  				restricted: {
  					name: personDetails.name,
  					[docName]: [
  						{
  							documentType: docType,
  							issuingCountry: countryCode,
  						},
  					],
  				},
  			}, encodedHeader);
  		} catch (error) {
  			this.logger.error("Failed to write TXMA event F2F_YOTI_START to SQS queue.", { messageCode: MessageCodes.ERROR_WRITING_TXMA });
  		}


  		return new Response(HttpCodesEnum.OK, "Instructions PDF Generated");

  	} else {
  		this.logger.warn(`Yoti session already exists for this authorization session or Session is in the wrong state: ${f2fSessionInfo.authSessionState}`, {
  			messageCode: MessageCodes.STATE_MISMATCH,
  		});
  		return new Response(HttpCodesEnum.UNAUTHORIZED, "Yoti session already exists for this authorization session or Session is in the wrong state");
  	}
	}

	async createSessionGenerateInstructions(
  	personDetails: PersonIdentityItem,
  	f2fSessionInfo: ISessionItem,
  	postOfficeSelection: PostOfficeInfo,
  	selectedDocument: string,
  	countryCode: string,
	): Promise<string> {
  	this.logger.info("Creating new session in Yoti for: ", { "sessionId": f2fSessionInfo.sessionId });

  	const yotiSessionId = await this.yotiService.createSession(personDetails, selectedDocument, countryCode, this.environmentVariables.yotiCallbackUrl());

  	if (!yotiSessionId) {
		  this.logger.error("An error occurred when creating Yoti SessionDS288", { messageCode: MessageCodes.FAILED_CREATING_YOTI_SESSION });
	      throw new AppError(HttpCodesEnum.SERVER_ERROR, "An error occurred when creating Yoti Session");
  	}

  	this.logger.info("Fetching Session Info");
  	const yotiSessionInfo = await this.yotiService.fetchSessionInfo(yotiSessionId);

  	if (!yotiSessionInfo) {
		  this.logger.error("An error occurred when fetching Yoti SessionDS296", { messageCode: MessageCodes.FAILED_FETCHING_YOTI_SESSION });
  		  throw new AppError(HttpCodesEnum.SERVER_ERROR, "An error occurred when fetching Yoti Session");
  	}

  	const requirements = yotiSessionInfo.capture.required_resources
  		.filter((x: any) => x.type.includes("DOCUMENT"))
  		.map((resource: any) => {
  			if (resource.type === "ID_DOCUMENT") {
  				return {
  					requirement_id: resource.id,
  					document: {
  						type: resource.type,
  						country_code: resource.supported_countries[0].code,
  						document_type:
              resource.supported_countries[0].supported_documents[0].type,
  					},
  				};
  			} else if (resource.type === "SUPPLEMENTARY_DOCUMENT") {
  				return {
  					requirement_id: resource.id,
  					document: {
  						type: resource.type,
  						country_code: resource.country_codes[0],
  						document_type: resource.document_types[0],
  					},
  				};
  			}
  		});

  	if (!requirements) {
		  this.logger.error("Empty required resources in Yoti");
  		  throw new AppError(HttpCodesEnum.SERVER_ERROR, "Empty required resources in Yoti");
  	}

  	this.logger.info({ message: "Generating Instructions PDF" });
  	const generateInstructionsResponse = await this.yotiService.generateInstructions(
  		yotiSessionId,
  		personDetails,
  		requirements,
  		postOfficeSelection,
  	);

  	if (generateInstructionsResponse !== HttpCodesEnum.OK) {
		  this.logger.error("An error occurred when generating Yoti instructions pdf", { messageCode: MessageCodes.FAILED_YOTI_PUT_INSTRUCTIONS });
  		  throw new AppError(HttpCodesEnum.SERVER_ERROR, "An error occurred when generating Yoti instructions pdf");
  	}

  	return yotiSessionId;
	}

	async postToGovNotify(sessionId: string, yotiSessionID: string, pdfPreference: string, personDetails: PersonIdentityItem): Promise<any> {
  	this.logger.info({ message: "Posting message to Gov Notify" });
  	try {
  		await this.f2fService.sendToGovNotify(buildGovNotifyEventFields(sessionId, yotiSessionID, pdfPreference, personDetails));
  	} catch (error) {
  		this.logger.error("Yoti session created, failed to post message to GovNotify SQS Queue", {
  			error,
  			messageCode: MessageCodes.FAILED_TO_WRITE_GOV_NOTIFY,
  		});
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "An error occurred when sending message to GovNotify handler");
  	}
	}
}
