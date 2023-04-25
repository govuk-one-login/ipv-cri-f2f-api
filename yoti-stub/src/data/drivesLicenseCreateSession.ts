export const CREATE_DL_SESSION = {
  "session_deadline": "2023-05-06T23:59:59Z",
  "resources_ttl": "15780000",
  "ibv_options": {
      "support": "MANDATORY"
  },
  "user_tracking_id": "some_id2",
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
              "scheme": "UK_GDS"
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
                      "country_codes": ["GBR"],
                      "document_types": ["DRIVING_LICENCE"]
                  }
              ]
          }
      }
  ],
  "resources": {
      "applicant_profile": {
          "full_name": "Joshua Charles Steadman",
          "date_of_birth": "1997-09-30",
          "name_prefix": "Mr",
          "structured_postal_address": {
              "address_format": 1,
              "building_number": "14",
              "address_line1": "14 Grove Avenue",
              "town_city": "London",
              "postal_code": "W7 3EP",
              "country_iso": "GBR",
              "country": "United Kingdom"
          }
      }
  }
}