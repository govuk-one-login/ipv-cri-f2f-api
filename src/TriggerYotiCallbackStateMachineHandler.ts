import { SQSEvent, SQSRecord } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { fromEnv } from "@aws-sdk/credential-providers";
import { randomUUID } from "crypto";
import { MessageCodes } from "./models/enums/MessageCodes";
import { YotiCallbackTopics } from "./models/enums/YotiCallbackTopics";
import { Constants } from "./utils/Constants";
import {
	passEntireBatch,
	failEntireBatch,
} from "./utils/SqsBatchResponseHelper";

const {
	POWERTOOLS_METRICS_NAMESPACE = Constants.F2F_METRICS_NAMESPACE,
	POWERTOOLS_LOG_LEVEL = Constants.DEBUG,
	POWERTOOLS_SERVICE_NAME = Constants.TRIGGER_YOTI_STATE_MACHINE_SVC_NAME,
} = process.env;

export const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

const metrics = new Metrics({
	namespace: POWERTOOLS_METRICS_NAMESPACE,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

class TriggerYotiCallbackStateMachineHandler implements LambdaInterface {
  stepFunctionsClient: SFNClient;

  constructor() {
  	this.stepFunctionsClient = new SFNClient({
  		region: process.env.REGION,
  		credentials: fromEnv(),
  	});
  }

  @metrics.logMetrics({
  	throwOnEmptyMetrics: false,
  	captureColdStartMetric: true,
  })
  async handler(event: SQSEvent, context: any): Promise<any> {
  	logger.setPersistentLogAttributes({});
  	logger.addContext(context);

  	if (event.Records.length === 1) {
  		const record: SQSRecord = event.Records[0];
  		logger.debug("Starting to process record");

  		const body = JSON.parse(record.body);
  		logger.appendKeys({
  			yotiSessionId: body.session_id,
  		});

  		logger.debug("Parsed SQS event body", body);

  		if (
  			body.topic === YotiCallbackTopics.SESSION_COMPLETION ||
        body.topic === YotiCallbackTopics.THANK_YOU_EMAIL_REQUESTED
  		) {
  			logger.info("Matched topic, triggering state machine", {
  				topic: body.topic,
  			});

  			const params = {
  				input: record.body,
  				name: `${body.session_id}-${Date.now()}`,
  				stateMachineArn: process.env.STATE_MACHINE_ARN,
  			};

  			try {
  				const invokeCommand: StartExecutionCommand =
            new StartExecutionCommand(params);
  				await this.stepFunctionsClient.send(invokeCommand);
  			} catch (error) {
  				logger.error({
  					message:
              "There was an error executing the yoti callback step function",
  					error,
  				});
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
