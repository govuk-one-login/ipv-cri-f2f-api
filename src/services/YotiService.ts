/* eslint-disable no-console */
import { Logger } from "@aws-lambda-powertools/logger";
import crypto, { randomUUID } from "crypto";
import axios, { AxiosRequestConfig } from "axios";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { HttpVerbsEnum } from "../utils/HttpVerbsEnum";
import { PersonIdentityItem } from "../models/PersonIdentityItem";
import { ApplicantProfile, PostOfficeInfo, YotiSessionInfo, CreateSessionPayload, YotiCompletedSession } from "../models/YotiPayloads";
import { YotiDocumentTypesEnum, YOTI_DOCUMENT_COUNTRY_CODE, YOTI_REQUESTED_CHECKS, YOTI_REQUESTED_TASKS, YOTI_SESSION_TOPICS, UK_POST_OFFICE } from "../utils/YotiPayloadEnums";
import { personIdentityUtils } from "../utils/PersonIdentityUtils";

export class YotiService {
	readonly logger: Logger;

	private static instance: YotiService;

	readonly CLIENT_SDK_ID: string;

	readonly PEM_KEY: string;

	readonly CLIENT_SESSION_TOKEN_TTL_SECS: string;

	readonly RESOURCES_TTL_SECS:string;

	readonly YOTI_BASE_URL: string;

	constructor(logger: Logger, CLIENT_SDK_ID: string, RESOURCES_TTL_SECS: string, CLIENT_SESSION_TOKEN_TTL_SECS: string, PEM_KEY: string, YOTI_BASE_URL: string) {
		this.RESOURCES_TTL_SECS = RESOURCES_TTL_SECS;
		this.CLIENT_SESSION_TOKEN_TTL_SECS = CLIENT_SESSION_TOKEN_TTL_SECS;
		this.logger = logger;
		this.CLIENT_SDK_ID = CLIENT_SDK_ID;
		this.PEM_KEY = PEM_KEY;
		this.YOTI_BASE_URL = YOTI_BASE_URL;
	}

	static getInstance(
		logger: Logger,
		CLIENT_SDK_ID: string,
		RESOURCES_TTL_SECS: string,
		CLIENT_SESSION_TOKEN_TTL_SECS: string,
		PEM_KEY: string,
		YOTI_BASE_URL: string,
	): YotiService {
		if (!YotiService.instance) {
			YotiService.instance = new YotiService(logger, CLIENT_SDK_ID, RESOURCES_TTL_SECS, CLIENT_SESSION_TOKEN_TTL_SECS, PEM_KEY, YOTI_BASE_URL);
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

		return {
			full_name: `${nameParts.givenNames[0]} ${nameParts.familyNames[0]}`,
			date_of_birth: `${personDetails.birthDate.map((bd) => ({ value: bd.value }))[0].value}`,
			structured_postal_address: personIdentityUtils.getYotiStructuredPostalAddress(personDetails),
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

		const messageSignature = this.getRSASignatureForMessage(
			`${method}&${endpointPath}${base64String}`,
		);

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
		YOTICALLBACKURL?: string,
	): Promise<string | undefined> {
		//TODO: YOTICALLBACKURL needs updating in template.yaml file within deploy folders oncer we have work completed on return journey
		this.logger.info("SELECTED DOCUMENT - YotiService START", selectedDocument)
		this.logger.info("COUNTRY CODE - YotiService START", countryCode)
		const payloadJSON: CreateSessionPayload = {
			client_session_token_ttl: this.CLIENT_SESSION_TOKEN_TTL_SECS ? this.CLIENT_SESSION_TOKEN_TTL_SECS : "950400",
			resources_ttl: this.RESOURCES_TTL_SECS ? this.RESOURCES_TTL_SECS : "1036800",
			ibv_options: {
				support: "MANDATORY",
			},
			user_tracking_id: personDetails.sessionId,
			notifications: {
				endpoint: YOTICALLBACKURL ? YOTICALLBACKURL : "",
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

		this.logger.info("REQUIRED DOCS", {"required docs": payloadJSON.required_documents})

		const yotiRequest = this.generateYotiRequest({
			method: HttpVerbsEnum.POST,
			payloadJSON: JSON.stringify(payloadJSON),
			endpoint: "/sessions",
		});

		try {
			this.logger.info("Yoti request url and config",{"yotiUrl":yotiRequest.url,"yotiConfig":yotiRequest.config});
			const { data } = await axios.post(
				yotiRequest.url,
				payloadJSON,
				yotiRequest.config,
			);

			this.logger.info("Received response for create /sessions",{"data":data})
			return data.session_id;
		} catch (err) {
			this.logger.error({ message: "An error occurred when creating Yoti session ", err });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error retrieving Yoti Session");
		}
	}

	async fetchSessionInfo(sessionId: string): Promise<YotiSessionInfo | undefined> {
		const yotiRequest = this.generateYotiRequest({
			method: HttpVerbsEnum.GET,
			endpoint: `/sessions/${sessionId}/configuration`,
		});

		try {
			const { data } = await axios.get(yotiRequest.url, yotiRequest.config);

			return data;
		} catch (err) {
			this.logger.error({ message: "An error occurred when fetching Yoti session ", err });
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

		const payloadJSON = {
			contact_profile: {
				first_name: `${nameParts.givenNames[0]}`,
  			last_name: `${nameParts.familyNames[0]}`,
  			email: personIdentityUtils.getEmailAddress(personDetails),
			},
			documents: requirements,
			branch: {
				type: UK_POST_OFFICE.type,
				name: UK_POST_OFFICE.name,
				address: PostOfficeSelection.address,
				post_code: PostOfficeSelection.post_code,
				location: {
					latitude: PostOfficeSelection.location.latitude,
					longitude: PostOfficeSelection.location.longitude,
				},
			},
		};

		const yotiRequest = this.generateYotiRequest({
			method: HttpVerbsEnum.PUT,
			endpoint: `/sessions/${sessionID}/instructions`,
			payloadJSON: JSON.stringify(payloadJSON),
		});

		try {
			await axios.put(
				yotiRequest.url,
				payloadJSON,
				yotiRequest.config,
			);

			return HttpCodesEnum.OK;
		} catch (err) {
			this.logger.error({ message: "An error occurred when generationg Yoti instructions PDF ", err });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error generationg Yoti instructions PDF");
		}
	}

	async fetchInstructionsPdf(sessionId: string): Promise<string | undefined> {
		const yotiRequest = this.generateYotiRequest({
			method: HttpVerbsEnum.GET,
			endpoint: `/sessions/${sessionId}/instructions/pdf`,
			configResponseType: "arraybuffer",
			configResponseEncoding: "binary",
		});
		const yotiRequestConfig =  yotiRequest.config!;

		const url = yotiRequest.url;

		try {
			this.logger.debug("getPdf - Yoti", { url, yotiRequestConfig });
			return (await axios.get(yotiRequest.url, yotiRequest.config)).data;

		} catch (err) {
			this.logger.error({ message: "An error occurred when fetching Yoti instructions PDF ", err });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching Yoti instructions PDF");
		}
	}

	async getCompletedSessionInfo(sessionId: string): Promise<YotiCompletedSession | undefined> {
		const yotiRequest = this.generateYotiRequest({
			method: HttpVerbsEnum.GET,
			endpoint: `/sessions/${sessionId}`,
		});

		try {
			const { data } = await axios.get(yotiRequest.url, yotiRequest.config);

			return data;
		} catch (err) {
			this.logger.error({ message: "An error occurred when fetching Yoti session ", err });
			throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching Yoti Session");
		}
	}
}
