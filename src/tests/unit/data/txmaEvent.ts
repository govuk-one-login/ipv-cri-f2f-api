const TXMA_EXTENSION = {
  extensions: {
    evidence: [
      {
        "type": "IdentityCheck",
        "strengthScore": 3,
        "validityScore": 2,
        "verificationScore": 3,
        "checkDetails": [
          {
            "checkMethod": "vri",
            "identityCheckPolicy": "published",
            "txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
          },
          {
            "checkMethod": "pvr",
            "photoVerificationProcessLevel": 3,
            "txn": "b988e9c8-47c6-430c-9ca3-8cdacd85ee91",
          },
      ],
      "ci": undefined,
      }
    ]
  }
}

export const TXMA_CORE_FIELDS = {
  "client_id": "ipv-core-stub", 
  "component_id": "https://XXX-c.env.account.gov.uk", 
  "event_name": "F2F_YOTI_RESPONSE_RECEIVED", 
  "timestamp": 1, 
  "user": {
    "govuk_signin_journey_id": "sdfssg", 
    "ip_address": "127.0.0.1", 
    "persistent_session_id": "sdgsdg", 
    "session_id": "RandomF2FSessionID", 
    "transaction_id": undefined, 
    "user_id": "testsub", 
    "email": undefined
  }
}

export const TXMA_VC_ISSUED = {
  ...TXMA_CORE_FIELDS,
  ...TXMA_EXTENSION, 
  restricted: {
    user: {
      "name": "ANGELA ZOE UK SPECIMEN",
      "birthDate": "1988-12-04"
    },
    "passport": [{
      "documentType": "PASSPORT",
      "documentNumber": "533401372",
      "expiryDate": "2025-09-28",
      "icaoIssuerCode": "GBR"
    }]
  }
}

export const TXMA_DL_VC_ISSUED = {
  ...TXMA_CORE_FIELDS,
  ...TXMA_EXTENSION, 
  restricted: {
    user: {
      "name": "LEEROY JENKINS",
      "birthDate": "1988-12-04"
    },
    "drivingPermit": [{
      "documentType": "DRIVING_LICENCE",
      "personalNumber": "LJENK533401372",
      "expiryDate": "2025-09-28",
      "issuingCountry": "GBR",
      "issuedBy": "DVLA",
      "issueDate": "2015-09-28",
      "fullAddress": "122 BURNS CRESCENT\nStormwind\nEH1 9GP"
    }]
  }
}
