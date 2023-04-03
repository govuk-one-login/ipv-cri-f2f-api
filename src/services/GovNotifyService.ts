// @ts-ignore
import { NotifyClient } from "notifications-node-client";

import { EmailResponse } from "../models/EmailResponse";
import { Email } from "../models/Email";
import { GovNotifyErrorMapper } from "./GovNotifyErrorMapper";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { Logger } from "@aws-lambda-powertools/logger";
import { HttpCodesEnum } from "../models/enums/HttpCodesEnum";
import { AppError } from "../utils/AppError";
import { sleep } from "../utils/Sleep";
import axios, { AxiosRequestConfig } from "axios";

/**
 * Class to send emails using gov notify service
 */
export class GovNotifyService {

    private govNotify: NotifyClient;

    private govNotifyErrorMapper: GovNotifyErrorMapper;

    private static instance: GovNotifyService;

    private readonly environmentVariables: EnvironmentVariables;

    private readonly logger: Logger;


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
    	let encoded;
    	// Fetch the instructions pdf from Yoti
    	this.logger.debug("Fetching the Instructions Pdf from yoti for sessionId: ", message.yotiSessionId);
    	try {
    		const instructionsPdf = await this.fetchInstructionsPdf(message.yotiSessionId);
    		encoded = Buffer.from(instructionsPdf, "binary").toString("base64");
    	} catch (err) {
    		this.logger.error("Error while fetching Instructions pfd or encoding the pdf." + err);
    		throw err;
    	}

    	const personalisation = {
    		"first name": message.firstName,
    		"last name": message.lastName,
    		"link_to_file": { "file": encoded, "confirm_email_before_download": true, "retention_period": "2 weeks" },
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
    			templateId: this.environmentVariables.templateId(),
    			emailAddress: message.emailAddress,
    			options,
    		});

    		try {
    			const emailResponse = await this.govNotify.sendEmail(this.environmentVariables.templateId(), message.emailAddress, options);
    			this.logger.debug("sendEmail - response data after sending Email", emailResponse.data);
    			this.logger.debug("sendEmail - response status after sending Email", GovNotifyService.name, emailResponse.status);
    			return new EmailResponse(new Date().toISOString(), "", emailResponse.status);
    		} catch (err: any) {
    			this.logger.error("sendEmail - GOV UK Notify threw an error");

    			if (err.response) {
    				// err.response.data.status_code 	err.response.data.errors
    				this.logger.error(`GOV UK Notify error ${GovNotifyService.name}`, {
    					statusCode: err.response.data.status_code,
    					errors: err.response.data.errors,
    				});
    			}

    			const appError: any = this.govNotifyErrorMapper.map(err);

    			if (appError.obj!.shouldThrow) {
    				this.logger.error("sendEmail - Mapped error", GovNotifyService.name, appError.message);
    				throw appError;
    			} else {
    				this.logger.error(`sendEmail - Mapped error ${GovNotifyService.name}`, { appError });
    				this.logger.error(`sendEmail - Retrying to send the email. Sleeping for ${this.environmentVariables.backoffPeriod()} ms ${GovNotifyService.name} ${new Date().toISOString()}`, { retryCount });
    				await sleep(this.environmentVariables.backoffPeriod());
    			}
    		}
    	}

    	// If the email couldn't be sent after the retries,
    	// an error is thrown
    	this.logger.error(`sendEmail - cannot send EMail ${GovNotifyService.name}`);
    	throw new AppError(HttpCodesEnum.SERVER_ERROR, "Cannot send EMail");
    }

    async fetchInstructionsPdf(sessionId: string): Promise<any> {
    	// const yotiRequest = await this.generateYotiRequest({
    	// 	method: HttpVerbsEnum.GET,
    	// 	endpoint: `/sessions/${sessionId}/instructions/pdf`,
    	// });
    	const yotiUrl = "https://api.yoti.com/idverify/v1/sessions/9801a8bc-e228-421f-b7d0-b71af0308dcd/instructions/pdf?sdkId=1f9edc97-c60c-40d7-becb-c1c6a2ec4963&nonce=b966aec6-3ae8-43b0-b138-2c012de87a2b&timestamp=1680176860762";

    	const yotiRequestConfig: AxiosRequestConfig = {
    		responseType: "arraybuffer",
    		responseEncoding: "binary",
    		headers: {
    			"X-Yoti-Auth-Digest": "ACfuuOPh6FYlqNeI8XEx6CkJ5LZRJ2c3R+FOZTuyXfBGh8JIV1MfX4QI9uyC2+xuRxZSWDnDlJ2iifYq+2edxSLVSzDJ7FZ7Le0Ni276TggcownBTrf/ZSGHlEM1/UmmFcSK10BJlhRXiqci9B5f/jc5y1a/irtoTVCZhiEcYilRSEaH/Ft8EnLUMGyMewp/uoJleL/EqwASPqnPeb8ekiz0C9TKSC1M5GvzkTB4q/6kPVr3YkMGYwdqkvpnzjBQuLIKqcqMZ6MrXbBjrqRkFhZC6Qb4uxpmRaS/FR4KQLU1OcOwwWEh2hljSDbPGcLHUlCxm6jCGMQvpCnheyALug==",
    			"X-Yoti-SDK": "Node",
    			"X-Yoti-SDK-Version": "Node-4.1.0",
    			Accept: "application/json",
    		},
    	};
    	this.logger.info("getPdf - Yoti", { yotiUrl, yotiRequestConfig });
    	const { data } = await axios.get(yotiUrl, yotiRequestConfig);
    	this.logger.info("Instructions Pdf received successfully for Yoti sessionId: ", sessionId);
    	return data;
    }
}
