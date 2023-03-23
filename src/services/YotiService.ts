/* eslint-disable no-console */
import { Logger } from "@aws-lambda-powertools/logger";
import crypto from "crypto";
import * as jose from "node-jose";
import {v4 as uuidv4} from 'uuid';
import axios, { AxiosRequestConfig } from 'axios';


export class YotiService {
  readonly logger: Logger;

  private static instance: YotiService;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  static getInstance(logger: Logger): YotiService {
    if (!YotiService.instance) {
      YotiService.instance = new YotiService(logger);
    }
    return YotiService.instance;
  }

	private getRSASignatureForMessage(message: string, PEM_KEY: string) {	
		const sign = crypto.createSign("RSA-SHA256");
		sign.update(message);
		return sign.sign(PEM_KEY).toString("base64");
	}

	public async makeRequest2(CLIENT_SDK_ID: string, PEM_KEY: string) {
		const nonce = uuidv4();
		const unixTimestamp = Date.now();

		const queryString = `sdkId=${CLIENT_SDK_ID}&nonce=${nonce}&timestamp=${unixTimestamp}`;

		const endpointPath = `/sessions?${queryString}`

		const payloadJSON = {
			"session_deadline":"2023-05-05T23:59:59Z",
			"resources_ttl":"15780000",
			"ibv_options":{
				 "support":"MANDATORY"
			},
			"user_tracking_id":"some_id",
			"notifications":{
				 "endpoint":"https://some-domain.example",
				 "topics":[
						"SESSION_COMPLETION"
				 ],
				 "auth_token":"string",
				 "auth_type":"BASIC"
			},
			"requested_checks":[
				 {
						"type":"IBV_VISUAL_REVIEW_CHECK",
						"config":{
							 "manual_check":"IBV"
						}
				 },
				 {
						"type":"PROFILE_DOCUMENT_MATCH",
						"config":{
							 "manual_check":"IBV"
						}
				 },
				 {
						"type":"DOCUMENT_SCHEME_VALIDITY_CHECK",
						"config":{
							 "manual_check":"IBV",
							 "scheme":"UK_DBS"
						}
				 },
				 {
						"type":"ID_DOCUMENT_AUTHENTICITY",
						"config":{
							 "manual_check":"FALLBACK"
						}
				 },
				 {
						"type":"ID_DOCUMENT_FACE_MATCH",
						"config":{
							 "manual_check":"FALLBACK"
						}
				 }
			],
			"requested_tasks":[
				 {
						"type":"ID_DOCUMENT_TEXT_DATA_EXTRACTION",
						"config":{
							 "manual_check":"FALLBACK"
						}
				 }
			],
			"required_documents":[
				 {
						"type":"ID_DOCUMENT",
						"filter":{
							 "type":"DOCUMENT_RESTRICTIONS",
							 "inclusion":"WHITELIST",
							 "documents":[
									{
										 "country_codes":[
												"GBR"
										 ],
										 "document_types":[
												"PASSPORT"
										 ]
									}
							 ]
						}
				 }
			],
			"resources":{
				 "applicant_profile":{
						"full_name":"John Doe",
						"date_of_birth":"1988-11-02",
						"name_prefix":"Mr",
						"structured_postal_address":{
							 "address_format":1,
							 "building_number":"74",
							 "address_line1":"AddressLine1",
							 "town_city":"CityName",
							 "postal_code":"E143RN",
							 "country_iso":"GBR",
							 "country":"United Kingdom"
						}
				 }
			}
	 }
		const base64String = Buffer.from(JSON.stringify(payloadJSON)).toString('base64');

		// Get message signature.
		const messageSignature = this.getRSASignatureForMessage(
			`POST&${endpointPath}&${base64String}`,
			PEM_KEY
		);

		const config: AxiosRequestConfig = {
			headers: {
				'X-Yoti-Auth-Digest': messageSignature,
				'X-Yoti-SDK': 'Node',
				'X-Yoti-SDK-Version': 'Node-4.1.0',
				Accept: 'application/json',
			},
		};

		const { data, status } = await axios.post(`https://api.yoti.com/idverify/v1${endpointPath}`, payloadJSON, config)

		return data.session_id;
	}


}
