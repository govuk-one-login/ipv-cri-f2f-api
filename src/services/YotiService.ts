/* eslint-disable no-console */
import { Logger } from "@aws-lambda-powertools/logger";
import crypto from "crypto";

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

	private base64DecodeToString(value: string) {
    return Buffer.from(value, "base64").toString("utf8");
  }

	private getRSASignatureForMessage(message: string) {
		const PEM_KEY = this.base64DecodeToString("LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBc1VOSmJYZkdtL2VWWm9HWG9jVFZsVGxNL2pDcFpqOFI2cU9PeGR0MitUM1hIN21GCkdyZHFBdWFHS1MvbHB3WDh2Z1FMOUVELzRHTTNKU1RKVmNPT2YveHFWSEVqcWp6VWlGM1JPSG9jeTVPZURFUEYKSGFTdVNvUi9EeFhQOE0ybHg4MHRKNmcwOW5MeHB2TmFIVVpBQ3A4TWsvekEwRE1BUkFUUWQ5ZzdvMUlSR1lYTgpwS0pPY3JVZkxZdHBJOW0ycFJWMGZOKzdjcGQzZUd2SFFSR29qNHF5V2s3TkM4UUlkazR0ekc5Y2VpT0huTTZSCnZpOHhvWDlxbGdNSkZZU1E5YWJLeWJwUk1odXBENkpDVmRXOWwxZUJJajN2TExybG4zejdmU2YwYndmYmswYksKOFFwMlhLeFJBd2FOaHNRb3RHRG1HNVp1Q0RHclZnQm1Ic0ZBOHdJREFRQUJBb0lCQUM0TWZjbTdRTlFKbUQwZAowMGRKKy9ZZEFaeFRCZDZ5NmJPYnM1NUFxZ0tMaHhRTnZMODVBSWdxWEpYY2hIdEVPZWtlNGdBYzFwdnpDa05TCjhCNmdnNmRKNmxGdlpzVjFzZnlPNnFnU1NPSzF3V3dNT3V1OWVTMlFoL1ZpUkRlWkpNVG56eUFyT1Q4QWt6ZzgKcFo5UFBabkV3WjY4SFZhNHVRdnllRGw1NmR3K0tUbldqb3V4WUQ0NHdCNERyZk9OZTRCZVFrMHNIVEw4Z3Y0awpHSk1HOEFDU0E4R0xKYkdoMXJ5Z3FQNlJDbVB2NFV3VGovRTZoRVJ0czgrTGRrSEhMb0poR2t0aWZSZnkwWDluCkNnSUJyK2RpNWUrUVQvQ0lGaTRPcVhOMFNLVzlPeFdKcmw4SjZBcEg4cGFjQmtzSGVmSVRJYnhUaGsrMm4vOEgKS1hwVmNxa0NnWUVBN0srOW5ZMXV3Q3Jxay8yZno3NVdhS2lLTVlsV2hTeEM4aVlZOEpUWXoyN3NxYVhSRGszcQpEOEZXTTI0VVhzRlFJSDVtcmtCWGdxc04wdDE3a3JyUHcvMkkrcGsreWpjOU42d28rTGo4M3pUOS81QWZHblpNCnFBQnRrZDIrTGVjMGNzcDNpK2t1bE5lVFdRbGhnNUhYMnV0akt6Q3ZQWEM2TDFhbmJ6bVExdTBDZ1lFQXY3bzMKZENoMjkyRElSSitaM0ROK2lZVGlyTVh3UE90Z29DclYrbDQ0RFA4Vno4Q3NJVGhvWFJYQkJrWTB1U3VCdUVtZgptWEJjMnl2aWVEcndQYmp6STNlTEd0NlExNVhPK24xdkliQ0ZEaTlOaitpckFyWlhDeHhnNTJjdURGU2tod3F3ClhMZW1INTVqcy94ZlJTQVkwQm1hRGYwUVFyRTV2M3pJQ0hOZ20xOENnWUVBbmhxZTdSbkcrM012azMvK093V0kKTHcwMmt2U002UlN4KzVOYllZbnNjbFJFbnVaM0Nia2VPendJMnY0VGVXQmtwL0FIb3lxenlrTjlUbmhJemJFZwpqR2xXRVNCQkEwOTNBek5yZ3duL1VSTFRBTjVEQ0tneGVLQWdrU213bW5VeFllVEJpcUpQVFhuYm9jUlVjVkVCCkFlbnZLckN3dnJnSWh3cTVlZURZVWRrQ2dZRUFnSGo4cmJacnVXbzk2RlgyR0tyYzBMT2QzTjRxRS9nNVlEb3oKOWpmcVlUTVEzNHloQ3dXc1VTdkJrejI2R0phQnJ3YU9qcGZQY1FIZ0dHYU9FeDM2dHJwbEdSVW9nMzJjR3hldwpQeWYwa01PN3VvSFREZGMzVG5ldXE0RGxSMWYwZzVUekJyMzg4RlVIUkZVSlZkMmpJdGIwOXdpck83VmNGK2M2CmR3Y3hKZ3NDZ1lCSEpGMGNNbEx6S3dMQTN6NnVsREplU2k5YmNXV2VFZkhPekp2MzFVRWNWUFB5OWtjMTJxZzAKZFZpM0dUenpyOWJxMXpQR0w0S2ErNjZTcHFZTFc0TWd2aytsQ2IwTjJvaG9kVHJsdFczMFYrdXFjZHdKOCtObAp6Y1ZNSVVodmR2d291UEFlT0I5cXBLeGlwRHdqVWNhd0RDb3hXUzVPWVdUQmxjNkJIeHFUZ3c9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQ==");
    // const sign = crypto.createSign("RSA-SHA256");
    // sign.update(message);
    // const signedKey = sign.sign(PEM_KEY).toString("base64");
		return crypto
		.createSign('RSA-SHA256')
		.update(message)
		.sign(PEM_KEY)
		.toString('base64');
}

  

  async createSession() {
    const fullName = "John Doe";
    const dateOfBirth = "1988-11-02";
    const namePrefix = "Mr";

		const SDK_ID = '1f9edc97-c60c-40d7-becb-c1c6a2ec4963';

		const nonce = crypto.randomUUID();
    const unixTimestamp = Date.now();
    const queryEndpoint = `sdkId=${SDK_ID}&nonce=${nonce}&timestamp=${unixTimestamp}`;
    let payloadBase64;
    let messageToSign;

		const payloadJSON = {
			session_deadline: "2023-05-05T23:59:59Z",
			resources_ttl: "15780000",
			ibv_options: {
				support: "MANDATORY",
			},
			user_tracking_id: "some_id",
			notifications: {
				endpoint: "https://some-domain.example",
				topics: ["SESSION_COMPLETION", "INSTRUCTIONS_EMAIL_REQUESTED"],
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
					full_name: fullName,
					date_of_birth: dateOfBirth,
					name_prefix: namePrefix,
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
		}

    // Build message to sign
    if (payloadJSON) {
        payloadBase64 = Buffer.from(JSON.stringify(payloadJSON)).toString(
            "base64"
        );
    }

		const httpMethod = 'POST';
		const APIpath = 'https://api.yoti.com/idverify/v1/sessions'


    messageToSign = `${httpMethod}&${APIpath}?${queryEndpoint}`;
    messageToSign += !payloadBase64 ? "" : `&${payloadBase64}`;

		const messageSignature = this.getRSASignatureForMessage(messageToSign);

		const req = {
			signature: messageSignature,
			params: {
					timestamp: unixTimestamp,
					sdkId: SDK_ID,
					nonce,
			},
		};

		console.log('req', req);

    return {
			signature: messageSignature,
			params: {
					timestamp: unixTimestamp,
					sdkId: SDK_ID,
					nonce,
			},
		};
  }
}
