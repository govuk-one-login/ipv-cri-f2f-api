export const BRP_AI_FAIL_MANUAL_PASS_NFC = {
  "client_session_token_ttl": 2968117,
  "session_id": "eebbf125-2d72-4b59-bc87-d1473f04b266",
  "state": "COMPLETED",
  "resources": {
      "id_documents": [
          {
              "id": "84d4987b-2d30-4513-bb2c-f79c5e5e065b",
              "tasks": [
                  {
                      "type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
                      "id": "3c896ad9-533e-49fe-8e9b-6f8e33dab97f",
                      "state": "DONE",
                      "created": "2023-06-01T15:28:53Z",
                      "last_updated": "2023-06-01T15:29:26Z",
                      "generated_checks": [],
                      "generated_media": [
                          {
                              "id": "9588d893-7bd9-4b7e-8523-ce65e3339567",
                              "type": "JSON"
                          }
                      ]
                  }
              ],
              "source": {
                  "type": "IBV"
              },
              "created_at": "2023-06-01T15:28:53Z",
              "last_updated": "2023-06-01T15:29:26Z",
              "document_type": "RESIDENCE_PERMIT",
              "issuing_country": "GBR",
              "pages": [
                  {
                      "capture_method": "CAMERA",
                      "media": {
                          "id": "9dabd559-03ac-4a99-ac12-a4532af7a3d5",
                          "type": "IMAGE",
                          "created": "2023-06-01T15:29:13Z",
                          "last_updated": "2023-06-01T15:29:13Z"
                      },
                      "frames": [
                          {
                              "media": {
                                  "id": "3457d874-224e-4f92-a3c2-6685ba21f92a",
                                  "type": "IMAGE",
                                  "created": "2023-06-01T15:29:14Z",
                                  "last_updated": "2023-06-01T15:29:14Z"
                              }
                          },
                          {
                              "media": {
                                  "id": "3f164ae1-fe47-4f59-967a-61aee55c79df",
                                  "type": "IMAGE",
                                  "created": "2023-06-01T15:29:16Z",
                                  "last_updated": "2023-06-01T15:29:16Z"
                              }
                          }
                      ]
                  },
                  {
                      "capture_method": "CAMERA",
                      "media": {
                          "id": "f4164f6f-c773-4ae4-9cbf-f2f2ad96b263",
                          "type": "IMAGE",
                          "created": "2023-06-01T15:29:18Z",
                          "last_updated": "2023-06-01T15:29:18Z"
                      },
                      "frames": [
                          {
                              "media": {
                                  "id": "f74cf1bc-181c-4321-afc9-ca059c0882c8",
                                  "type": "IMAGE",
                                  "created": "2023-06-01T15:29:19Z",
                                  "last_updated": "2023-06-01T15:29:19Z"
                              }
                          },
                          {
                              "media": {
                                  "id": "075ae24c-0984-4320-86d8-7758c8839ca4",
                                  "type": "IMAGE",
                                  "created": "2023-06-01T15:29:21Z",
                                  "last_updated": "2023-06-01T15:29:21Z"
                              }
                          }
                      ]
                  }
              ],
              "document_fields": {
                  "media": {
                      "id": "9588d893-7bd9-4b7e-8523-ce65e3339567",
                      "type": "JSON",
                      "created": "2023-06-01T15:29:26Z",
                      "last_updated": "2023-06-01T15:29:26Z"
                  }
              },
              "document_id_photo": {
                  "media": {
                      "id": "3a3f3a55-b562-459e-b0d0-e57c91ef1fc5",
                      "type": "IMAGE",
                      "created": "2023-06-01T15:29:26Z",
                      "last_updated": "2023-06-01T15:29:26Z"
                  }
              }
          }
      ],
      "supplementary_documents": [],
      "liveness_capture": [],
      "face_capture": [
          {
              "id": "df5399e5-2215-4a06-935e-7b9a06935c41",
              "tasks": [],
              "source": {
                  "type": "IBV"
              },
              "created_at": "2023-06-01T15:30:04Z",
              "last_updated": "2023-06-01T15:30:10Z",
              "image": {
                  "media": {
                      "id": "5ada7bb9-f09c-4b73-a415-67c2f812d9cb",
                      "type": "IMAGE",
                      "created": "2023-06-01T15:30:10Z",
                      "last_updated": "2023-06-01T15:30:10Z"
                  }
              }
          }
      ],
      "applicant_profiles": [
          {
              "id": "bb0af830-8494-4ea9-8b72-e0a8cd7d7859",
              "tasks": [],
              "source": {
                  "type": "RELYING_BUSINESS"
              },
              "created_at": "2023-06-01T15:25:21Z",
              "last_updated": "2023-06-01T15:25:21Z",
              "media": {
                  "id": "6937be59-056b-4244-a61f-810867bd3414",
                  "type": "JSON",
                  "created": "2023-06-01T15:25:21Z",
                  "last_updated": "2023-06-01T15:25:21Z"
              }
          }
      ]
  },
  "checks": [
      {
          "type": "ID_DOCUMENT_AUTHENTICITY",
          "id": "8fa7f8bb-6f53-4320-9ce8-6fa01f938218",
          "state": "DONE",
          "resources_used": [
              "84d4987b-2d30-4513-bb2c-f79c5e5e065b"
          ],
          "generated_media": [],
          "report": {
              "recommendation": {
                  "value": "APPROVE"
              },
              "breakdown": [
                  {
                    "sub_check": "chip_csca_trusted",
                    "result": "PASS",
                    "details": [],
                    "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "chip_data_integrity",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "chip_digital_signature_verification",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "chip_parse",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "chip_sod_parse",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "document_in_date",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "fraud_list_check",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "hologram",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "hologram_movement",
                      "result": "FAIL",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "mrz_validation",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "no_sign_of_forgery",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "no_sign_of_tampering",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "other_security_features",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  },
                  {
                      "sub_check": "physical_document_captured",
                      "result": "PASS",
                      "details": [],
                      "process": "EXPERT_REVIEW"
                  }
              ]
          },
          "created": "2023-06-01T15:30:36Z",
          "last_updated": "2023-06-01T15:31:11Z"
      },
      {
          "type": "ID_DOCUMENT_FACE_MATCH",
          "id": "812c85cf-d18d-429e-83f7-22cad3b98f86",
          "state": "DONE",
          "resources_used": [
              "84d4987b-2d30-4513-bb2c-f79c5e5e065b",
              "df5399e5-2215-4a06-935e-7b9a06935c41"
          ],
          "generated_media": [],
          "report": {
              "recommendation": {
                  "value": "APPROVE"
              },
              "breakdown": [
                  {
                      "sub_check": "ai_face_match",
                      "result": "FAIL",
                      "details": [
                          {
                              "name": "confidence_score",
                              "value": "0.02"
                          }
                      ],
                      "process": "AUTOMATED"
                  },
                  {
                    "sub_check": "manual_face_match",
                    "result": "PASS",
                    "details": [],
                    "process": "EXPERT_REVIEW"
                  }
              ]
          },
          "created": "2023-06-01T15:30:36Z",
          "last_updated": "2023-06-01T15:30:39Z"
      },
      {
          "type": "IBV_VISUAL_REVIEW_CHECK",
          "id": "28c4c449-cd60-464b-8d62-860a541667d3",
          "state": "DONE",
          "resources_used": [
              "84d4987b-2d30-4513-bb2c-f79c5e5e065b"
          ],
          "generated_media": [],
          "report": {
              "recommendation": {
                  "value": "APPROVE"
              },
              "breakdown": []
          },
          "created": "2023-06-01T15:30:36Z",
          "last_updated": "2023-06-01T15:30:36Z"
      },
      {
          "type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
          "id": "8fdb5b65-6d29-428f-bd0b-5274ad4c13e8",
          "state": "DONE",
          "resources_used": [
              "84d4987b-2d30-4513-bb2c-f79c5e5e065b"
          ],
          "generated_media": [],
          "report": {
              "recommendation": {
                  "value": "APPROVE"
              },
              "breakdown": []
          },
          "created": "2023-06-01T15:30:36Z",
          "last_updated": "2023-06-01T15:30:36Z",
          "scheme": "UK_GDS"
      },
      {
          "type": "PROFILE_DOCUMENT_MATCH",
          "id": "8fd5c1a7-9255-4354-aef6-2ca98e37bd20",
          "state": "DONE",
          "resources_used": [
              "84d4987b-2d30-4513-bb2c-f79c5e5e065b",
              "bb0af830-8494-4ea9-8b72-e0a8cd7d7859"
          ],
          "generated_media": [],
          "report": {
              "recommendation": {
                  "value": "APPROVE"
              },
              "breakdown": []
          },
          "created": "2023-06-01T15:30:36Z",
          "last_updated": "2023-06-01T15:30:36Z"
      }
  ],
  "user_tracking_id": "some_id"
}