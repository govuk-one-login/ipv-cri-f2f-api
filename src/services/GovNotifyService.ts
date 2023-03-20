// @ts-ignore
import {NotifyClient} from 'notifications-node-client';

import {EmailResponse} from "../models/EmailResponse";
import {EmailStatusEnum} from "../models/enums/EmailStatusEnum";
import {Email} from "../models/Email";
import {GovNotifyErrorMapper} from "./GovNotifyErrorMapper";
import {EnvironmentVariables} from "./EnvironmentVariables";
import {Logger} from "@aws-lambda-powertools/logger";
import {HttpCodesEnum} from "../models/enums/HttpCodesEnum";
import {AppError} from "../utils/AppError";
import {sleep} from "../utils/Sleep";
import {GetObjectCommand, S3Client} from "@aws-sdk/client-s3";
import {NodeHttpHandler} from "@aws-sdk/node-http-handler";

/**
 * Class to send emails using gov notify service
 */
export class GovNotifyService {

    private govNotify: NotifyClient;

    private govNotifyErrorMapper: GovNotifyErrorMapper;

    private static instance: GovNotifyService;

    private readonly environmentVariables: EnvironmentVariables;
    private readonly logger: Logger;

    private readonly s3Client: S3Client;

    /**
     * Constructor sets up the client needed to use gov notify service with API key read from env var
     *
     * @param environmentVariables
     * @private
     */
    private constructor(logger: Logger) {
        this.logger = logger;
        this.environmentVariables = new EnvironmentVariables(logger);
        this.govNotify = new NotifyClient(this.environmentVariables.apiKey());
        this.govNotifyErrorMapper = new GovNotifyErrorMapper();

        this.s3Client = new S3Client({
            region: process.env.REGION,
            maxAttempts: 2,
            requestHandler: new NodeHttpHandler({
                connectionTimeout: 29000,
                socketTimeout: 29000,
            }),
        });
    }

    static getInstance(logger: Logger): GovNotifyService {
        if (!this.instance) {
            this.instance = new GovNotifyService(logger);
        }
        return this.instance;
    }

    /**
     * Method to compose send email request
     * This method receive object containing the data to compose the email and retrieves needed field based on object type (Email | EmailMessage)
     * it attempts to send the email.
     * If there is a failure, it checks if the error is retryable. If it is, it retries for the configured max number of times with a cool off period after each try.
     * If the error is not retryable, an AppError is thrown
     * If max number of retries is exceeded an AppError is thrown
     *
     * @param message
     * @returns EmailResponse
     * @throws AppError
     */
    async sendEmail(message: Email): Promise<EmailResponse> {
        let personalisation: any;
        let encoded;
        let response;

        const bucketName = this.environmentVariables.s3BucketName();
        const fileName = message.templateId +".pdf";
        const input = {
            "Bucket": bucketName,
            "Key": fileName
        };
        const command = new GetObjectCommand(input);

        try {
            response = await this.s3Client.send(command);
        } catch (err) {
            this.logger.error('Unable to fetch the file from S3', {err})
            // @ts-ignore
            if (err.code === "NoSuchKey") {
                this.logger.error(`S3 read error - file ${ fileName } doesn't exist in bucket ${ bucketName }`);
                throw new AppError(HttpCodesEnum.NOT_FOUND,`S3 read error - file ${ fileName } doesn't exist in bucket ${ bucketName }`, { shouldThrow: true });
            }

        }
        try {
            const strBody = await response?.Body?.transformToByteArray();
            if (!strBody || strBody.length <= 0) {
                this.logger.error("S3 file has empty content");
                throw new AppError(HttpCodesEnum.BAD_REQUEST, "S3 file has empty content", { shouldThrow: false });
            }
            // @ts-ignore
            encoded = Buffer.from(strBody, 'binary').toString('base64')

        } catch (err) {
            console.log("Got err " + err)
            throw err;
        }


        personalisation = {
            subject: message.subject,
            "link_to_file": {"file": encoded, "confirm_email_before_download": true, "retention_period": "2 weeks"}
        };


        const options = {
            personalisation,
            reference: message.referenceId,
        };

        this.logger.debug("sendEmail", GovNotifyService.name);

        let retryCount = 0;
        //retry for maxRetry count configured value if fails
        while (retryCount++ < this.environmentVariables.maxRetries() + 1) {
            this.logger.debug(`sendEmail - trying to send email message ${GovNotifyService.name} ${new Date().toISOString()}`, {
                templateId: message.templateId,
                emailAddress: message.emailAddress,
                options
            });

            try {
                const response = await this.govNotify.sendEmail(message.templateId, message.emailAddress, options);
                this.logger.debug("sendEmail - response data after sending Email", response.data);
                this.logger.debug("sendEmail - response status after sending Email", GovNotifyService.name, response.status);
                return new EmailResponse(new Date().toISOString(), "", EmailStatusEnum.SENT, response.status);
            } catch (err: any) {
                this.logger.error(`sendEmail - GOV UK Notify threw an error`);

                if (err.response) {
                    // err.response.data.status_code 	err.response.data.errors
                    this.logger.error(`GOV UK Notify error ${GovNotifyService.name}`, {
                        statusCode: err.response.data.status_code,
                        errors: err.response.data.errors,
                    });
                }

                const appError: any = this.govNotifyErrorMapper.map(err);

                if (appError.obj!.shouldThrow) {
                    this.logger.info("sendEmail - Mapped error", GovNotifyService.name, appError.message);
                    throw appError;
                } else {
                    this.logger.info(`sendEmail - Mapped error ${GovNotifyService.name}`, {appError});
                    this.logger.info(`sendEmail - Retrying to send the email. Sleeping for ${this.environmentVariables.backoffPeriod()} ms ${GovNotifyService.name} ${new Date().toISOString()}`, {retryCount});
                    await sleep(this.environmentVariables.backoffPeriod());
                }
            }
        }

        // If the email couldn't be sent after the retries,
        // an error is thrown
        this.logger.error(`sendEmail - cannot send EMail ${GovNotifyService.name}`);
        throw new AppError(HttpCodesEnum.SERVER_ERROR, "Cannot send EMail");
    }
}
