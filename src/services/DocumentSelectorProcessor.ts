import { Response } from "../utils/Response";
import { CicService } from "./YotiService";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { AppError } from "../utils/AppError";


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

	constructor(logger: Logger, metrics: Metrics) {
		this.logger = logger;
		this.metrics = metrics;

		logger.debug("metrics is  " + JSON.stringify(this.metrics));
		this.metrics.addMetric("Called", MetricUnits.Count, 1);
	}

	static getInstance(logger: Logger, metrics: Metrics): DocumentSelectorProcessor {
		if (!DocumentSelectorProcessor.instance) {
			DocumentSelectorProcessor.instance = new DocumentSelectorProcessor(logger, metrics);
		}
		return DocumentSelectorProcessor.instance;
	}

	async processRequest(event: APIGatewayProxyEvent): Promise<Response> {
		const deserialisedRequestBody = JSON.parse(event.body as string);

	}
}
