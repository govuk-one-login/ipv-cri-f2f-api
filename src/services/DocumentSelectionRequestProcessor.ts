import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { Constants } from "../utils/Constants";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { buildGovNotifyEventFields } from "../utils/GovNotifyEvent";

export class DocumentSelectionRequestProcessor {

  	private static instance: DocumentSelectionRequestProcessor;

  	private readonly logger: Logger;

  	private readonly metrics: Metrics;

  	private readonly yotiService: YotiService;

  	private readonly PERSON_IDENTITY_TABLE_NAME = process.env.PERSON_IDENTITY_TABLE_NAME;

	private readonly YOTI_SDK = process.env.YOTISDK;

  	private readonly YOTICALLBACKURL = process.env.YOTICALLBACKURL;

		private readonly ISSUER = process.env.ISSUER!;

  	private readonly f2fService: F2fService;

  	constructor(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string) {
  		if (!this.PERSON_IDENTITY_TABLE_NAME || this.PERSON_IDENTITY_TABLE_NAME.trim().length === 0
			|| !this.YOTICALLBACKURL || this.YOTICALLBACKURL.trim().length === 0
			|| !this.YOTI_SDK || this.YOTI_SDK.trim().length === 0
			|| !this.ISSUER || this.ISSUER.trim().length === 0) {
  			logger.error("Environment variable PERSON_IDENTITY_TABLE_NAME or YOTI_SDK or YOTICALLBACKURL or ISSUER is not configured");
  			throw new AppError(HttpCodesEnum.SERVER_ERROR, Constants.ENV_VAR_UNDEFINED);
  		}
  		this.logger = logger;
  		this.metrics = metrics;
  		this.yotiService = YotiService.getInstance(this.logger, this.YOTI_SDK, YOTI_PRIVATE_KEY);
  		this.f2fService = F2fService.getInstance(this.PERSON_IDENTITY_TABLE_NAME, this.logger, createDynamoDbClient());
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

  	async processRequest(event: APIGatewayProxyEvent, sessionId: string): Promise<Response> {

  		const f2fSessionInfo = await this.f2fService.getSessionById(sessionId);
  		const personDetails = await this.f2fService.getPersonIdentityById(sessionId);

  		if (!personDetails || !f2fSessionInfo) {
  			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing details in SESSION or PERSON IDENTITY tables");
  		}

  		if (!event.body) {
  			throw new AppError(HttpCodesEnum.BAD_REQUEST, "No body present in post request");
  		}

  		const eventBody = JSON.parse(event.body);
  		const PostOfficeSelection = eventBody.post_office_selection;
  		const selectedDocument = eventBody.document_selection.document_selected;
			
  		let yotiSessionID, yotiSessionInfo;
			
  		this.logger.info("Creating new session in Yoti");
  		yotiSessionID = await this.yotiService.createSession(personDetails, selectedDocument, this.YOTICALLBACKURL);

  		if (!yotiSessionID) {
  			return new Response(HttpCodesEnum.SERVER_ERROR, "An error occured when creating Yoti Session");
  		}

  		this.logger.info("Fetching Session Info");
  		yotiSessionInfo = await this.yotiService.fetchSessionInfo(yotiSessionID);

  		if (!yotiSessionInfo) {
  			return new Response(HttpCodesEnum.SERVER_ERROR, "An error occurred when fetching Yoti Session");
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
  			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Empty required resources in Yoti");
  		}

  		this.logger.info({ message:"Generating Instructions PDF" }, { yotiSessionID });
  		const generateInstructionsResponse = await this.yotiService.generateInstructions(
  			yotiSessionID,
  			personDetails,
  			requirements,
  			PostOfficeSelection,
  		);

  		if (generateInstructionsResponse !== HttpCodesEnum.OK) {
  			return new Response(HttpCodesEnum.SERVER_ERROR, "An error occured when generating Yoti instructions pdf");
  		}

  		try {
  			await this.f2fService.sendToGovNotify(buildGovNotifyEventFields(sessionId, yotiSessionID, personDetails));
  		} catch (error) {
  			this.logger.error("FAILED_TO_WRITE_GOV_NOTIFY", {
  				yotiSessionID,
  				reason: "Yoti session created, faled to post message to GovNotify SQS Queue",
  				error,
  			});
  			return new Response(HttpCodesEnum.SERVER_ERROR, "An error occured when sending message to GovNotify handler");
  		}

			try {
  			await this.f2fService.sendToTXMA({
  				event_name: "F2F_YOTI_START",
  				...buildCoreEventFields(f2fSessionInfo, this.ISSUER, f2fSessionInfo.clientIpAddress, absoluteTimeNow),
  			});
  		} catch (error) {
  			this.logger.error("Failed to write TXMA event F2F_YOTI_START to SQS queue.");
  		}

  		return new Response(HttpCodesEnum.OK, "Instructions PDF Generated");
  	}
}
