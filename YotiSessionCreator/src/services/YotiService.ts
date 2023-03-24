import axios from "axios";
import { createWriteStream } from "node:fs";
import 'dotenv/config';
const { Client, RequestBuilder, Payload } = require('yoti');

export class YotiService {
   private readonly YOTI_BASE_URL = "https://3o4tr06lnb.execute-api.eu-west-2.amazonaws.com/dev";
   private readonly YOTI_SDK_ID= "1234";
   private readonly YOTI_PEM_LOCATION= "./private-key.pem";
   private readonly PDF_LOCATION="test";
   private readonly YOTI_PEM_BASE64="LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ0KTUlJRXBBSUJBQUtDQVFFQXNVTkpiWGZHbS9lVlpvR1hvY1RWbFRsTS9qQ3BaajhSNnFPT3hkdDIrVDNYSDdtRg0KR3JkcUF1YUdLUy9scHdYOHZnUUw5RUQvNEdNM0pTVEpWY09PZi94cVZIRWpxanpVaUYzUk9Ib2N5NU9lREVQRg0KSGFTdVNvUi9EeFhQOE0ybHg4MHRKNmcwOW5MeHB2TmFIVVpBQ3A4TWsvekEwRE1BUkFUUWQ5ZzdvMUlSR1lYTg0KcEtKT2NyVWZMWXRwSTltMnBSVjBmTis3Y3BkM2VHdkhRUkdvajRxeVdrN05DOFFJZGs0dHpHOWNlaU9Ibk02Ug0Kdmk4eG9YOXFsZ01KRllTUTlhYkt5YnBSTWh1cEQ2SkNWZFc5bDFlQklqM3ZMTHJsbjN6N2ZTZjBid2ZiazBiSw0KOFFwMlhLeFJBd2FOaHNRb3RHRG1HNVp1Q0RHclZnQm1Ic0ZBOHdJREFRQUJBb0lCQUM0TWZjbTdRTlFKbUQwZA0KMDBkSisvWWRBWnhUQmQ2eTZiT2JzNTVBcWdLTGh4UU52TDg1QUlncVhKWGNoSHRFT2VrZTRnQWMxcHZ6Q2tOUw0KOEI2Z2c2ZEo2bEZ2WnNWMXNmeU82cWdTU09LMXdXd01PdXU5ZVMyUWgvVmlSRGVaSk1Ubnp5QXJPVDhBa3pnOA0KcFo5UFBabkV3WjY4SFZhNHVRdnllRGw1NmR3K0tUbldqb3V4WUQ0NHdCNERyZk9OZTRCZVFrMHNIVEw4Z3Y0aw0KR0pNRzhBQ1NBOEdMSmJHaDFyeWdxUDZSQ21QdjRVd1RqL0U2aEVSdHM4K0xka0hITG9KaEdrdGlmUmZ5MFg5bg0KQ2dJQnIrZGk1ZStRVC9DSUZpNE9xWE4wU0tXOU94V0pybDhKNkFwSDhwYWNCa3NIZWZJVElieFRoaysybi84SA0KS1hwVmNxa0NnWUVBN0srOW5ZMXV3Q3Jxay8yZno3NVdhS2lLTVlsV2hTeEM4aVlZOEpUWXoyN3NxYVhSRGszcQ0KRDhGV00yNFVYc0ZRSUg1bXJrQlhncXNOMHQxN2tyclB3LzJJK3BrK3lqYzlONndvK0xqODN6VDkvNUFmR25aTQ0KcUFCdGtkMitMZWMwY3NwM2kra3VsTmVUV1FsaGc1SFgydXRqS3pDdlBYQzZMMWFuYnptUTF1MENnWUVBdjdvMw0KZENoMjkyRElSSitaM0ROK2lZVGlyTVh3UE90Z29DclYrbDQ0RFA4Vno4Q3NJVGhvWFJYQkJrWTB1U3VCdUVtZg0KbVhCYzJ5dmllRHJ3UGJqekkzZUxHdDZRMTVYTytuMXZJYkNGRGk5TmoraXJBclpYQ3h4ZzUyY3VERlNraHdxdw0KWExlbUg1NWpzL3hmUlNBWTBCbWFEZjBRUXJFNXYzeklDSE5nbTE4Q2dZRUFuaHFlN1JuRyszTXZrMy8rT3dXSQ0KTHcwMmt2U002UlN4KzVOYllZbnNjbFJFbnVaM0Nia2VPendJMnY0VGVXQmtwL0FIb3lxenlrTjlUbmhJemJFZw0KakdsV0VTQkJBMDkzQXpOcmd3bi9VUkxUQU41RENLZ3hlS0Fna1Ntd21uVXhZZVRCaXFKUFRYbmJvY1JVY1ZFQg0KQWVudktyQ3d2cmdJaHdxNWVlRFlVZGtDZ1lFQWdIajhyYlpydVdvOTZGWDJHS3JjMExPZDNONHFFL2c1WURveg0KOWpmcVlUTVEzNHloQ3dXc1VTdkJrejI2R0phQnJ3YU9qcGZQY1FIZ0dHYU9FeDM2dHJwbEdSVW9nMzJjR3hldw0KUHlmMGtNTzd1b0hURGRjM1RuZXVxNERsUjFmMGc1VHpCcjM4OEZVSFJGVUpWZDJqSXRiMDl3aXJPN1ZjRitjNg0KZHdjeEpnc0NnWUJISkYwY01sTHpLd0xBM3o2dWxESmVTaTliY1dXZUVmSE96SnYzMVVFY1ZQUHk5a2MxMnFnMA0KZFZpM0dUenpyOWJxMXpQR0w0S2ErNjZTcHFZTFc0TWd2aytsQ2IwTjJvaG9kVHJsdFczMFYrdXFjZHdKOCtObA0KemNWTUlVaHZkdndvdVBBZU9COXFwS3hpcER3alVjYXdEQ294V1M1T1lXVEJsYzZCSHhxVGd3PT0NCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0tDQo=";

   constructor({
      YOTI_SDK_ID,
      YOTI_PEM_LOCATION,
      YOTI_PEM_BASE64,
      PDF_LOCATION }: { [key: string]: string | undefined; }) {
      console.log("HERE")
      //this.YOTI_SDK_ID = YOTI_SDK_ID!;
      //this.YOTI_PEM_LOCATION = YOTI_PEM_LOCATION!;
      //this.PDF_LOCATION = PDF_LOCATION!
      //this.YOTI_PEM_BASE64 = YOTI_PEM_BASE64!
   }

   private base64DecodeToString(value: string) {
      console.log("HERE111")
      return Buffer.from(value, 'base64').toString('utf8');
   };

   public createYotiClient(): number {
      const CLIENT_SDK_ID = this.YOTI_SDK_ID;
      const PEM_KEY = this.base64DecodeToString(this.YOTI_PEM_BASE64);
      return new Client(CLIENT_SDK_ID, PEM_KEY)
   };

   public async createSession() {
      const PEM_KEY = this.base64DecodeToString(this.YOTI_PEM_BASE64);

      console.log("HERE222")
      const request = new RequestBuilder()
         .withBaseUrl("https://3o4tr06lnb.execute-api.eu-west-2.amazonaws.com/dev")
         .withPemString(PEM_KEY) // file path to PEM file
         .withEndpoint("/sessions")
         .withPayload(new Payload({

            "ibv_options": {
               "support": "MANDATORY"
            },
            "user_tracking_id": "some_id",
            "notifications": {
               "endpoint": "https://some-domain.example",
               "topics": ["SESSION_COMPLETION"],
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
                     "type": "ORTHOGONAL_RESTRICTIONS",
                     "allow_non_latin_documents": true,
                     "allow_expired_documents": true,
                     "country_restriction": {
                        "inclusion": "INCLUDE",
                        "country_codes": [
                           "GBR",
                           "FRA"
                        ]
                     },
                     "type_restriction": {
                        "inclusion": "INCLUDE",
                        "document_types": [
                           "PASSPORT",
                           "STATE_ID"
                        ]
                     }
                  }
               }
            ],

            "resources": {
               "applicant_profile": {
                  "additionalProp1": {}
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
