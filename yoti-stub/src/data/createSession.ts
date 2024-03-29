export const CREATE_SESSION = {
  "session_deadline": "2023-05-05T23:59:59Z",
  "resources_ttl": "15780000",
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
                      "document_types": ["PASSPORT"]
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
}