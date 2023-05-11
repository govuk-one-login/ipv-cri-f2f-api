export const VALID_GET_SESSION_CONFIG_RESPONSE = {
    "client_session_token_ttl": 599,
    "session_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "requested_checks": [
        "string"
    ],
    "applicant_profile": {
        "media": {
            "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
            "type": "IMAGE",
            "created": "2021-06-11T11:39:24Z",
            "last_updated": "2021-06-11T11:39:24Z"
        }
    },
    "capture": {
        "biometric_consent": "REQUIRED",
        "required_resources": [
            {
                "type": "ID_DOCUMENT",
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "state": "REQUIRED",
                "allowed_sources": [
                    {
                        "type": "END_USER"
                    },
                    {
                        "type": "RELYING_BUSINESS"
                    },
                    {
                        "type": "IBV"
                    }
                ],
                "supported_countries": [
                    {
                        "code": "GBR",
                        "supported_documents": [
                            {
                                "type": "DRIVING_LICENCE",
                                "requirements": {
                                    "date_from": "2011-10-31"
                                }
                            },
                            {
                                "type": "PASSPORT"
                            }
                        ]
                    }
                ],
                "allowed_capture_methods": "CAMERA_AND_UPLOAD",
                "ibv_client_assessments": [
                    {
                        "type": "IBV_VISUAL_REVIEW_CHECK",
                        "state": "REQUIRED"
                    },
                    {
                        "type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
                        "state": "REQUIRED",
                        "scheme": "string"
                    },
                    {
                        "type": "PROFILE_DOCUMENT_MATCH",
                        "state": "REQUIRED"
                    }
                ],
                "requested_tasks": [
                    {
                        "type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
                        "state": "REQUIRED"
                    }
                ],
                "attempts_remaining": {
                    "GENERIC": 3,
                    "RECLASSIFICATION": 2
                }
            },
            {
                "type": "SUPPLEMENTARY_DOCUMENT",
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "state": "REQUIRED",
                "allowed_sources": [
                    {
                        "type": "END_USER"
                    },
                    {
                        "type": "RELYING_BUSINESS"
                    },
                    {
                        "type": "IBV"
                    }
                ],
                "document_types": [
                    "UTILITY_BILL",
                    "BANK_STATEMENT"
                ],
                "country_codes": [
                    "GBR",
                    "FRA"
                ],
                "objective": {
                    "type": "string"
                },
                "ibv_client_assessments": [
                    {
                        "type": "IBV_VISUAL_REVIEW_CHECK",
                        "state": "REQUIRED"
                    },
                    {
                        "type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
                        "state": "REQUIRED",
                        "scheme": "string"
                    },
                    {
                        "type": "PROFILE_DOCUMENT_MATCH",
                        "state": "REQUIRED"
                    }
                ],
                "requested_tasks": [
                    {
                        "type": "SUPPLEMENTARY_DOCUMENT_TEXT_DATA_EXTRACTION",
                        "state": "REQUIRED"
                    }
                ]
            },
            {
                "type": "FACE_CAPTURE",
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "state": "REQUIRED",
                "allowed_sources": [
                    {
                        "type": "END_USER"
                    },
                    {
                        "type": "RELYING_BUSINESS"
                    },
                    {
                        "type": "IBV"
                    }
                ]
            },
            {
                "type": "APPLICANT_PROFILE",
                "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "state": "REQUIRED",
                "allowed_sources": [
                    {
                        "type": "END_USER"
                    },
                    {
                        "type": "RELYING_BUSINESS"
                    },
                    {
                        "type": "IBV"
                    }
                ]
            }
        ]
    },
    "sdk_config": {
        "primary_colour": "#2d9fff",
        "secondary_colour": "#FFFFFF",
        "font_colour": "#FFFFFF",
        "locale": "en-US",
        "preset_issuing_country": "USA",
        "success_url": "string",
        "error_url": "string",
        "privacy_policy_url": "string",
        "hide_logo": true,
        "allow_handoff": true
    }
}
