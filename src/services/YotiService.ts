/* eslint-disable no-console */
import { Logger } from "@aws-lambda-powertools/logger";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import axios, { AxiosRequestConfig } from "axios";
import { HttpVerbsEnum } from "../utils/HttpVerbsEnum";
import { PersonIdentity } from "../models/PersonIdentity";
import { StructuredPostalAddress, ApplicantProfile, PostOfficeInfo, SessionInfo } from "../models/yotiPayloads";

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
  private getStructuredPostalAddress(personDetails: PersonIdentity): StructuredPostalAddress {
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
        this.getStructuredPostalAddress(personDetails),
  	};
  }

  private getYotiDocumentType(selectedDocument: string): {
  	yotiDocumentType: string;
  	countryCode: string;
  } {
  	let yotiDocumentType = "";
  	let countryCode = "";

  	switch (selectedDocument) {
  		case "ukPassport": {
  			yotiDocumentType = "PASSPORT";
  			countryCode = "GBR";
  			break;
  		}
  		case "ukPhotocardDl": {
  			yotiDocumentType = "DRIVING_LICENCE";
  			countryCode = "GBR";
  			break;
  		}
  		case "brp": {
  			yotiDocumentType = "RESIDENCE_PERMIT";
  			countryCode = "GBR";
  			break;
  		}
  		case "otherPassport": {
  			yotiDocumentType = "PASSPORT";
  			countryCode = "";
  			break;
  		}
  		case "euPhotocardDl": {
  			yotiDocumentType = "";
  			countryCode = "";
  			break;
  		}
  		case "euIdentityCard": {
  			yotiDocumentType = "NATIONAL_ID";
  			countryCode = "";
  			break;
  		}
  		case "citizenCard": {
  			yotiDocumentType = "";
  			countryCode = "";
  			break;
  		}
  		case "youngScotNationalEntitlementCard": {
  			yotiDocumentType = "";
  			countryCode = "";
  			break;
  		}
  		default: {
  			break;
  		}
  	}

  	return {
  		yotiDocumentType,
  		countryCode,
  	};
  }

  private generateYotiRequest(generateYotiPayload: {
  	method: any;
  	payloadJSON?: string;
  	endpoint: any;
  }): { url: string; config: AxiosRequestConfig<any> | undefined } {
  	const { method, endpoint } = generateYotiPayload;

  	const nonce = uuidv4();
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
  ): Promise<string> {
  	//TODO: When we have return journey in place
  	const callBackUrlWhenChecksComplete = "https://some-domain.example";

  	const { yotiDocumentType, countryCode } = this.getYotiDocumentType(selectedDocument);

  	const payloadJSON = {
  		client_session_token_ttl: "864000",
  		resources_ttl: "950400",
  		ibv_options: {
  			support: "MANDATORY",
  		},
  		user_tracking_id: personDetails.sessionId,
  		notifications: {
  			endpoint: callBackUrlWhenChecksComplete,
  			topics: ["SESSION_COMPLETION", "INSTRUCTIONS_EMAIL_REQUESTED"],
  			auth_token: "string",
  			auth_type: "BASIC",
  		},
  		requested_checks: [
  			{
  				"type": "IBV_VISUAL_REVIEW_CHECK",
  				"config": {
  					"manual_check": "IBV",
  				},
  			},
  			{
  				"type": "PROFILE_DOCUMENT_MATCH",
  				"config": {
  					"manual_check": "IBV",
  				},
  			},
  			{
  				"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
  				"config": {
  					"manual_check": "IBV",
  					"scheme": "UK_DBS",
  				},
  			},
    	],
  		required_documents: [
  			{
  				type: "ID_DOCUMENT",
  				filter: {
  					type: "DOCUMENT_RESTRICTIONS",
  					inclusion: "WHITELIST",
  					documents: [
  						{
  							country_codes: [countryCode],
  							document_types: [yotiDocumentType],
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
  			email: "john.doe@gmail.com",
  		},
  		documents: requirements,
  		branch: {
  			type: "UK_POST_OFFICE",
  			name: "UK Post Office Branch",
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

  	const { data } = await axios.get(yotiRequest.url, yotiRequest.config);

  	return data;
  }
}
