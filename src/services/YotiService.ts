/* eslint-disable no-console */
import { Logger } from "@aws-lambda-powertools/logger";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import axios, { AxiosRequestConfig } from "axios";
import { HttpVerbsEnum } from "../utils/HttpVerbsEnum";
import { ISessionItem } from "../models/ISessionItem";
import { StructuredPostalAddress, ApplicantProfile, PostOfficeInfo } from "../models/yotiPayloads";

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
    PEM_KEY: string
  ): YotiService {
    if (!YotiService.instance) {
      YotiService.instance = new YotiService(logger, CLIENT_SDK_ID, PEM_KEY);
    }
    return YotiService.instance;
  }

  private getRSASignatureForMessage(message: string) {
    return crypto
      .createSign("RSA-SHA256")
      .update(message)
      .sign(this.PEM_KEY)
      .toString("base64");
  }

  private getStructuredPostalAddress(
    postOfficeInfo: PostOfficeInfo
  ): StructuredPostalAddress {
    return {
			address_format: 1,
			building_number: "74",
      address_line1: `${postOfficeInfo.address}`,
      town_city: "CityName",
      postal_code: `${postOfficeInfo.post_code}`,
      country_iso: "GBR",
      country: "United Kingdom",
    };
  }

  private getApplicantProfile(
    f2fSession: ISessionItem,
    postOfficeInfo: PostOfficeInfo
  ): ApplicantProfile {
    return {
      full_name: `${f2fSession.given_names} ${f2fSession.family_names}`,
      date_of_birth: `${f2fSession.date_of_birth}`,
      structured_postal_address:
        this.getStructuredPostalAddress(postOfficeInfo),
    };
  }

  private getYotiDocumentType(selectedDocument: string) {
    let yotiDocumentType;
    let countryCode;

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
        //statements;
        break;
      }
    }

    return {
      yotiDocumentType,
			countryCode
    };
  }

  public async generateYotiRequest(generateYotiPayload: {
    method: any;
    payloadJSON?: string;
    endpoint: any;
  }) {
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
        "base64"
      )}`;
    }

    const messageSignature = this.getRSASignatureForMessage(
      `${method}&${endpointPath}${base64String}`
    );

    const config: AxiosRequestConfig = {
      headers: {
        "X-Yoti-Auth-Digest": messageSignature,
        "X-Yoti-SDK": "Node",
        "X-Yoti-SDK-Version": "Node-4.1.0",
        Accept: "application/json",
      },
    };

    const response = {
      url: `${process.env.YOTIBASEURL}${endpointPath}`,
      config,
    };

    return response;
  }

  public async createSession(
    f2fSession: ISessionItem,
    postOfficeInfo: PostOfficeInfo
  ) {
    const callBackUrlWhenChecksComplete = "https://some-domain.example";

		const { yotiDocumentType, countryCode } = this.getYotiDocumentType(f2fSession.document_selected);

    const payloadJSON = {
      client_session_token_ttl: "864000",
      resources_ttl: "950400",
      ibv_options: {
        support: "MANDATORY",
      },
      user_tracking_id: f2fSession.sessionId,
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
                "manual_check": "IBV"
            }
        },
        {
            "type": "PROFILE_DOCUMENT_MATCH",
            "config": {
                "manual_check": "IBV"
            }
        },
        {
            "type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
            "config": {
                "manual_check": "IBV",
                "scheme": "UK_DBS"
            }
        }
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
          f2fSession,
          postOfficeInfo
        ),
      },
    };

		console.log('payloadJSON', JSON.stringify(payloadJSON));

    const yotiRequest = await this.generateYotiRequest({
      method: HttpVerbsEnum.POST,
      payloadJSON: JSON.stringify(payloadJSON),
      endpoint: "/sessions",
    });

    const { data } = await axios.post(
      yotiRequest.url,
      payloadJSON,
      yotiRequest.config
    );

    return data.session_id;
  }

  public async fetchSessionInfo(sessionId: string) {
    const yotiRequest = await this.generateYotiRequest({
      method: HttpVerbsEnum.GET,
      endpoint: `/sessions/${sessionId}/configuration`,
    });

    const { data } = await axios.get(yotiRequest.url, yotiRequest.config);

    return data;
  }

  public async generateInstructions(
		sessionID: string,
    f2fSession: ISessionItem,
    requirements: [],
    PostOfficeSelection: PostOfficeInfo
  ) {
    const payloadJSON = {
      contact_profile: {
        first_name: `${f2fSession.given_names[0]}`,
        last_name: `${f2fSession.family_names}`,
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

    const yotiRequest = await this.generateYotiRequest({
      method: HttpVerbsEnum.PUT,
      endpoint: `/sessions/${sessionID}/instructions`,
      payloadJSON: JSON.stringify(payloadJSON),
    });

    const { data } = await axios.put(
      yotiRequest.url,
      payloadJSON,
      yotiRequest.config
    );

    return data;
  }

  public async fetchInstructionsPdf(sessionId: string) {
    const yotiRequest = await this.generateYotiRequest({
      method: HttpVerbsEnum.GET,
      endpoint: `/sessions/${sessionId}/instructions/pdf`,
    });

    const { data } = await axios.get(yotiRequest.url, yotiRequest.config);

    return data;
  }
}
