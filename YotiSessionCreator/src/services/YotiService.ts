import axios from "axios";
import { createWriteStream } from "node:fs";
import 'dotenv/config';
const { Client, RequestBuilder, Payload } = require('yoti');

export class YotiService {
   private readonly YOTI_BASE_URL = "https://api.yoti.com/idverify/v1";
   private readonly YOTI_SDK_ID: string;
   private readonly YOTI_PEM_LOCATION: string;
   private readonly PDF_LOCATION: string;
   private readonly YOTI_PEM_BASE64: string;

   constructor({ 
      YOTI_SDK_ID, 
      YOTI_PEM_LOCATION, 
      YOTI_PEM_BASE64, 
      PDF_LOCATION }: { [key: string]: string | undefined; }) {
      this.YOTI_SDK_ID = YOTI_SDK_ID!;
      this.YOTI_PEM_LOCATION = YOTI_PEM_LOCATION!;
      this.PDF_LOCATION = PDF_LOCATION!
      this.YOTI_PEM_BASE64 = YOTI_PEM_BASE64!
   }

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

      const request = new RequestBuilder()
         .withBaseUrl("https://api.yoti.com/idverify/v1")
         .withPemString(PEM_KEY) // file path to PEM file
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
                  "SESSION_COMPLETION"
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
                  "full_name": "John Doe",
                  "date_of_birth": "1988-11-02",
                  "name_prefix": "Mr",
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
      return response.parsedResponse.session_id;
   }

   public async fetchSessionInfo(sessionId: string) {
      const request = new RequestBuilder()
         .withBaseUrl(this.YOTI_BASE_URL)
         .withPemFilePath(this.YOTI_PEM_LOCATION) // file path to PEM file
         .withEndpoint(`/sessions/${sessionId}/configuration`)
         .withMethod("GET")
         .withQueryParam("sdkId", this.YOTI_SDK_ID)
         .build();

      const response = await request.execute();
      return response;
   }

   public async generateInstructions(sessionId: string, requirements: []) {
      const request = new RequestBuilder()
         .withBaseUrl(this.YOTI_BASE_URL)
         .withPemFilePath(this.YOTI_PEM_LOCATION)
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

   public async fetchInstructionsPdf(sessionId: string) {
      const request = new RequestBuilder()
         .withBaseUrl(this.YOTI_BASE_URL)
         .withPemFilePath(this.YOTI_PEM_LOCATION)
         .withEndpoint(`/sessions/${sessionId}/instructions/pdf`)
         .withMethod("GET")
         .withQueryParam("sdkId", this.YOTI_SDK_ID)
         .build();

      const writer = createWriteStream(this.PDF_LOCATION);
      return axios({ ...request, responseType: 'stream' })
         .then(response => {
            return new Promise((resolve, reject) => {
               response.data.pipe(writer);
               let error: any = null;
               writer.on('error', (err: any) => {
                  error = err;
                  writer.close();
                  reject(err);
               });
               writer.on('close', () => {
                  if (!error) {
                     resolve(true);
                  }
               });
            });
         });
   }
}