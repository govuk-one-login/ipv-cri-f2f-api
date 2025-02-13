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
import { Constants } from "../utils/Constants";

export class YotiService {
	readonly logger: Logger;

	readonly metrics: Metrics;

	private static instance: YotiService;

	readonly CLIENT_SDK_ID: string;

	readonly PEM_KEY: string;

	readonly YOTI_SESSION_TTL_DAYS: number;

	readonly RESOURCES_TTL_SECS:number;

	readonly YOTI_BASE_URL: string;

	readonly validationHelper: ValidationHelper;

	constructor(logger: Logger, metrics: Metrics, CLIENT_SDK_ID: string, RESOURCES_TTL_SECS: number, YOTI_SESSION_TTL_DAYS: number, PEM_KEY: string, YOTI_BASE_URL: string) {
    	this.RESOURCES_TTL_SECS = RESOURCES_TTL_SECS;
    	this.YOTI_SESSION_TTL_DAYS = YOTI_SESSION_TTL_DAYS;
    	this.logger = logger;
		this.metrics = metrics;
    	this.CLIENT_SDK_ID = CLIENT_SDK_ID;
    	this.PEM_KEY = PEM_KEY;
    	this.YOTI_BASE_URL = YOTI_BASE_URL;
    	this.validationHelper = new ValidationHelper();
	}

	static getInstance(logger: Logger, metrics:Metrics, PEM_KEY: string, YOTI_BASE_URL: string): YotiService {
		if (!YotiService.instance) {
			const { YOTISDK, RESOURCES_TTL_SECS, YOTI_SESSION_TTL_DAYS } = process.env;
			YotiService.instance = new YotiService(
				logger,
				metrics,
				YOTISDK!,
				Number(RESOURCES_TTL_SECS),
				Number(YOTI_SESSION_TTL_DAYS),
				PEM_KEY,
				YOTI_BASE_URL,
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
    	endpoint: any;
    	configResponseType?: any;
    	configResponseEncoding?: any;
	}): { url: string; config: AxiosRequestConfig<any> | undefined } {
    	const { method, endpoint } = generateYotiPayload;

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
    		url: `${this.YOTI_BASE_URL}${endpointPath}`,
    		config,
    	};
	}

	async createSession(
    	personDetails: PersonIdentityItem,
    	selectedDocument: string,
    	countryCode: string,
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
    		endpoint: "/sessions",
    	});
    	try {
    		const response = await axios.post(
    			yotiRequest.url,
    			payloadJSON,
    			yotiRequest.config,
    		);
			const { data } = response;
    		this.logger.appendKeys({ yotiSessionId: data.session_id });

    		this.logger.info("Received response from Yoti for create /sessions");

			const singleMetric = this.metrics.singleMetric();
			singleMetric.addDimension("status_code", response.status.toString());
			singleMetric.addMetric("YotiService_session_creation_response", MetricUnits.Count, 1);

    		return data.session_id;
    	} catch (error: any) {
			if (error.status) {
				const singleMetric = this.metrics.singleMetric();
				singleMetric.addDimension("status_code", error.status.toString());
				singleMetric.addMetric("YotiService_session_creation_response", MetricUnits.Count, 1);
			}

    		const xRequestId = error.response ? error.response.headers["x-request-id"] : undefined;
    		this.logger.error({ message: "An error occurred when creating Yoti session", yotiErrorMessage: error.message, yotiErrorCode: error.code, messageCode: MessageCodes.FAILED_CREATING_YOTI_SESSION, xRequestId });
    		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error creating Yoti Session");
    	}
	}

	async fetchSessionInfo(sessionId: string): Promise<YotiSessionInfo | undefined> {
    	const yotiRequest = this.generateYotiRequest({
    		method: HttpVerbsEnum.GET,
    		endpoint: `/sessions/${sessionId}/configuration`,
    	});
		
    	try {
    		const response = await axios.get(yotiRequest.url, yotiRequest.config);
			const { data } = response;

			const singleMetric = this.metrics.singleMetric();
			singleMetric.addDimension("status_code", response.status.toString());
			singleMetric.addMetric("YotiService_fetch_session_response", MetricUnits.Count, 1);
    		return data;
    	} catch (error: any) {
			if (error.status) {
				const singleMetric = this.metrics.singleMetric();
				singleMetric.addDimension("status_code", error.status.toString());
				singleMetric.addMetric("YotiService_fetch_session_response", MetricUnits.Count, 1);
			}

    		const xRequestId = error.response ? error.response.headers["x-request-id"] : undefined;
    		this.logger.error({ message: "Error fetching Yoti session", yotiErrorMessage: error.message, yotiErrorCode: error.code, xRequestId });
    		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching Yoti Session");
    	}
	}

	async generateInstructions(
    	sessionID: string,
    	personDetails: PersonIdentityItem,
    	requirements: Array<{ requirement_id: string; document: { type: string; country_code: string; document_type: string } } | undefined>,
    	PostOfficeSelection: PostOfficeInfo,
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
    		endpoint: `/sessions/${sessionID}/instructions`,
    		payloadJSON: JSON.stringify(payloadJSON),
    	});

    	try {
    		const response = await axios.put(
    			yotiRequest.url,
    			payloadJSON,
    			yotiRequest.config,
    		);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars
			const { data } = response;

			const singleMetric = this.metrics.singleMetric();
			singleMetric.addDimension("status_code", response.status.toString());
			singleMetric.addMetric("YotiService_generate_instructions_response", MetricUnits.Count, 1);
    		return HttpCodesEnum.OK;
    	} catch (error: any) {
			if (error.status) {
				const singleMetric = this.metrics.singleMetric();
				singleMetric.addDimension("status_code", error.status.toString());
				singleMetric.addMetric("YotiService_generate_instructions_response", MetricUnits.Count, 1);
			}

    		const xRequestId = error.response ? error.response.headers["x-request-id"] : undefined;
    		this.logger.error({ message: "An error occurred when generating Yoti instructions PDF", yotiErrorMessage: error.message, yotiErrorCode: error.code, xRequestId });
    		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error generating Yoti instructions PDF");
    	}
	}

	async fetchInstructionsPdf(sessionId: string): Promise<string | undefined> {
    	const yotiRequest = this.generateYotiRequest({
    		method: HttpVerbsEnum.GET,
    		endpoint: `/sessions/${sessionId}/instructions/pdf`,
    		configResponseType: "arraybuffer",
    		configResponseEncoding: "binary",
    	});

    	if (yotiRequest && yotiRequest.config && yotiRequest.url) {
    		try {
    			const yotiRequestConfig =  yotiRequest.config;
    			this.logger.debug("getPdf - Yoti", { yotiRequestConfig });
    			const response = await axios.get(yotiRequest.url, yotiRequest.config);
				const { data } = response;

				const singleMetric = this.metrics.singleMetric();
				singleMetric.addDimension("status_code", response.status.toString());
				singleMetric.addMetric("YotiService_fetch_instructions_response", MetricUnits.Count, 1);
				return data;

    		} catch (error: any) {
				if (error.status) {
					const singleMetric = this.metrics.singleMetric();
					singleMetric.addDimension("status_code", error.status.toString());
					singleMetric.addMetric("YotiService_fetch_instructions_response", MetricUnits.Count, 1);
				}

    			const xRequestId = error.response ? error.response.headers["x-request-id"] : undefined;
    			this.logger.error({ message: "An error occurred when fetching Yoti instructions PDF", yotiErrorMessage: error.message, yotiErrorCode: error.code, messageCode: MessageCodes.FAILED_YOTI_GET_INSTRUCTIONS, xRequestId });
    			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching Yoti instructions PDF");
    		}
    	} else {
    		// eslint-disable-next-line max-lines
    		this.logger.error({ message: "Missing Yoti request config ", yotiRequest });
    	}
	}

	async getCompletedSessionInfo(sessionId: string, backoffPeriodMs: number, maxRetries: number): Promise<YotiCompletedSession | undefined> {
    	const yotiRequest = this.generateYotiRequest({
    		method: HttpVerbsEnum.GET,
    		endpoint: `/sessions/${sessionId}`,
    	});

    	let retryCount = 0;
    	while (retryCount <= maxRetries) {
    		this.logger.info({
    			message: "getCompletedSessionInfo - trying to fetch Yoti session", 
    			// eslint-disable-next-line max-lines
    			yotiSessionId: sessionId,
    			retryCount,
    		});
			
    		try {
    			const response = await axios.get(yotiRequest.url, yotiRequest.config);

				const { data } = response;

				const singleMetric = this.metrics.singleMetric();
				singleMetric.addDimension("status_code", response.status.toString());
				singleMetric.addMetric("YotiService_get_completed_session_response", MetricUnits.Count, 1);
    			return data;
    		} catch (error: any) {
				if (error.status) {
					const singleMetric = this.metrics.singleMetric();
					singleMetric.addDimension("status_code", error.status.toString());
					singleMetric.addMetric("YotiService_get_completed_session_response", MetricUnits.Count, 1);
				}
				
    			const xRequestId = error.response ? error.response.headers["x-request-id"] : undefined;
				
    			if (((error.response?.status >= 500 && error.response?.status < 600) || error.response?.status === 429) && retryCount < maxRetries) {
    				this.logger.warn({ message: `getCompletedSessionInfo - Retrying to fetch Yoti session. Sleeping for ${backoffPeriodMs} ms`, retryCount, yotiErrorMessage: error.message, yotiErrorCode: error.code, yotiErrorStatus: error.response?.status, messageCode: MessageCodes.FAILED_YOTI_GET_SESSION, xRequestId });
    				await sleep(backoffPeriodMs);
    				retryCount++;
    			} else {
					if (retryCount === maxRetries) {
						this.logger.error({ message: `getCompletedSessionInfo - cannot fetch Yoti session even after ${maxRetries} retries.`, messageCode: MessageCodes.YOTI_RETRIES_EXCEEDED, xRequestId });
    					throw new AppError(HttpCodesEnum.SERVER_ERROR, `Cannot fetch Yoti session even after ${maxRetries} retries.`);
					}
					const message = "An error occurred when fetching Yoti session";
					this.logger.error({ message, yotiErrorMessage: error.message, yotiErrorCode: error.code, messageCode: MessageCodes.FAILED_YOTI_GET_SESSION, xRequestId });
    				throw new AppError(HttpCodesEnum.SERVER_ERROR, message);
    			}
    		}
    	}
	}

	async getMediaContent(sessionId: string, mediaId: string): Promise<any | undefined> {
    	const yotiRequest = this.generateYotiRequest({
    		method: HttpVerbsEnum.GET,
    		endpoint: `/sessions/${sessionId}/media/${mediaId}/content`,
    	});

    	try {
    		const response = await axios.get(yotiRequest.url, yotiRequest.config);
			const { data } = response;

    		return data;
    	} catch (error: any) {
    		const xRequestId = error.response ? error.response.headers["x-request-id"] : undefined;
    		this.logger.error({ message: "An error occurred when fetching Yoti media content", yotiErrorMessage: error.message, yotiErrorCode: error.code, messageCode: MessageCodes.FAILED_YOTI_GET_MEDIA_CONTENT, xRequestId });
    		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching Yoti media content");
    	}
	}
}
