import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Logger } from "@aws-lambda-powertools/logger";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import { Constants } from "./utils/Constants";
import { BatchItemFailure } from "./utils/BatchItemFailure";

const {
  POWERTOOLS_LOG_LEVEL = Constants.DEBUG,
  POWERTOOLS_SERVICE_NAME = Constants.DEQUEUE_LOGGER_SVC_NAME,
  REGION,
  EVENT_TEST_BUCKET_NAME,
  PROPERTY_NAME = "sub",
  BUCKET_FOLDER_PREFIX,
} = process.env;

const logger = new Logger({ logLevel: POWERTOOLS_LOG_LEVEL, serviceName: POWERTOOLS_SERVICE_NAME });

const s3Client = new S3Client({
  region: REGION,
  maxAttempts: 2,
  requestHandler: new NodeHttpHandler({ connectionTimeout: 29000, socketTimeout: 29000 }),
});

class DequeueHandler implements LambdaInterface {
  async handler(event: any): Promise<any> {
    logger.info("Starting to process records");
    const batchFailures: BatchItemFailure[] = [];

    for await (const { body, messageId } of event.Records) {
      const parsedBody = JSON.parse(body);
      const propertyValue = PROPERTY_NAME.split('.').reduce((acc, key) => acc[key], parsedBody);
      const timestamp = new Date().toISOString();
      const key = `${BUCKET_FOLDER_PREFIX}${propertyValue}-${timestamp}-${messageId}`;
      const uploadParams = { Bucket: EVENT_TEST_BUCKET_NAME, Key: key, Body: JSON.stringify(parsedBody), ContentType: "application/json" };

      try {
        logger.info(`Uploading object with key ${key} to bucket ${EVENT_TEST_BUCKET_NAME}`);
        await s3Client.send(new PutObjectCommand(uploadParams));
      } catch (error) {
        batchFailures.push(new BatchItemFailure(messageId));
        logger.error({ message: "Error writing keys to S3 bucket", error });
      }
    }

    logger.info("Finished processing records");
    return { batchItemFailures: batchFailures };
  }
}

export const lambdaHandler = new DequeueHandler().handler.bind(DequeueHandler);
