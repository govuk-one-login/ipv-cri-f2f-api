import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";

export class DocumentSelectionRequestProcessor {
  private static instance: DocumentSelectionRequestProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private readonly yotiService: YotiService;

  constructor(logger: Logger, metrics: Metrics) {
    this.logger = logger;
    this.metrics = metrics;
    this.yotiService = YotiService.getInstance(
      this.logger,
      "1f9edc97-c60c-40d7-becb-c1c6a2ec4963",
      Buffer.from(
        'TEST',
        "base64"
      ).toString("utf8")
    );
  }

  static getInstance(
    logger: Logger,
    metrics: Metrics
  ): DocumentSelectionRequestProcessor {
    if (!DocumentSelectionRequestProcessor.instance) {
      DocumentSelectionRequestProcessor.instance =
        new DocumentSelectionRequestProcessor(logger, metrics);
    }
    return DocumentSelectionRequestProcessor.instance;
  }

  async processRequest() {
		this.logger.info('Creating new session in Yoti')
    const sessionID = await this.yotiService.createSession();

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
      sessionID,
      requirements
    );

		this.logger.info('Fetching Instructions PDF')
    const pdf = await this.yotiService.fetchInstructionsPdf(
      sessionID
    );

    return {
      statusCode: 200,
      body: pdf,
    };
  }
}
