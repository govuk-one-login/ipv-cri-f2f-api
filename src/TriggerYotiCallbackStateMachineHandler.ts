import { SQSEvent, SQSRecord } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Constants } from "./utils/Constants";
import { BatchItemFailure } from "./utils/BatchItemFailure";
import { MessageCodes } from "./models/enums/MessageCodes";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { fromEnv } from "@aws-sdk/credential-providers";
import { randomUUID } from "crypto";

const POWERTOOLS_METRICS_NAMESPACE = process.env.POWERTOOLS_METRICS_NAMESPACE ? process.env.POWERTOOLS_METRICS_NAMESPACE : Constants.F2F_METRICS_NAMESPACE;
const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : Constants.DEBUG;
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.YOTI_CALLBACK_SVC_NAME;

const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({ namespace: POWERTOOLS_METRICS_NAMESPACE, serviceName: POWERTOOLS_SERVICE_NAME });

class TriggerYotiCallbackStateMachineHandler implements LambdaInterface {
	// @metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: SQSEvent, context: any): Promise<string | null | undefined> {

		logger.setPersistentLogAttributes({});
		logger.addContext(context);

		if (event.Records.length === 1) {
			const record: SQSRecord = event.Records[0];
			logger.debug("Starting to process record", { record });

			const body = JSON.parse(record.body);
			logger.appendKeys({
				yotiSessionId: body.session_id,
			});

			logger.debug("Parsed SQS event body", body);

			if (body.topic === "session_completion" || body.topic ===  "thank_you_email_requested") {
				logger.info("Matched topic, triggering state machine", { arn: process.env.STATE_MACHINE_ARN });

				const params = {
					input: record.body,
					name: randomUUID(),
					// todo
					stateMachineArn: process.env.STATE_MACHINE_ARN,
			 };

				try {
					//  StartExecution
					logger.info("1");
					// process.env.AWS_REGION
					const stepFunctionsClient = new SFNClient({ region: "eu-west-2", credentials: fromEnv() });
					logger.info("2");

					const invokeCommand = new StartExecutionCommand(params);
					logger.info("3", { invokeCommand });
					const result = await stepFunctionsClient.send(invokeCommand);
					logger.info({ result, message: "step fn result " });
					return body;

				} catch (error) {
					logger.error({ message: "errorrrr", error });
				}


			} else {
				logger.warn("Unexpected topic received in request", {
					topic: body.topic,
					messageCode: MessageCodes.UNEXPECTED_VENDOR_MESSAGE,
				});
				return null;
			}
		} else {
			logger.warn("Unexpected no of records received", {
				messageCode: MessageCodes.INCORRECT_BATCH_SIZE,
			});
			return null;

		}
	}
}

const handlerClass = new TriggerYotiCallbackStateMachineHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
