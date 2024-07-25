/* eslint-disable complexity */
import { Context, SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";
import { SendToGovNotifyProcessor } from "./services/SendToGovNotifyProcessor";
import { getParameter } from "./utils/Config";
import { EnvironmentVariables } from "./services/EnvironmentVariables";
import { ServicesEnum } from "./models/enums/ServicesEnum";
import { failEntireBatch, passEntireBatch } from "./utils/SqsBatchResponseHelper";
import { MessageCodes } from "./models/enums/MessageCodes";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.EMAIL_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : Constants.DEBUG;
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.EMAIL_LOGGER_SVC_NAME;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

let YOTI_PRIVATE_KEY: string;
let GOVUKNOTIFY_API_KEY: string;


class SendToGovNotifyHandler implements LambdaInterface {
	private readonly environmentVariables = new EnvironmentVariables(logger, ServicesEnum.GOV_NOTIFY_SERVICE);

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: any, context: Context): Promise<any> {

		// clear PersistentLogAttributes set by any previous invocation, and add lambda context for this invocation
		logger.setPersistentLogAttributes({});
		logger.addContext(context);
		
		try {
			if (!YOTI_PRIVATE_KEY) {
				logger.info({ message: "Fetching YOTI_PRIVATE_KEY from SSM" });
				try {
					YOTI_PRIVATE_KEY = await getParameter(this.environmentVariables.yotiKeySsmPath());
				} catch (error) {
					logger.error(`failed to get param from ssm at ${this.environmentVariables.yotiKeySsmPath()}`, {
						messageCode: MessageCodes.MISSING_CONFIGURATION,
						error,
					});
					throw error;
				}
			}
			if (!GOVUKNOTIFY_API_KEY) {
				logger.info({ message: "Fetching GOVUKNOTIFY_API_KEY from SSM" });
				try {
					GOVUKNOTIFY_API_KEY = await getParameter(this.environmentVariables.govNotifyApiKeySsmPath());
				} catch (error) {
					logger.error(`failed to get param from ssm at ${this.environmentVariables.govNotifyApiKeySsmPath()}`, {
						messageCode: MessageCodes.MISSING_CONFIGURATION,
						error,
					});
					throw error;
				}
			}
			let govnotifyServiceId;
			try {
				govnotifyServiceId = GOVUKNOTIFY_API_KEY.substring(GOVUKNOTIFY_API_KEY.length - 73, GOVUKNOTIFY_API_KEY.length - 37);
			} catch (error) {
				logger.error("failed to extract govnotifyServiceId from the GOVUKNOTIFY_API_KEY", { error });
				throw error;
			}
			return await SendToGovNotifyProcessor.getInstance(logger, metrics, YOTI_PRIVATE_KEY, GOVUKNOTIFY_API_KEY, govnotifyServiceId).processRequest(event);

		} catch (error) {
			logger.error({ message: "Email could not be sent. Returning failed message", error } );
			throw error;
		}

	}

}

const handlerClass = new SendToGovNotifyHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
