import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { Constants } from "../utils/Constants";

export class DocumentSelectionRequestProcessor {

  	private static instance: DocumentSelectionRequestProcessor;

  	private readonly logger: Logger;

  	private readonly metrics: Metrics;

  	private readonly yotiService: YotiService;

  	private readonly PERSON_IDENTITY_TABLE_NAME = process.env.PERSON_IDENTITY_TABLE_NAME;

	private readonly YOTI_SDK = process.env.YOTISDK;

  	private readonly YOTICALLBACKURL = process.env.YOTICALLBACKURL;

  	private readonly f2fService: F2fService;


  	constructor(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string) {
  		if (!this.PERSON_IDENTITY_TABLE_NAME || this.PERSON_IDENTITY_TABLE_NAME.trim().length === 0
			|| !this.YOTICALLBACKURL || this.YOTICALLBACKURL.trim().length === 0
			|| !this.YOTI_SDK || this.YOTI_SDK.trim().length === 0) {
  			logger.error("Environment variable PERSON_IDENTITY_TABLE_NAME or YOTI_SDK or YOTICALLBACKURL is not configured");
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

  		const personDetails = await this.f2fService.getPersonIdentityById(sessionId);
  		if (!personDetails) {
  			throw new AppError(HttpCodesEnum.BAD_REQUEST, "Missing Session info in table");
  		}
  		if (!event.body) {
  			throw new AppError(HttpCodesEnum.BAD_REQUEST, "No body present in post request");
  		}

  		const eventBody = JSON.parse(event.body);
  		const PostOfficeSelection = eventBody.post_office_selection;
  		const selectedDocument = eventBody.document_selection.document_selected;

  		this.logger.info("Creating new session in Yoti");
  		const sessionID = await this.yotiService.createSession(personDetails, selectedDocument, this.YOTICALLBACKURL);

  		this.logger.info("Fetching Session Info");
  		const sessionInfo = await this.yotiService.fetchSessionInfo(sessionID);

  		const requirements = sessionInfo.capture.required_resources
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

  		this.logger.info({ message:"Generating Instructions PDF" }, { sessionID });
  		const response = await this.yotiService.generateInstructions(
  			sessionID,
  			personDetails,
  			requirements,
  			PostOfficeSelection,
  		);

  		return new Response(HttpCodesEnum.OK, response);
  	}
}
