/* eslint-disable no-console */
import { Constants } from '../utils/Constants'
import { ApplicantProfile, StructuredPostalAddress, SessionPayload } from '../type/YotiPayloads';
const { Client, RequestBuilder, Payload } = require('yoti');


export class YotiService {
    readonly logger: Logger;

    constructor(yotiClient: Client, logger: Logger, dynamoDbClient: DynamoDBDocument) {
    	this.tableName = tableName;
    	this.dynamo = dynamoDbClient;
    	this.logger = logger;
    }

    static getInstance(tableName: string, logger: Logger, dynamoDbClient: DynamoDBDocument): CicService {
    	if (!CicService.instance) {
    		CicService.instance = new CicService(tableName, logger, dynamoDbClient);
    	}
    	return CicService.instance;
    }

		getStructuredPostalAddress(): StructuredPostalAddress {

			return {
				"address_format": 1,
				"building_number": "74",
				"address_line1": "AddressLine1",
				"town_city": "CityName",
				"postal_code": "E143RN",
				"country_iso": "GBR",
				"country": "United Kingdom",
				"formatted_address": "74\nAddressLine1\nAddressLine2\nAddressLine3\nCityName\nStateName\nE143RN\nGBR"
		}
		}

		getApplicantProfile(): ApplicantProfile {

			return {
				"full_name": "John Doe",
				"date_of_birth": "1988-11-02",
				"name_prefix": "Mr",
				"structured_postal_address": this.getStructuredPostalAddress()
			}
		}

		createSessionPayload(): SessionPayload {
			// const resources_ttl 

			// Session is 10 DynamicsCompressorNode

			const callBackUrlWhenChecksComplete = 'www.test.com';

			return {
				client_session_token_ttl: Constants.YOTI_SESSION_SESSION_DEADLINE,
				resources_ttl: Constants.YOTI_SESSION_SESSION_DEADLINE,
				ibv_options: {
						"support": "MANDATORY"
				},
				user_tracking_id: 'string',
				notifications: {
						endpoint: callBackUrlWhenChecksComplete,
						topics: [ 'SESSION_COMPLETION', 'INSTRUCTIONS_EMAIL_REQUESTED' ]
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
								"type": "ID_DOCUMENT",
								"filter": {
										"type": "DOCUMENT_RESTRICTIONS",
										"inclusion": "WHITELIST",
										"documents": [
												{
														"country_codes": [
																"GBR"
														],
														"document_types": [
																"PASSPORT"
														]
												}
										]
								}
						},
						{
								"type": "ID_DOCUMENT",
								"filter": {
										"type": "DOCUMENT_RESTRICTIONS",
										"inclusion": "WHITELIST",
										"documents": [
												{
														"country_codes": [
																"GBR"
														],
														"document_types": [
																"DRIVING_LICENCE"
														]
												}
										]
								}
						},
						{
								"type": "SUPPLEMENTARY_DOCUMENT",
								"document_types": [
										"UTILITY_BILL"
								],
								"country_codes": [
										"GBR"
								],
								"objective": {
										"type": "UK_DBS"
								}
						}
				],
				resources: {
						applicant_profile: this.getApplicantProfile(),
				}
			}
		}

		private base64DecodeToString(value: string) {
			return Buffer.from(value, 'base64').toString('utf8');
		};

		async createYotiSession(baseUrl: string, pemFilePath: string) { 
			const SESSION_OBJ = this.createSessionPayload();
			const PEM_KEY = this.base64DecodeToString(Constants.YOTI_KEY);

				const request = new RequestBuilder()
				.withBaseUrl(Constants.YOTI_BASE_URL)
				.withPemString(PEM_KEY)
				.withEndpoint(Constants.YOTI_SESSION_ENDPOINT)
				.withPayload(new Payload(SESSION_OBJ))
				.withMethod("POST")
				.withQueryParam("sdkId", Constants.YOTI_SDK_ID)
				.build();
		
				try { 
					const response =  await request.execute();
					const sessionID = response.parsedResponse?.session_id;
					return sessionID;
				} catch (error) {
					
					console.log('ERROR', error);
				}
				

		}

		async getSessionConfig(sessionId: string) { 
			const SESSION_OBJ = this.createSessionPayload();
			const PEM_KEY = this.base64DecodeToString(Constants.YOTI_KEY);

				const request = new RequestBuilder()
				.withBaseUrl(Constants.YOTI_BASE_URL)
				.withPemString(PEM_KEY)
				.withEndpoint(`/sessions/${sessionId}/${Constants.YOTI_SESSION_CONFIG}`)
				.withPayload(new Payload(SESSION_OBJ))
				.withMethod("GET")
				.withQueryParam("sdkId", Constants.YOTI_SDK_ID)
				.build();
		
				try { 
					const response =  await request.execute();
					const sessionID = response.parsedResponse?.session_id;
					return sessionID;
				} catch (error) {
					
					console.log('ERROR', error);
				}
		}

		async getInstructions(sessionId: string) { 
			const SESSION_OBJ = this.createSessionPayload();
			const PEM_KEY = this.base64DecodeToString(Constants.YOTI_KEY);

				const request = new RequestBuilder()
				.withBaseUrl(Constants.YOTI_BASE_URL)
				.withPemString(PEM_KEY)
				.withEndpoint(`/sessions/${sessionId}/${Constants.YOTI_INSTRUCTIONS_ENDPOINT}`)
				.withPayload(new Payload(SESSION_OBJ))
				.withMethod("PUT")
				.withQueryParam("sdkId", Constants.YOTI_SDK_ID)
				.build();
		
				try { 
					const response =  await request.execute();
					const sessionID = response.parsedResponse?.session_id;
					return sessionID;
				} catch (error) {
					
					console.log('ERROR', error);
				}
		}
}
