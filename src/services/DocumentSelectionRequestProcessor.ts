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

export class DocumentSelectionRequestProcessor {

  	private static instance: DocumentSelectionRequestProcessor;

  	private readonly logger: Logger;

  	private readonly metrics: Metrics;

  	private readonly yotiService: YotiService;

  	private readonly f2fService: F2fService;

	private readonly environmentVariables: EnvironmentVariables;

  	constructor(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string) {
  		this.logger = logger;
  		this.metrics = metrics;
		this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.DOCUMENT_SELECTION_SERVICE);
  		this.yotiService = YotiService.getInstance(this.logger, this.environmentVariables.yotiSdk(), this.environmentVariables.resourcesTtl(), this.environmentVariables.clientSessionTokenTtl(), YOTI_PRIVATE_KEY);
  		this.f2fService = F2fService.getInstance(this.environmentVariables.personIdentityTableName(), this.logger, createDynamoDbClient());
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
			
		this.logger.info({ message:"Creating new session in Yoti for: " }, { sessionId });
  		const yotiSessionID = await this.yotiService.createSession(personDetails, selectedDocument, this.environmentVariables.yotiCallbackUrl());

  		if (!yotiSessionID) {
  			return new Response(HttpCodesEnum.SERVER_ERROR, "An error occured when creating Yoti Session");
  		}

		this.logger.info({ message:"New session created in Yoti: " }, { yotiSessionID });
  		this.logger.info("Fetching Session Info");
  		const yotiSessionInfo = await this.yotiService.fetchSessionInfo(yotiSessionID);

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
  				...buildCoreEventFields(f2fSessionInfo, this.environmentVariables.issuer(), f2fSessionInfo.clientIpAddress, absoluteTimeNow),
  			});
  		} catch (error) {
  			this.logger.error("Failed to write TXMA event F2F_YOTI_START to SQS queue.");
  		}

  		return new Response(HttpCodesEnum.OK, "Instructions PDF Generated");
  	}
}
