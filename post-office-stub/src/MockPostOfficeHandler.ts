import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { logger } from "@govuk-one-login/cri-logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Response } from "./utils/Response";
import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { LambdaInterface } from "@aws-lambda-powertools/commons/lib/esm/types";
import { AppError } from "./utils/AppError";
import { PostOfficeRequestProcessor } from "./services/PostOfficeRequestProcessor";
import { Constants } from "./utils/Constants";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.POST_OFFICE_MOCK_LOGGER_SVC_NAME;

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class MockPostOfficeHandler implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
		try {
			logger.info("Event received: PostOffice SearchLocation", { event });
			const payload = event.body;
			let payloadParsed;

			if (payload) {
				if (event.isBase64Encoded) {
					payloadParsed = JSON.parse(Buffer.from(payload, "base64").toString("binary"));
				} else {
					payloadParsed = JSON.parse(payload);
				}
				if (payloadParsed.searchString && payloadParsed.productFilter) {
					logger.info("PARSED JSON", { payloadParsed }, "PARSED POSTCODE", payloadParsed.searchString, "FINISHED PARSING, awaiting return");
					logger.info("Starting PostOfficeRequestProcessor");
					return await PostOfficeRequestProcessor.getInstance(metrics).mockSearchLocations(payloadParsed.searchString);
				} else {
					return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred - missing payload parameters");
				}
			} 
			return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred - missing payload");

		} catch (err: any) {
			logger.error({ message: "An error has occurred.", err });
			if (err instanceof AppError) {
				return new Response(err.statusCode, err.message);
			}
			return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
		}
	}
}
const handlerClass = new MockPostOfficeHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
