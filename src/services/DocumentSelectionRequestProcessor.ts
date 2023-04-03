import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";

const PERSON_IDENTITY_TABLE_NAME = process.env.PERSON_IDENTITY_TABLE_NAME;
const YOTI_SDK = process.env.YOTISDK;
const YOTICALLBACKURL = process.env.YOTICALLBACKURL;

export class DocumentSelectionRequestProcessor {
  private static instance: DocumentSelectionRequestProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private readonly yotiService: YotiService;

	private readonly f2fService: F2fService;

	constructor(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string) {
		if (!PERSON_IDENTITY_TABLE_NAME || !YOTI_SDK || !YOTICALLBACKURL) {
			logger.error("Environment variable SESSION_TABLE or YOTI_SDK or YOTICALLBACKURL is not configured");
			throw new AppError(HttpCodesEnum.SERVER_ERROR,"Service incorrectly configured");
		}
		this.logger = logger;
		this.metrics = metrics;
		this.yotiService = YotiService.getInstance(this.logger, YOTI_SDK, YOTI_PRIVATE_KEY);
		this.f2fService = F2fService.getInstance(PERSON_IDENTITY_TABLE_NAME, this.logger, createDynamoDbClient());
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
			throw new AppError(HttpCodesEnum.BAD_REQUEST,"Missing Session info in table");
		}
		if (!event.body) {
			throw new AppError(HttpCodesEnum.BAD_REQUEST,"No body present in post request");
		}

		const eventBody = JSON.parse(event.body);
		const PostOfficeSelection = eventBody.post_office_selection;
		const selectedDocument = eventBody.document_selection.document_selected;

		this.logger.info("Creating new session in Yoti");
		const sessionID = await this.yotiService.createSession(personDetails, selectedDocument, YOTICALLBACKURL);

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

		this.logger.info("Generating Instructions PDF");
		const response = await this.yotiService.generateInstructions(
			sessionID,
			personDetails,
			requirements,
			PostOfficeSelection,
		);

		return new Response(HttpCodesEnum.OK, response);
	}
}
