import axios from "axios";
import { createWriteStream } from "node:fs";
// import 'dotenv/config';
const { Client, RequestBuilder, Payload } = require('yoti');

export class YotiService {
   private readonly YOTI_BASE_URL = "https://api.yoti.com/idverify/v1";
   private readonly YOTI_SDK_ID = '1f9edc97-c60c-40d7-becb-c1c6a2ec4963';
  //  private readonly YOTI_PEM_LOCATION: string;
  //  private readonly PDF_LOCATION: string;
   private readonly YOTI_PEM_BASE64 = Buffer.from("LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQpNSUlFcEFJQkFBS0NBUUVBc1VOSmJYZkdtL2VWWm9HWG9jVFZsVGxNL2pDcFpqOFI2cU9PeGR0MitUM1hIN21GCkdyZHFBdWFHS1MvbHB3WDh2Z1FMOUVELzRHTTNKU1RKVmNPT2YveHFWSEVqcWp6VWlGM1JPSG9jeTVPZURFUEYKSGFTdVNvUi9EeFhQOE0ybHg4MHRKNmcwOW5MeHB2TmFIVVpBQ3A4TWsvekEwRE1BUkFUUWQ5ZzdvMUlSR1lYTgpwS0pPY3JVZkxZdHBJOW0ycFJWMGZOKzdjcGQzZUd2SFFSR29qNHF5V2s3TkM4UUlkazR0ekc5Y2VpT0huTTZSCnZpOHhvWDlxbGdNSkZZU1E5YWJLeWJwUk1odXBENkpDVmRXOWwxZUJJajN2TExybG4zejdmU2YwYndmYmswYksKOFFwMlhLeFJBd2FOaHNRb3RHRG1HNVp1Q0RHclZnQm1Ic0ZBOHdJREFRQUJBb0lCQUM0TWZjbTdRTlFKbUQwZAowMGRKKy9ZZEFaeFRCZDZ5NmJPYnM1NUFxZ0tMaHhRTnZMODVBSWdxWEpYY2hIdEVPZWtlNGdBYzFwdnpDa05TCjhCNmdnNmRKNmxGdlpzVjFzZnlPNnFnU1NPSzF3V3dNT3V1OWVTMlFoL1ZpUkRlWkpNVG56eUFyT1Q4QWt6ZzgKcFo5UFBabkV3WjY4SFZhNHVRdnllRGw1NmR3K0tUbldqb3V4WUQ0NHdCNERyZk9OZTRCZVFrMHNIVEw4Z3Y0awpHSk1HOEFDU0E4R0xKYkdoMXJ5Z3FQNlJDbVB2NFV3VGovRTZoRVJ0czgrTGRrSEhMb0poR2t0aWZSZnkwWDluCkNnSUJyK2RpNWUrUVQvQ0lGaTRPcVhOMFNLVzlPeFdKcmw4SjZBcEg4cGFjQmtzSGVmSVRJYnhUaGsrMm4vOEgKS1hwVmNxa0NnWUVBN0srOW5ZMXV3Q3Jxay8yZno3NVdhS2lLTVlsV2hTeEM4aVlZOEpUWXoyN3NxYVhSRGszcQpEOEZXTTI0VVhzRlFJSDVtcmtCWGdxc04wdDE3a3JyUHcvMkkrcGsreWpjOU42d28rTGo4M3pUOS81QWZHblpNCnFBQnRrZDIrTGVjMGNzcDNpK2t1bE5lVFdRbGhnNUhYMnV0akt6Q3ZQWEM2TDFhbmJ6bVExdTBDZ1lFQXY3bzMKZENoMjkyRElSSitaM0ROK2lZVGlyTVh3UE90Z29DclYrbDQ0RFA4Vno4Q3NJVGhvWFJYQkJrWTB1U3VCdUVtZgptWEJjMnl2aWVEcndQYmp6STNlTEd0NlExNVhPK24xdkliQ0ZEaTlOaitpckFyWlhDeHhnNTJjdURGU2tod3F3ClhMZW1INTVqcy94ZlJTQVkwQm1hRGYwUVFyRTV2M3pJQ0hOZ20xOENnWUVBbmhxZTdSbkcrM012azMvK093V0kKTHcwMmt2U002UlN4KzVOYllZbnNjbFJFbnVaM0Nia2VPendJMnY0VGVXQmtwL0FIb3lxenlrTjlUbmhJemJFZwpqR2xXRVNCQkEwOTNBek5yZ3duL1VSTFRBTjVEQ0tneGVLQWdrU213bW5VeFllVEJpcUpQVFhuYm9jUlVjVkVCCkFlbnZLckN3dnJnSWh3cTVlZURZVWRrQ2dZRUFnSGo4cmJacnVXbzk2RlgyR0tyYzBMT2QzTjRxRS9nNVlEb3oKOWpmcVlUTVEzNHloQ3dXc1VTdkJrejI2R0phQnJ3YU9qcGZQY1FIZ0dHYU9FeDM2dHJwbEdSVW9nMzJjR3hldwpQeWYwa01PN3VvSFREZGMzVG5ldXE0RGxSMWYwZzVUekJyMzg4RlVIUkZVSlZkMmpJdGIwOXdpck83VmNGK2M2CmR3Y3hKZ3NDZ1lCSEpGMGNNbEx6S3dMQTN6NnVsREplU2k5YmNXV2VFZkhPekp2MzFVRWNWUFB5OWtjMTJxZzAKZFZpM0dUenpyOWJxMXpQR0w0S2ErNjZTcHFZTFc0TWd2aytsQ2IwTjJvaG9kVHJsdFczMFYrdXFjZHdKOCtObAp6Y1ZNSVVodmR2d291UEFlT0I5cXBLeGlwRHdqVWNhd0RDb3hXUzVPWVdUQmxjNkJIeHFUZ3c9PQotLS0tLUVORCBSU0EgUFJJVkFURSBLRVktLS0tLQ==", 'base64').toString('utf8');

  //  constructor({ 
  //     YOTI_SDK_ID, 
  //     YOTI_PEM_LOCATION, 
  //     YOTI_PEM_BASE64, 
  //     PDF_LOCATION }: { [key: string]: string | undefined; }) {
  //     this.YOTI_SDK_ID = YOTI_SDK_ID!;
  //     this.YOTI_PEM_LOCATION = YOTI_PEM_LOCATION!;
  //     this.PDF_LOCATION = PDF_LOCATION!
  //     this.YOTI_PEM_BASE64 = YOTI_PEM_BASE64!
  //  }

   private base64DecodeToString(value: string) {
      return Buffer.from(value, 'base64').toString('utf8');
   };

   public createYotiClient(): number {
      const CLIENT_SDK_ID = this.YOTI_SDK_ID;
      const PEM_KEY = this.base64DecodeToString(this.YOTI_PEM_BASE64);
      return new Client(CLIENT_SDK_ID, PEM_KEY)
   };

   public async createSession() {
      const PEM_KEY = this.base64DecodeToString(this.YOTI_PEM_BASE64);

			const fullName = 'John Doe';
			const dateOfBirth = "1988-11-02";
			const namePrefix = "Mr";

      const request = new RequestBuilder()
         .withBaseUrl("https://api.yoti.com/idverify/v1")
         .withPemString(PEM_KEY)
         .withEndpoint("/sessions")
         .withPayload(new Payload({
            "session_deadline": "2023-05-05T23:59:59Z",
            "resources_ttl": "15780000",
            "ibv_options": {
               "support": "MANDATORY"
            },
            "user_tracking_id": "some_id",
            "notifications": {
               "endpoint": "https://some-domain.example",
               "topics": [
                  "SESSION_COMPLETION", "INSTRUCTIONS_EMAIL_REQUESTED"
               ],
               "auth_token": "string",
               "auth_type": "BASIC"
            },
            "requested_checks": [
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
               },
               {
                  "type": "ID_DOCUMENT_AUTHENTICITY",
                  "config": {
                     "manual_check": "FALLBACK"
                  }
               },
               {
                  "type": "ID_DOCUMENT_FACE_MATCH",
                  "config": {
                     "manual_check": "FALLBACK"
                  }
               }
            ],
            "requested_tasks": [
               {
                  "type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
                  "config": {
                     "manual_check": "FALLBACK"
                  }
               }
            ],
            "required_documents": [
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
               }
            ],
            "resources": {
               "applicant_profile": {
                  "full_name": fullName,
                  "date_of_birth": dateOfBirth,
                  "name_prefix": namePrefix,
                  "structured_postal_address": {
                     "address_format": 1,
                     "building_number": "74",
                     "address_line1": "AddressLine1",
                     "town_city": "CityName",
                     "postal_code": "E143RN",
                     "country_iso": "GBR",
                     "country": "United Kingdom"
                  }
               }
            }
         }))
         .withMethod("POST")
         .withQueryParam("sdkId", this.YOTI_SDK_ID)
         .build();

      const response = await request.execute();
			console.log('response', response);
      return response.parsedResponse.session_id;
   }

   public async fetchSessionInfo(sessionId: string) {
			const PEM_KEY = this.base64DecodeToString(this.YOTI_PEM_BASE64);

      const request = new RequestBuilder()
         .withBaseUrl(this.YOTI_BASE_URL)
				 .withPemString(PEM_KEY)
         .withEndpoint(`/sessions/${sessionId}/configuration`)
         .withMethod("GET")
         .withQueryParam("sdkId", this.YOTI_SDK_ID)
         .build();

      const response = await request.execute();
      return response;
   }

   public async generateInstructions(sessionId: string, requirements: []) {
			const PEM_KEY = this.base64DecodeToString(this.YOTI_PEM_BASE64);

      const request = new RequestBuilder()
         .withBaseUrl(this.YOTI_BASE_URL)
				 .withPemString(PEM_KEY)
         .withEndpoint(`/sessions/${sessionId}/instructions`)
         .withMethod("PUT")
         .withPayload(new Payload({
            "contact_profile": {
               "first_name": "John",
               "last_name": "Doe",
               "email": "john.doe@gmail.com"
            },
            "documents": requirements,
            "branch": {
               "type": "UK_POST_OFFICE",
               "name": "UK Post Office Branch",
               "address": "123 Post Office Road, London",
               "post_code": "ABC 123",
               "location": {
                  "latitude": 0.34322,
                  "longitude": -42.48372
               }
            }
         }))
         .withQueryParam("sdkId", this.YOTI_SDK_ID)
         .build();

      const response = await request.execute();
      return response;
   }

  //  public async fetchInstructionsPdf(sessionId: string) {
  //     const request = new RequestBuilder()
  //        .withBaseUrl(this.YOTI_BASE_URL)
  //        .withPemFilePath(this.YOTI_PEM_LOCATION)
  //        .withEndpoint(`/sessions/${sessionId}/instructions/pdf`)
  //        .withMethod("GET")
  //        .withQueryParam("sdkId", this.YOTI_SDK_ID)
  //        .build();

  //     const writer = createWriteStream(this.PDF_LOCATION);
  //     return axios({ ...request, responseType: 'stream' })
  //        .then(response => {
  //           return new Promise((resolve, reject) => {
  //              response.data.pipe(writer);
  //              let error: any = null;
  //              writer.on('error', (err: any) => {
  //                 error = err;
  //                 writer.close();
  //                 reject(err);
  //              });
  //              writer.on('close', () => {
  //                 if (!error) {
  //                    resolve(true);
  //                 }
  //              });
  //           });
  //        });
  //  }
}