import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Response } from "./utils/Response";
import { ResourcesEnum } from "./models/enums/ResourcesEnum";

import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { AppError } from "./utils/AppError";
import { GovNotifyRequestProcessor } from "./services/GovNotifyRequestProcessor";


const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : Constants.DEBUG;
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.AUTHORIZATIONCODE_LOGGER_SVC_NAME;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class MockGovNotifyHandler implements LambdaInterface {

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: APIGatewayProxyEvent, context: any): Promise<APIGatewayProxyResult> {
		 switch (event.resource) {
			 case ResourcesEnum.GOV_NOTIFY_SEND_EMAIL:
				 if (event.httpMethod === "POST") {
					 try {
						 logger.info("Event received: GOVNotify SendEmail", { event });
						 logger.info("ABOUT TO PARSE JSON");
						 const payload = event.body;
						 let payloadParsed;

						 if (payload) {
							 logger.info("Event body", { payload });
							 if (event.isBase64Encoded) {
								 payloadParsed = JSON.parse(Buffer.from(payload, "base64").toString("binary"));
							 } else {
								 payloadParsed = JSON.parse(payload);
							 }

							 logger.info("PARSED JSON", { payloadParsed });
							 logger.info("PARSED EMAIL", payloadParsed.email_address);
							 logger.info("FINISHED PARSING, awaiting return");
							 return await GovNotifyRequestProcessor.getInstance(logger, metrics).mockSendEmail(payloadParsed.email_address);
						 }

					 } catch (err: any) {
						 logger.error({ message: "An error has occurred.", err });
						 if (err instanceof AppError) {
							 return new Response(err.statusCode, err.message);
						 }
						 return new Response(HttpCodesEnum.SERVER_ERROR, "An error has occurred");
					 }
				 }
				 break;
					
			 default:
			 	throw new AppError(`Requested resource does not exist: ${event.resource}`, HttpCodesEnum.NOT_FOUND);
		}
	}

}
const handlerClass = new MockGovNotifyHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
