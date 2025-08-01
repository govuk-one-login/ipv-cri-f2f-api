import { Logger } from "@aws-lambda-powertools/logger";
import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import crypto, { randomUUID } from "crypto";
import axios, { AxiosRequestConfig } from "axios";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { HttpVerbsEnum } from "../utils/HttpVerbsEnum";
import { PersonIdentityItem } from "../models/PersonIdentityItem";
import { ApplicantProfile, PostOfficeInfo, YotiSessionInfo, CreateSessionPayload, YotiCompletedSession } from "../models/YotiPayloads";
import { YotiDocumentTypesEnum, YOTI_REQUESTED_CHECKS, YOTI_REQUESTED_TASKS, YOTI_SESSION_TOPICS, UK_POST_OFFICE } from "../utils/YotiPayloadEnums";
import { personIdentityUtils } from "../utils/PersonIdentityUtils";
import { MessageCodes } from "../models/enums/MessageCodes";
import { ValidationHelper } from "../utils/ValidationHelper";
import { sleep } from "../utils/Sleep";

export class YotiService {
	readonly logger: Logger;

	readonly metrics: Metrics;

	private static instance: YotiService;

	readonly CLIENT_SDK_ID: string;

	readonly PEM_KEY: string;

	readonly YOTI_SESSION_TTL_DAYS: number;

	readonly RESOURCES_TTL_SECS: number;

	readonly FETCH_YOTI_SESSION_BACKOFF_PERIOD_MS: number;

	readonly FETCH_YOTI_SESSION_MAX_RETRIES: number;

	readonly validationHelper: ValidationHelper;

	constructor(logger: Logger, metrics: Metrics, CLIENT_SDK_ID: string, RESOURCES_TTL_SECS: number, YOTI_SESSION_TTL_DAYS: number,  FETCH_YOTI_SESSION_BACKOFF_PERIOD_MS: number, FETCH_YOTI_SESSION_MAX_RETRIES: number, PEM_KEY: string) {
    	this.RESOURCES_TTL_SECS = RESOURCES_TTL_SECS;
    	this.YOTI_SESSION_TTL_DAYS = YOTI_SESSION_TTL_DAYS;
		this.FETCH_YOTI_SESSION_BACKOFF_PERIOD_MS = FETCH_YOTI_SESSION_BACKOFF_PERIOD_MS;
		this.FETCH_YOTI_SESSION_MAX_RETRIES = FETCH_YOTI_SESSION_MAX_RETRIES
    	this.logger = logger;
		this.metrics = metrics;
    	this.CLIENT_SDK_ID = CLIENT_SDK_ID;
    	this.PEM_KEY = PEM_KEY;
    	this.validationHelper = new ValidationHelper();
	}

	static getInstance(logger: Logger, metrics: Metrics, PEM_KEY: string): YotiService {
		if (!YotiService.instance) {
			const { YOTISDK, RESOURCES_TTL_SECS, YOTI_SESSION_TTL_DAYS, FETCH_YOTI_SESSION_BACKOFF_PERIOD_MS, FETCH_YOTI_SESSION_MAX_RETRIES } = process.env;
			YotiService.instance = new YotiService(
				logger,
				metrics,
				YOTISDK!,
				Number(RESOURCES_TTL_SECS),
				Number(YOTI_SESSION_TTL_DAYS),
				Number(FETCH_YOTI_SESSION_BACKOFF_PERIOD_MS),
				Number(FETCH_YOTI_SESSION_MAX_RETRIES),
				PEM_KEY,
			);
		}
		return YotiService.instance;
	}

	private getRSASignatureForMessage(message: string): string {
    	return crypto
    		.createSign("RSA-SHA256")
    		.update(message)
    		.sign(this.PEM_KEY)
    		.toString("base64");
	}

	private getApplicantProfile(
    	personDetails: PersonIdentityItem,
	): ApplicantProfile {
    	const nameParts = personIdentityUtils.getNames(personDetails);
    	const givenNames = nameParts.givenNames.length > 1 ? nameParts.givenNames.join(" ") : nameParts.givenNames[0];
    	const familyNames = nameParts.familyNames.length > 1 ? nameParts.familyNames.join(" ") : nameParts.familyNames[0];

    	const address = personDetails.addresses[0];
    	if (!this.validationHelper.checkIfValidCountryCode(address.addressCountry)) {
    		this.logger.error({ message: "Invalid country code in the postalAddress" }, { messageCode: MessageCodes.INVALID_COUNTRY_CODE });
    		throw new AppError(HttpCodesEnum.BAD_REQUEST, "Invalid country code");
    	}
		
    	return {
    		full_name: `${givenNames} ${familyNames}`,
    		date_of_birth: `${personDetails.birthDate.map((bd) => ({ value: bd.value }))[0].value}`,
    		structured_postal_address: personIdentityUtils.getYotiStructuredPostalAddress(address, this.logger),
    	};
	}

	private generateYotiRequest(generateYotiPayload: {
    	method: any;
    	payloadJSON?: string;
		yotiBaseUrl: string;
    	endpoint: any;
    	configResponseType?: any;
    	configResponseEncoding?: any;
	}): { url: string; config: AxiosRequestConfig<any> | undefined } {
    	const { method, endpoint, yotiBaseUrl } = generateYotiPayload;

    	const nonce = randomUUID();
    	const unixTimestamp = Date.now();
    	const queryString = `sdkId=${this.CLIENT_SDK_ID}&nonce=${nonce}&timestamp=${unixTimestamp}`;

    	const endpointPath = `${endpoint}?${queryString}`;

    	let base64String = "";

    	if (
    		(method === HttpVerbsEnum.POST || method === HttpVerbsEnum.PUT) &&
			generateYotiPayload.payloadJSON
    	) {
    		base64String = `&${Buffer.from(generateYotiPayload.payloadJSON).toString(
    			"base64",
    		)}`;
    	}

    	let messageSignature;
    	try {
    		this.logger.info("Creating Yoti Message Signature");
    		messageSignature = this.getRSASignatureForMessage(
    			`${method}&${endpointPath}${base64String}`,
    		);
    		this.logger.info("Yoti Message Signature Created");
    	} catch (err) {
    		this.logger.error({ message: "An error occurred when creating Yoti message signature ", err });
    		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error create Yoti signature");
    	}


    	const config: AxiosRequestConfig<any> = {
    		headers: {
    			"X-Yoti-Auth-Digest": messageSignature,
    			"X-Yoti-SDK": "Node",
    			"X-Yoti-SDK-Version": "Node-4.1.0",
    			Accept: "application/json",
    		},
    	};
    	if (generateYotiPayload.configResponseType && generateYotiPayload.configResponseType.trim().length !== 0) {
    		config.responseType = "arraybuffer";
    	}
    	if (generateYotiPayload.configResponseEncoding && generateYotiPayload.configResponseEncoding.trim().length !== 0) {
    		config.responseEncoding = "binary";
    	}

    	return {
    		url: `${yotiBaseUrl}${endpointPath}`,
    		config,
    	};
	}

	async createSession(
    	personDetails: PersonIdentityItem,
    	selectedDocument: string,
    	countryCode: string,
		yotiBaseUrl: string,
    	yotiCallbackUrl: string,
	): Promise<string | undefined> {
    	const sessionDeadlineDate = new Date(new Date().getTime() + Number(process.env.YOTI_SESSION_TTL_DAYS) * 24 * 60 * 60 * 1000);
    	sessionDeadlineDate.setUTCHours(22, 0, 0, 0);
    	const payloadJSON: CreateSessionPayload = {
    		session_deadline: sessionDeadlineDate,
    		resources_ttl: Number(process.env.RESOURCES_TTL_SECS),
    		ibv_options: {
    			support: "MANDATORY",
    		},
    		user_tracking_id: personDetails.sessionId,
    		notifications: {
    			endpoint: yotiCallbackUrl,
    			topics: YOTI_SESSION_TOPICS,
    			auth_token: "string",
    			auth_type: "BASIC",
    		},
    		requested_checks: YOTI_REQUESTED_CHECKS,
    		required_documents: [
    			{
    				type: "ID_DOCUMENT",
    				filter: {
    					type: "DOCUMENT_RESTRICTIONS",
    					inclusion: "INCLUDE",
    					documents: [
    						{
    							country_codes: [countryCode],
    							document_types: [Object.values(YotiDocumentTypesEnum)[Object.keys(YotiDocumentTypesEnum).indexOf(selectedDocument.toUpperCase())]],
    						},
    					],
    				},
    			},
    		],
    		requested_tasks: YOTI_REQUESTED_TASKS,
    		resources: {
    			applicant_profile: this.getApplicantProfile(
    				personDetails,
    			),
    		},
    	};
    	if (selectedDocument.toUpperCase() === "UKPASSPORT") {
    		payloadJSON.required_documents[0].filter.allow_expired_documents = true;
    	}
    	const yotiRequest = this.generateYotiRequest({
    		method: HttpVerbsEnum.POST,
    		payloadJSON: JSON.stringify(payloadJSON),
			yotiBaseUrl,
    		endpoint: "/sessions",
    	});

		const requestMetricName = "YotiService_session_creation_response";
		const yotiRequestName = "createSession";
		const messageCode = MessageCodes.FAILED_CREATING_YOTI_SESSION;

		const sessionResponse = await this.makeRetryableYotiRequest(() => this.yotiPostRequest(yotiRequest, payloadJSON, requestMetricName), yotiRequestName, messageCode);
		this.logger.appendKeys({ yotiSessionId: sessionResponse?.session_id });
		return sessionResponse?.session_id
	}

	async fetchSessionInfo(sessionId: string, yotiBaseUrl: string): Promise<YotiSessionInfo | undefined> {
    	const yotiRequest = this.generateYotiRequest({
    		method: HttpVerbsEnum.GET,
			yotiBaseUrl,
    		endpoint: `/sessions/${sessionId}/configuration`,
    	});

		this.logger.info({
			message: "fetchSessionInfo - trying to fetch Yoti session", 
			yotiSessionId: sessionId,
    	});
		
		const requestMetricName = "YotiService_fetch_session_response";
		const yotiRequestName = "fetchSessionInfo";
		const messageCode = MessageCodes.FAILED_YOTI_GET_SESSION;

		return await this.makeRetryableYotiRequest(() => this.yotiGetRequest(yotiRequest, requestMetricName), yotiRequestName, messageCode)
	}

	async generateInstructions(
    	sessionId: string,
    	personDetails: PersonIdentityItem,
    	requirements: Array<{ requirement_id: string; document: { type: string; country_code: string; document_type: string } } | undefined>,
    	PostOfficeSelection: PostOfficeInfo,
		yotiBaseUrl: string,
	):Promise<number | undefined> {
    	const nameParts = personIdentityUtils.getNames(personDetails);
    	const givenNames = nameParts.givenNames.length > 1 ? nameParts.givenNames.join(" ") : nameParts.givenNames[0];
    	const familyNames = nameParts.familyNames.length > 1 ? nameParts.familyNames.join(" ") : nameParts.familyNames[0];

    	const payloadJSON = {
    		contact_profile: {
    			first_name: givenNames,
    			last_name: familyNames,
    			email: personIdentityUtils.getEmailAddress(personDetails),
    		},
    		documents: requirements,
    		branch: {
    			type: UK_POST_OFFICE.type,
    			fad_code: PostOfficeSelection.fad_code,
    		},
    	};

    	const yotiRequest = this.generateYotiRequest({
    		method: HttpVerbsEnum.PUT,
			yotiBaseUrl,
    		endpoint: `/sessions/${sessionId}/instructions`,
    		payloadJSON: JSON.stringify(payloadJSON),
    	});

		const requestMetricName = "YotiService_generate_instructions_response";
		const yotiRequestName = "generateInstructions";
		const messageCode = MessageCodes.FAILED_YOTI_PUT_INSTRUCTIONS;

		await this.makeRetryableYotiRequest(() => this.yotiPutRequest(yotiRequest, payloadJSON, requestMetricName), yotiRequestName, messageCode);
		return HttpCodesEnum.OK;
	}

	async fetchInstructionsPdf(sessionId: string, yotiBaseUrl: string): Promise<string | undefined> {
    	const yotiRequest = this.generateYotiRequest({
    		method: HttpVerbsEnum.GET,
			yotiBaseUrl,
    		endpoint: `/sessions/${sessionId}/instructions/pdf`,
    		configResponseType: "arraybuffer",
    		configResponseEncoding: "binary",
    	});

		const requestMetricName = "YotiService_fetch_instructions_response";
		const yotiRequestName = "fetchInstructionsPdf";
		const messageCode = MessageCodes.FAILED_YOTI_GET_INSTRUCTIONS;

		return await this.makeRetryableYotiRequest(() => this.yotiGetRequest(yotiRequest, requestMetricName), yotiRequestName, messageCode)
	}

	async getCompletedSessionInfo(sessionId: string, yotiBaseUrl: string): Promise<YotiCompletedSession | undefined> {
    	const yotiRequest = this.generateYotiRequest({
    		method: HttpVerbsEnum.GET,
			yotiBaseUrl,
    		endpoint: `/sessions/${sessionId}`,
    	});

		const requestMetricName = "YotiService_get_completed_session_response";
		const yotiRequestName = "getCompletedSessionInfo";
		const messageCode = MessageCodes.FAILED_YOTI_GET_COMPLETED_SESSION;

		return await this.makeRetryableYotiRequest(() => this.yotiGetRequest(yotiRequest, requestMetricName), yotiRequestName, messageCode)
	}

	async getMediaContent(sessionId: string, yotiBaseUrl: string, mediaId: string): Promise<any> {
    	const yotiRequest = this.generateYotiRequest({
    		method: HttpVerbsEnum.GET,
			yotiBaseUrl,
    		endpoint: `/sessions/${sessionId}/media/${mediaId}/content`,
    	});

		const requestMetricName = "YotiService_get_media_content_response";
		const yotiRequestName = "getMediaContent";
		const messageCode = MessageCodes.FAILED_YOTI_GET_MEDIA_CONTENT;

		return await this.makeRetryableYotiRequest(() => this.yotiGetRequest(yotiRequest, requestMetricName), yotiRequestName, messageCode)
	}

	async makeRetryableYotiRequest(yotiRequest: () => any, yotiRequestName: string, messageCode: string) {
		let retryCount = 0;

		const maxRetries = this.FETCH_YOTI_SESSION_MAX_RETRIES;
		const backoffPeriodMs = this.FETCH_YOTI_SESSION_BACKOFF_PERIOD_MS;
		while (retryCount <= maxRetries) {
			const yotiResponse = await yotiRequest();
			if (!yotiResponse.isError) { 
				return yotiResponse
			}

			const error = yotiResponse.error;
			const xRequestId = error.response ? error.response.headers["x-request-id"] : undefined;

			if (retryCount === maxRetries) {
				this.logger.error({ message: `${yotiRequestName} - cannot get response from yoti even after ${maxRetries} retries.`, 
					messageCode: MessageCodes.YOTI_RETRIES_EXCEEDED, 
					xRequestId });
				throw new AppError(HttpCodesEnum.SERVER_ERROR, `${yotiRequestName} - get response from yoti even after ${maxRetries} retries.`);
			}

			const is5xx = (error.response?.status >= 500 && error.response?.status < 600);
			const shouldRetry = (is5xx || error.response?.status === 429);

			if (shouldRetry) {
				this.logger.warn({ message: `${yotiRequestName} - Retrying request. Sleeping for ${backoffPeriodMs} ms`, 
					retryCount, 
					yotiErrorMessage: error.message, 
					yotiErrorCode: error.code,
					yotiErrorStatus: error.response?.status, 
					messageCode: messageCode, 
					xRequestId });
				await sleep(backoffPeriodMs * retryCount);
				retryCount++;
			} else {

				const message = "An error occurred when calling Yoti " + yotiRequestName;
				this.logger.error({ message, yotiErrorMessage: error.message, 
					yotiErrorCode: error.code, 
					messageCode: messageCode, 
					xRequestId });
				throw new AppError(HttpCodesEnum.SERVER_ERROR, `${yotiRequestName} - Unretryable error`);
			}
		}
	}

	async yotiGetRequest(yotiRequest: { url: string; config: AxiosRequestConfig<any> | undefined }, requestMetricName: string):Promise<any> {
				try {
					const response = await axios.get(yotiRequest.url, yotiRequest.config);
					const { data } = response;
					this.collectResponseMetric(requestMetricName, response)
					return data;
				} catch (error: any) {
					if (error.status) {
						this.collectResponseMetric(requestMetricName, error);
					}
					return {isError: true, error: error};
				}
	}	

	async yotiPostRequest(yotiRequest: { url: string; config: AxiosRequestConfig<any> | undefined }, payloadJSON:any, requestMetricName: string):Promise<any> {
		try {
			const response = await axios.post(
				yotiRequest.url,
				payloadJSON,
				yotiRequest.config,
			);
			const { data } = response;
			this.collectResponseMetric(requestMetricName, response)
			this.logger.appendKeys({ yotiSessionId: data.session_id });
			return data;
		} catch (error: any) {
			if (error.status) {
				this.collectResponseMetric(requestMetricName, error);
			}
			return {isError: true, error: error};
		}
	}	

	async yotiPutRequest(yotiRequest: { url: string; config: AxiosRequestConfig<any> | undefined }, payloadJSON:any, requestMetricName: string):Promise<any> {
		try {
			const response = await axios.put(
				yotiRequest.url,
				payloadJSON,
				yotiRequest.config,
			);
			const { data } = response;
			this.collectResponseMetric(requestMetricName, response)
			this.logger.appendKeys({ yotiSessionId: data.session_id });
			return data;
		} catch (error: any) {
			if (error.status) {
				this.collectResponseMetric(requestMetricName, error);
			}
			return {isError: true, error: error};
		}
	}

	collectResponseMetric(requestMetricName:string, response: any) {
		const singleMetric = this.metrics.singleMetric();
		singleMetric.addDimension("status_code", response.status.toString());
		singleMetric.addMetric(requestMetricName, MetricUnits.Count, 1);
	}
}
