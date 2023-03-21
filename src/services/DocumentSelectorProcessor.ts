import { Response } from "../utils/Response";
import { CicService } from "./YotiService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";
import { YotiService } from "./YotiService";


interface ClientConfig {
	jwksEndpoint: string;
	clientId: string;
	redirectUri: string;
}
export class DocumentSelectorProcessor {
	private static instance: DocumentSelectorProcessor;

	private readonly logger: Logger;

	private readonly metrics: Metrics;

	private readonly cicService: CicService;

	private readonly yotiService: YotiService;

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.metrics = metrics;

		logger.debug("metrics is  " + JSON.stringify(this.metrics));
		this.metrics.addMetric("Called", MetricUnits.Count, 1);
		this.yotiService = new YotiService();
	}

	static getInstance(logger: Logger, metrics: Metrics): DocumentSelectorProcessor {
		if (!DocumentSelectorProcessor.instance) {
			DocumentSelectorProcessor.instance = new DocumentSelectorProcessor(logger, metrics);
		}
		return DocumentSelectorProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent): Promise<Response> {
		console.log('here');
		const deserialisedRequestBody = JSON.parse(event.body as string);
		console.log('deserialisedRequestBody', deserialisedRequestBody);

		//Create Session with Yoti
		const sessionID = await this.yotiService.createSession();

		console.log('sessionID', sessionID);
		this.logger.info("Session created in YOTI");
		const sessionInfo = await this.yotiService.fetchSessionInfo(sessionID);

		console.log('sessionInfo', sessionInfo);

		const requirements = sessionInfo
      .parsedResponse
      .capture
      .required_resources
      .filter((x: any) => x.type.includes('DOCUMENT'))
      .map((resource: any) => {
         if (resource.type === 'ID_DOCUMENT') {
            return {
               requirement_id: resource.id,
               document: {
                  type: resource.type,
                  country_code: resource.supported_countries[0].code,
                  document_type: resource.supported_countries[0].supported_documents[0].type
               }
            }
         } else if (resource.type === 'SUPPLEMENTARY_DOCUMENT') {
            return {
               requirement_id: resource.id,
               document: {
                  type: resource.type,
                  country_code: resource.country_codes[0],
                  document_type: resource.document_types[0]
               }
            }
         }

      });
   const generateInstructions = await this.yotiService.generateInstructions(sessionID, requirements);
	 console.log('generateInstructions', generateInstructions);

	 return generateInstructions;
  //  await yotiService.fetchInstructionsPdf(id);

	}
}