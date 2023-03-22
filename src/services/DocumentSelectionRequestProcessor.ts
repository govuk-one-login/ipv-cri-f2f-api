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
		this.yotiService = YotiService.getInstance(this.logger);
	}

	static getInstance(logger: Logger, metrics: Metrics): DocumentSelectionRequestProcessor {
		if (!DocumentSelectionRequestProcessor.instance) {
			DocumentSelectionRequestProcessor.instance = new DocumentSelectionRequestProcessor(logger, metrics);
		}
		return DocumentSelectionRequestProcessor.instance;
	}

	async processRequest() {
		const id = await this.yotiService.createSession();
		console.log('id', id);

		return id;
		// const info = await this.yotiService.fetchSessionInfo(id);
		// console.log('info', info);

		// const requirements = info
		// 		.parsedResponse
		// 		.capture
		// 		.required_resources
		// 		.filter((x: any) => x.type.includes('DOCUMENT'))
		// 		.map((resource: any) => {
		// 			if (resource.type === 'ID_DOCUMENT') {
		// 					return {
		// 						requirement_id: resource.id,
		// 						document: {
		// 								type: resource.type,
		// 								country_code: resource.supported_countries[0].code,
		// 								document_type: resource.supported_countries[0].supported_documents[0].type
		// 						}
		// 					}
		// 			} else if (resource.type === 'SUPPLEMENTARY_DOCUMENT') {
		// 					return {
		// 						requirement_id: resource.id,
		// 						document: {
		// 								type: resource.type,
		// 								country_code: resource.country_codes[0],
		// 								document_type: resource.document_types[0]
		// 						}
		// 					}
		// 			}

		// 		});
				
		// console.log('requirements', requirements);

		// const generateResponse = await this.yotiService.generateInstructions(id, requirements);
		// console.log('generateResponse', generateResponse);

		// return generateResponse;
	}
}
