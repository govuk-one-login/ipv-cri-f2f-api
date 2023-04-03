/* eslint-disable no-console */
import { Logger } from "@aws-lambda-powertools/logger";
import crypto, { randomUUID }from "crypto";
import axios, { AxiosRequestConfig } from "axios";
import { HttpVerbsEnum } from "../utils/HttpVerbsEnum";
import { PersonIdentity } from "../models/PersonIdentity";
import { StructuredPostalAddress, ApplicantProfile, PostOfficeInfo } from "../models/YotiPayloads";
import { YotiDocumentTypesEnum, YOTI_DOCUMENT_COUNTRY_CODE, REQUESTED_CHECKS, YOTI_SESSION_TOPICS, UK_POST_OFFICE } from "../utils/YotiPayloadEnums";

export class YotiService {
  readonly logger: Logger;

  private static instance: YotiService;

  readonly CLIENT_SDK_ID: string;

  readonly PEM_KEY: string;

  constructor(logger: Logger, CLIENT_SDK_ID: string, PEM_KEY: string) {
  	this.logger = logger;
  	this.CLIENT_SDK_ID = CLIENT_SDK_ID;
  	this.PEM_KEY = PEM_KEY;
  }

  static getInstance(
  	logger: Logger,
  	CLIENT_SDK_ID: string,
  	PEM_KEY: string,
  ): YotiService {
  	if (!YotiService.instance) {
  		YotiService.instance = new YotiService(logger, CLIENT_SDK_ID, PEM_KEY);
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


  //TODO: Hardcoded now, will update with values from Person Identity table once /session work completed
  private getStructuredPostalAddress(): StructuredPostalAddress {
  	return {
  		address_format: 1,
  		building_number: "74",
  		address_line1: "AddressLine1",
  		town_city: "CityName",
  		postal_code: "E143RN",
  		country_iso: "GBR",
  		country: "United Kingdom",
  	};
  }

  private getApplicantProfile(
  	personDetails: PersonIdentity,
  ): ApplicantProfile {
  	const givenNames: string[] = [];
  	const familyNames: string[] = [];

  	for (const name of personDetails.names) {
  		const nameParts = name.nameParts;
  		for (const namePart of nameParts) {
  			if (namePart.type === "GivenName") {
  				givenNames.push(namePart.value);
  			}
  			if (namePart.type === "FamilyName") {
  				familyNames.push(namePart.value);
  			}
  		}
  	}

  	return {
  		full_name: `${givenNames[0]} ${familyNames}`,
  		date_of_birth: `${personDetails.birthDates.map((bd) => ({ value: bd.value }))[0].value}`,
  		structured_postal_address:
        this.getStructuredPostalAddress(),
  	};
  }

  private generateYotiRequest(generateYotiPayload: {
  	method: any;
  	payloadJSON?: string;
  	endpoint: any;
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

  	return {
  		url: `${process.env.YOTIBASEURL}${endpointPath}`,
  		config: {
  			headers: {
  				"X-Yoti-Auth-Digest": messageSignature,
  				"X-Yoti-SDK": "Node",
  				"X-Yoti-SDK-Version": "Node-4.1.0",
  				Accept: "application/json",
  			},
  		},
  	};
  }

  async createSession(
  	personDetails: PersonIdentity,
  	selectedDocument: string,
		YOTICALLBACKURL?: string,
  ): Promise<string> {
  	//TODO: YOTICALLBACKURL needs updating in template.yaml file within deploy folders oncer we have work completed on return journey
  	const payloadJSON = {
  		client_session_token_ttl: 864000,
  		resources_ttl: 950400,
  		ibv_options: {
  			support: "MANDATORY",
  		},
  		user_tracking_id: personDetails.sessionId,
  		notifications: {
  			endpoint: YOTICALLBACKURL,
  			topics: YOTI_SESSION_TOPICS,
  			auth_token: "string",
  			auth_type: "BASIC",
  		},
  		requested_checks: [REQUESTED_CHECKS.IBV_VISUAL_REVIEW_CHECK,REQUESTED_CHECKS.PROFILE_DOCUMENT_MATCH,REQUESTED_CHECKS.DOCUMENT_SCHEME_VALIDITY_CHECK],
  		required_documents: [
  			{
  				type: "ID_DOCUMENT",
  				filter: {
  					type: "DOCUMENT_RESTRICTIONS",
  					inclusion: "INCLUDE",
  					documents: [
  						{
  							country_codes: [YOTI_DOCUMENT_COUNTRY_CODE],
  							document_types: [Object.values(YotiDocumentTypesEnum)[Object.keys(YotiDocumentTypesEnum).indexOf(selectedDocument.toUpperCase())]],
  						},
  					],
  				},
  			},
  		],
  		resources: {
  			applicant_profile: this.getApplicantProfile(
  				personDetails,
  			),
  		},
  	};

  	const yotiRequest = this.generateYotiRequest({
  		method: HttpVerbsEnum.POST,
  		payloadJSON: JSON.stringify(payloadJSON),
  		endpoint: "/sessions",
  	});

  	const { data } = await axios.post(
  		yotiRequest.url,
  		payloadJSON,
  		yotiRequest.config,
  	);

  	return data.session_id;
  }

  async fetchSessionInfo(sessionId: string) {
  	const yotiRequest = this.generateYotiRequest({
  		method: HttpVerbsEnum.GET,
  		endpoint: `/sessions/${sessionId}/configuration`,
  	});

  	const { data } = await axios.get(yotiRequest.url, yotiRequest.config);

  	return data;
  }

  async generateInstructions(
  	sessionID: string,
  	personDetails: PersonIdentity,
  	requirements: [],
  	PostOfficeSelection: PostOfficeInfo,
  ) {
  	const givenNames: string[] = [];
  	const familyNames: string[] = [];

  	for (const name of personDetails.names) {
  		const nameParts = name.nameParts;
  		for (const namePart of nameParts) {
  			if (namePart.type === "GivenName") {
  				givenNames.push(namePart.value);
  			}
  			if (namePart.type === "FamilyName") {
  				familyNames.push(namePart.value);
  			}
  		}
  	}

  	const payloadJSON = {
  		contact_profile: {
  			first_name: `${givenNames[0]}`,
  			last_name: `${familyNames[0]}`,
				//TODO: Update email file to be fetched from Person Identity Table once Session work completed
  			email: "test@example.com",
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

  	const { data } = await axios.put(
  		yotiRequest.url,
  		payloadJSON,
  		yotiRequest.config,
  	);

  	return data;
  }

  async fetchInstructionsPdf(sessionId: string): Promise<string> {
  	const yotiRequest = this.generateYotiRequest({
  		method: HttpVerbsEnum.GET,
  		endpoint: `/sessions/${sessionId}/instructions/pdf`,
  	});
	  const yotiRequestConfig =  yotiRequest.config!;
	  yotiRequestConfig["responseType"] = "arraybuffer";
	  yotiRequestConfig["responseEncoding"] = "binary";

	  const url = yotiRequest.url;

	  this.logger.debug("getPdf - Yoti", { url, yotiRequestConfig });
	  const { data } = await axios.get(yotiRequest.url, yotiRequest.config);

  	return data;
  }
}
