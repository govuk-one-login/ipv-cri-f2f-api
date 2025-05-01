import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { Response } from "./utils/Response";

import { HttpCodesEnum } from "./utils/HttpCodesEnum";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { AppError } from "./utils/AppError";
import { GovNotifyRequestEmailProcessor } from "./services/GovNotifyRequestEmailProcessor";
import { GovNotifyRequestLetterProcessor } from "./services/GovNotifyRequestLetterProcessor";
import { Constants } from "./utils/Constants";


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
		try {
			logger.info("Event received: GOVNotify SendEmail", { event });
			const payload = event.body;
			let payloadParsed;
			if (payload) {
				if (payload.includes("email_address")) {
					logger.info("Event body", { payload });
					if (event.isBase64Encoded) {
						payloadParsed = JSON.parse(Buffer.from(payload, "base64").toString("binary"));
					} else {
						payloadParsed = JSON.parse(payload);
					}

					logger.info("PARSED JSON", { payloadParsed });
					logger.info("PARSED EMAIL", payloadParsed.email_address);
					logger.info("Starting GovNotifyRequestEmailProcessor");
					return await GovNotifyRequestEmailProcessor.getInstance(logger, metrics).mockSendEmail(payloadParsed.email_address);
				} else {
					logger.info("Event body", { payload });
					if (event.isBase64Encoded) {
						payloadParsed = JSON.parse(Buffer.from(payload, "base64").toString("binary"));
					} else {
						payloadParsed = JSON.parse(payload);
					}

					logger.info("PARSED JSON", { payloadParsed });
					logger.info("PARSED REFERENCE", payloadParsed.reference);
					logger.info("Starting GovNotifyRequestLetterProcessor");
					return await GovNotifyRequestLetterProcessor.getInstance(logger, metrics).mockSendLetter(payloadParsed.reference);
				}
			} else {
				const errorMessage = "No payload passed to stub";
				logger.error(errorMessage);
				return new Response(HttpCodesEnum.BAD_REQUEST, errorMessage);
			}

		} catch (err) {
			const errorMessage = "GovNotifyRequestProcessor encountered an error.";
			logger.error({ message: errorMessage, err });
			return err instanceof AppError
				? new Response(err.statusCode, err.message)
				: new Response(HttpCodesEnum.SERVER_ERROR, errorMessage);
		}
	}

}
const handlerClass = new MockGovNotifyHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
