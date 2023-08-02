import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Logger } from "@aws-lambda-powertools/logger";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { Constants } from "./utils/Constants";
import { BatchItemFailure } from "./utils/BatchItemFailure";

const POWERTOOLS_LOG_LEVEL = process.env.POWERTOOLS_LOG_LEVEL ? process.env.POWERTOOLS_LOG_LEVEL : Constants.DEBUG;
const POWERTOOLS_SERVICE_NAME = process.env.POWERTOOLS_SERVICE_NAME ? process.env.POWERTOOLS_SERVICE_NAME : Constants.DEQUEUE_LOGGER_SVC_NAME;

export const logger = new Logger({
	logLevel: POWERTOOLS_LOG_LEVEL,
	serviceName: POWERTOOLS_SERVICE_NAME,
});

export const s3Client = new S3Client({
	region: process.env.REGION,
	maxAttempts: 2,
	requestHandler: new NodeHttpHandler({
		connectionTimeout: 29000,
		socketTimeout: 29000,
	}),
});

class DequeueHandler implements LambdaInterface {
	async handler(event: any): Promise<any> {
		logger.info("Starting to process records");
		const batchFailures: BatchItemFailure[] = [];

		for await (const record of event.Records) {
			const body = JSON.parse(record.body);
			const bucket = process.env.EVENT_TEST_BUCKET_NAME;
			const propertyName = process.env.PROPERTY_NAME || "sub";
			const folder = process.env.BUCKET_FOLDER_PREFIX;
			const timestamp = Math.floor(Date.now() / 1000);
			const key = `${folder}${body[propertyName]}-${timestamp}-${record.messageId}`;

			const uploadParams = {
				Bucket: bucket,
				Key: key,
				Body: JSON.stringify(body),
				ContentType: "application/json",
			};
			
			try {
				logger.info(`Uploading object with key ${key} to bucket ${bucket}`);
				await s3Client.send(new PutObjectCommand(uploadParams));
			} catch (error) {
				batchFailures.push(new BatchItemFailure(record.messageId));
				logger.error({ message: "Error writing keys to S3 bucket", error });
			}
		};

		logger.info("Finished processing records")
		return { batchItemFailures: batchFailures };
  }
}

const handlerClass = new DequeueHandler();
export const lambdaHandler = handlerClass.handler.bind(handlerClass);