
export class YotiSessionRequest {

    constructor(sessionId: string) {

        this.session_id = sessionId;
        this.client_session_token_ttl = 599;
        this.biometric_consent = "NOT_REQUIRED";

        this.requested_checks =[
            "ID_DOCUMENT_AUTHENTICITY",
            "ID_DOCUMENT_FACE_MATCH",
            "IBV_VISUAL_REVIEW_CHECK",
            "DOCUMENT_SCHEME_VALIDITY_CHECK",
            "PROFILE_DOCUMENT_MATCH"
        ]

       this.capture = {
           "required_resources": [
               {
                   "type": "ID_DOCUMENT",
                   "id": "409e8f68-b88d-46b0-aa1d-a9fdf2a1d962",
                   "state": "REQUIRED",
                   "allowed_sources": [
                       {
                           "type": "IBV"
                       }
                   ],
                   "requested_tasks": [
                       {
                           "type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
                           "state": "REQUIRED"
                       }
                   ],
                   "ibv_client_assessments": [
                       {
                           "type": "IBV_VISUAL_REVIEW_CHECK",
                           "state": "REQUIRED"
                       },
                       {
                           "type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
                           "state": "REQUIRED",
                           "scheme": "UK_DBS"
                       },
                       {
                           "type": "PROFILE_DOCUMENT_MATCH",
                           "state": "REQUIRED"
                       }
                   ],
                   "supported_countries": [
                       {
                           "code": "GBR",
                           "supported_documents": [
                               {
                                   "type": "PASSPORT"
                               }
                           ]
                       }
                   ],
                   "allowed_capture_methods": "CAMERA",
                   "attempts_remaining": {
                       "RECLASSIFICATION": 2,
                       "GENERIC": 2
                   }
               },
               {
                   "type": "FACE_CAPTURE",
                   "id": "84775481-cc92-4dcb-a08c-02a95039d6df",
                   "state": "REQUIRED",
                   "allowed_sources": [
                       {
                           "type": "IBV"
                       }
                   ]
               }
           ],
           "biometric_consent": "NOT_REQUIRED"
       }

        this.applicant_profile={
            "media": {
                "id": "3645b40b-0352-4672-8764-7ce5565c7b20",
                "type": "JSON",
                "created": "2023-03-24T15:03:08Z",
                "last_updated": "2023-03-24T15:03:08Z"
            }
        }
    }

    session_id: string
    client_session_token_ttl: number;
    requested_checks: object;
    applicant_profile: object;
    capture: object;
    biometric_consent: string;
}
