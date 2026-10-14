import { SQSEvent, SQSRecord } from "aws-lambda";
import { logger } from "@govuk-one-login/cri-logger";
import { metrics } from "@govuk-one-login/cri-metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons/lib/esm/types";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { fromEnv } from "@aws-sdk/credential-providers";
import { MessageCodes } from "./models/enums/MessageCodes";
import { YotiCallbackTopics } from "./models/enums/YotiCallbackTopics";
import { passEntireBatch, failEntireBatch } from "./utils/SqsBatchResponseHelper";

const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME;

class TriggerYotiCallbackStateMachineHandler implements LambdaInterface {
	stepFunctionsClient: SFNClient;

	constructor() {
		this.stepFunctionsClient = new SFNClient({ region: process.env.REGION, credentials: fromEnv() });
	}

	@metrics.logMetrics({ throwOnEmptyMetrics: false, captureColdStartMetric: true })
	async handler(event: SQSEvent, context: any): Promise<any> {

		logger.resetKeys();
		logger.addContext(context);

		logger.info("Ensuring service is " + POWERTOOLS_SERVICE_NAME + " deployed - " + new Date().toDateString());

		if (event.Records.length === 1) {
			const record: SQSRecord = event.Records[0];
			logger.info("Starting to process record");

			const body = JSON.parse(record.body);
			logger.appendKeys({
				yotiSessionId: body.session_id,
			});

			logger.info("Parsed SQS event body", body);

			if (
				body.topic === YotiCallbackTopics.SESSION_COMPLETION ||
				body.topic === YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED ||
				body.topic === YotiCallbackTopics.FIRST_BRANCH_VISIT
				) {
				logger.info("Matched topic, triggering state machine", { topic: body.topic });

				const params = {
					input: record.body,
					name:  `${body.session_id}-${Date.now()}`,
					stateMachineArn: process.env.STATE_MACHINE_ARN,
			 };

				try {
					const invokeCommand: StartExecutionCommand = new StartExecutionCommand(params);
					await this.stepFunctionsClient.send(invokeCommand);

				} catch (error) {
					logger.error({ message: "There was an error executing the yoti callback step function", error });
					throw error;
				}

			} else {
				logger.warn("Unexpected topic received in request", {
					topic: body.topic,
					messageCode: MessageCodes.UNEXPECTED_VENDOR_MESSAGE,
				});
				return passEntireBatch;
			}
		} else {
			logger.warn("Unexpected no of records received", {
				messageCode: MessageCodes.INCORRECT_BATCH_SIZE,
			});
			return failEntireBatch;
		}
	}
}

export const handlerClass = new TriggerYotiCallbackStateMachineHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);
