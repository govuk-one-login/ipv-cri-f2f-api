/* eslint-disable no-console */
import { Logger } from "@aws-lambda-powertools/logger";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import axios, { AxiosRequestConfig } from "axios";
import { HttpVerbsEnum } from "../utils/HttpVerbsEnum";

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
		.createSign('RSA-SHA256')
		.update(message)
		.sign(this.PEM_KEY)
		.toString('base64');
  }

  public async generateYotiRequest(generateYotiPayload: {
    method: any;
    payloadJSON?: string;
    endpoint: any;
  }) {

		// console.log('PEM KEY', this.PEM_KEY);
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

  public async createSession() {
    const payloadJSON = {
      session_deadline: "2023-05-05T23:59:59Z",
      resources_ttl: "15780000",
      ibv_options: {
        support: "MANDATORY",
      },
      user_tracking_id: "some_id",
      notifications: {
        endpoint: "https://some-domain.example",
        topics: ["SESSION_COMPLETION"],
        auth_token: "string",
        auth_type: "BASIC",
      },
      requested_checks: [
        {
          type: "IBV_VISUAL_REVIEW_CHECK",
          config: {
            manual_check: "IBV",
          },
        },
        {
          type: "PROFILE_DOCUMENT_MATCH",
          config: {
            manual_check: "IBV",
          },
        },
        {
          type: "DOCUMENT_SCHEME_VALIDITY_CHECK",
          config: {
            manual_check: "IBV",
            scheme: "UK_DBS",
          },
        },
        {
          type: "ID_DOCUMENT_AUTHENTICITY",
          config: {
            manual_check: "FALLBACK",
          },
        },
        {
          type: "ID_DOCUMENT_FACE_MATCH",
          config: {
            manual_check: "FALLBACK",
          },
        },
      ],
      requested_tasks: [
        {
          type: "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
          config: {
            manual_check: "FALLBACK",
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
                country_codes: ["GBR"],
                document_types: ["PASSPORT"],
              },
            ],
          },
        },
      ],
      resources: {
        applicant_profile: {
          full_name: "John Doe",
          date_of_birth: "1988-11-02",
          name_prefix: "Mr",
          structured_postal_address: {
            address_format: 1,
            building_number: "74",
            address_line1: "AddressLine1",
            town_city: "CityName",
            postal_code: "E143RN",
            country_iso: "GBR",
            country: "United Kingdom",
          },
        },
      },
    };

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

  public async generateInstructions(sessionId: string, requirements: []) {
    const payloadJSON = {
      contact_profile: {
        first_name: "John",
        last_name: "Doe",
        email: "john.doe@gmail.com",
      },
      documents: requirements,
      branch: {
        type: "UK_POST_OFFICE",
        name: "UK Post Office Branch",
        address: "123 Post Office Road, London",
        post_code: "ABC 123",
        location: {
          latitude: 0.34322,
          longitude: -42.48372,
        },
      },
    };

    const yotiRequest = await this.generateYotiRequest({
      method: HttpVerbsEnum.PUT,
      endpoint: `/sessions/${sessionId}/instructions`,
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
