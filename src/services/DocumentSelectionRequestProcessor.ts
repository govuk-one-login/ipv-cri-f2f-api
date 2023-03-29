import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";

const SESSION_TABLE = process.env.SESSION_TABLE;
const YOTI_SDK = process.env.YOTISDK;

export class DocumentSelectionRequestProcessor {
  private static instance: DocumentSelectionRequestProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private readonly yotiService: YotiService;

	private readonly f2fService: F2fService;

  constructor(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string) {
		if (!SESSION_TABLE || !YOTI_SDK) {
			logger.error("Environment variable SESSION_TABLE or YOTI_SDK is not configured");
			throw new AppError("Service incorrectly configured", HttpCodesEnum.SERVER_ERROR);
		}
    this.logger = logger;
    this.metrics = metrics;
    this.yotiService = YotiService.getInstance(
      this.logger,
      YOTI_SDK,YOTI_PRIVATE_KEY);
		this.f2fService = F2fService.getInstance(SESSION_TABLE, this.logger, createDynamoDbClient());
  }

  static getInstance(
    logger: Logger,
    metrics: Metrics,
		YOTI_PRIVATE_KEY: string
  ): DocumentSelectionRequestProcessor {
    if (!DocumentSelectionRequestProcessor.instance) {
      DocumentSelectionRequestProcessor.instance =
        new DocumentSelectionRequestProcessor(logger, metrics, YOTI_PRIVATE_KEY);
    }
    return DocumentSelectionRequestProcessor.instance;
  }

  async processRequest(event: APIGatewayProxyEvent, sessionId: string): Promise<Response> {

		const session = await this.f2fService.getSessionById(sessionId);
		console.log('session', session);
		if (!session){
			throw new AppError("Missing Session info in table", HttpCodesEnum.BAD_REQUEST);
		}
		if (!event.body){
			throw new AppError("No body present in post request", HttpCodesEnum.BAD_REQUEST);
		}
		const postOfficeInfo = (JSON.parse(event.body)).post_office_selection;
		console.log('post_office_selection', postOfficeInfo);

		this.logger.info('Creating new session in Yoti')
    const sessionID = await this.yotiService.createSession(session, postOfficeInfo);

		this.logger.info('Fetching Session InfoF')
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

		this.logger.info('Generating Instructions PDF')
    await this.yotiService.generateInstructions(
      session,
      requirements,
			postOfficeInfo
    );

		this.logger.info('Fetching Instructions PDF')
    const pdf = await this.yotiService.fetchInstructionsPdf(
      sessionID
    );

		return new Response(HttpCodesEnum.OK, pdf);
  }
}
