export type StructuredPostalAddress = {
  address_format: number;
  building_number: string;
  address_line1: string;
  town_city: string;
  postal_code: string;
  country_iso: string;
  country: string;
  formatted_address: string;
};

export type ApplicantProfile = {
	full_name: string;
  date_of_birth: string;
  name_prefix: string;
  structured_postal_address: StructuredPostalAddress
};

type RequestedChecks = {
  type: string,
  config: {
    manual_check: string,
    scheme?: string
  }
}

type RequiredDocuments = {
  type: string,
  filter: {
      type: string,
      inclusion: string,
      documents: [
          {
              country_codes: [
                  string
              ],
              document_types: [
                  string
              ]
          }
      ],
      document_types: [
       string
      ],
      country_codes: [
          string
      ],
      objective: {
          type: string
      }
  }
}

export type SessionPayload = {
  client_session_token_ttl: string,
  resources_ttl: string,
  ibv_options: {
      support: string,
  },
  user_tracking_id: string,
  notifications: {
      endpoint: string,
      topics: [string]
  },
  requested_checks: [ RequestedChecks ],
  required_documents: [RequiredDocuments],
  resources: {
      applicant_profile: ApplicantProfile,
  }
}