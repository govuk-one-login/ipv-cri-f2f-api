export const EEA_AI_FAIL_MANUAL_PASS = {
  "client_session_token_ttl": 2980821,
  "session_id": "9ef8ab16-37ff-49ed-8213-ae60aa5ebd99",
  "state": "COMPLETED",
  "resources": {
      "id_documents": [
          {
              "id": "9252e6e7-df0a-4845-8221-ced8c1f6ba26",
              "tasks": [
                  {
                      "type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
                      "id": "07cecf41-8b43-4d2b-876d-1f6a6718100f",
                      "state": "DONE",
                      "created": "2023-06-01T11:56:46Z",
                      "last_updated": "2023-06-01T11:57:45Z",
                      "generated_checks": [],
                      "generated_media": [
                          {
                              "id": "283a7d0b-3436-4a17-8d7d-50ad37b1be25",
                              "type": "JSON"
                          }
                      ]
                  }
              ],
              "source": {
                  "type": "IBV"
              },
              "created_at": "2023-06-01T11:56:46Z",
              "last_updated": "2023-06-01T11:57:45Z",
              "document_type": "NATIONAL_ID",
              "issuing_country": "FRA",
              "pages": [
                  {
                      "capture_method": "CAMERA",
                      "media": {
                          "id": "467e0e0e-cb5b-42bc-8bb3-773d723204c5",
                          "type": "IMAGE",
                          "created": "2023-06-01T11:57:31Z",
                          "last_updated": "2023-06-01T11:57:31Z"
                      },
                      "frames": [
                          {
                              "media": {
                                  "id": "7cfd23ab-7013-403b-923f-f31ea3658439",
                                  "type": "IMAGE",
                                  "created": "2023-06-01T11:57:32Z",
                                  "last_updated": "2023-06-01T11:57:32Z"
                              }
                          },
                          {
                              "media": {
                                  "id": "f8dd5f27-a3e4-4bfc-b401-0b58ef5d627a",
                                  "type": "IMAGE",
                                  "created": "2023-06-01T11:57:34Z",
                                  "last_updated": "2023-06-01T11:57:34Z"
                              }
                          }
                      ]
                  },
                  {
                      "capture_method": "CAMERA",
                      "media": {
                          "id": "4c57b4c7-d74d-4f9d-a790-2ce5bbd9f1d8",
                          "type": "IMAGE",
                          "created": "2023-06-01T11:57:36Z",
                          "last_updated": "2023-06-01T11:57:36Z"
                      },
                      "frames": [
                          {
                              "media": {
                                  "id": "c51db90e-c81a-4211-8e86-5ea5c23d6316",
                                  "type": "IMAGE",
                                  "created": "2023-06-01T11:57:37Z",
                                  "last_updated": "2023-06-01T11:57:37Z"
                              }
                          },
                          {
                              "media": {
                                  "id": "429f94e1-d24d-4379-9990-f74e27b960d2",
                                  "type": "IMAGE",
                                  "created": "2023-06-01T11:57:39Z",
                                  "last_updated": "2023-06-01T11:57:39Z"
                              }
                          }
                      ]
                  }
              ],
              "document_fields": {
                  "media": {
                      "id": "283a7d0b-3436-4a17-8d7d-50ad37b1be25",
                      "type": "JSON",
                      "created": "2023-06-01T11:57:44Z",
                      "last_updated": "2023-06-01T11:57:44Z"
                  }
              },
              "document_id_photo": {
                  "media": {
                      "id": "14166e55-4200-4615-9c8a-c7b8505573dd",
                      "type": "IMAGE",
                      "created": "2023-06-01T11:57:44Z",
                      "last_updated": "2023-06-01T11:57:44Z"
                  }
              }
          }
      ],
      "supplementary_documents": [],
      "liveness_capture": [],
      "face_capture": [
          {
              "id": "94779992-7a72-4095-8923-533f8a29d4cb",
              "tasks": [],
              "source": {
                  "type": "IBV"
              },
              "created_at": "2023-06-01T11:57:53Z",
              "last_updated": "2023-06-01T11:57:58Z",
              "image": {
                  "media": {
                      "id": "3e687c4f-961d-4da4-9a5e-3e5358f4f6e2",
                      "type": "IMAGE",
                      "created": "2023-06-01T11:57:58Z",
                      "last_updated": "2023-06-01T11:57:58Z"
                  }
              }
          },
          {
              "id": "b33f50f9-ef54-4222-bdbe-3972eeb01ad0",
              "tasks": [],
              "source": {
                  "type": "IBV"
              },
              "created_at": "2023-06-01T11:57:52Z",
              "last_updated": "2023-06-01T11:57:52Z"
          }
      ],
      "applicant_profiles": [
          {
              "id": "b3d86229-7b3b-43df-9601-48a608669ae5",
              "tasks": [],
              "source": {
                  "type": "RELYING_BUSINESS"
              },
              "created_at": "2023-06-01T11:55:14Z",
              "last_updated": "2023-06-01T11:55:14Z",
              "media": {
                  "id": "a33cb3ee-16ea-4460-900a-10524059ee11",
                  "type": "JSON",
                  "created": "2023-06-01T11:55:14Z",
                  "last_updated": "2023-06-01T11:55:14Z"
              }
          }
      ]
  },
  "checks": [
      {
          "type": "ID_DOCUMENT_AUTHENTICITY",
          "id": "64758f3f-4ba6-47c4-90e6-730140de4c60",
          "state": "DONE",
          "resources_used": [
              "9252e6e7-df0a-4845-8221-ced8c1f6ba26"
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
                      "sub_check": "ocr_mrz_comparison",
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
          "created": "2023-06-01T11:58:16Z",
          "last_updated": "2023-06-01T11:59:33Z"
      },
      {
          "type": "ID_DOCUMENT_FACE_MATCH",
          "id": "d928c5a7-5d7b-4c40-bb04-a16b12de0bb0",
          "state": "DONE",
          "resources_used": [
              "9252e6e7-df0a-4845-8221-ced8c1f6ba26",
              "94779992-7a72-4095-8923-533f8a29d4cb"
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
          "created": "2023-06-01T11:58:16Z",
          "last_updated": "2023-06-01T11:58:19Z"
      },
      {
          "type": "IBV_VISUAL_REVIEW_CHECK",
          "id": "40e76de0-08c3-4a65-af6f-4e995724c9ff",
          "state": "DONE",
          "resources_used": [
              "9252e6e7-df0a-4845-8221-ced8c1f6ba26"
          ],
          "generated_media": [],
          "report": {
              "recommendation": {
                  "value": "APPROVE"
              },
              "breakdown": []
          },
          "created": "2023-06-01T11:58:16Z",
          "last_updated": "2023-06-01T11:58:16Z"
      },
      {
          "type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
          "id": "bdcbb670-495a-4ed7-8d81-fdfe0aa5ab7d",
          "state": "DONE",
          "resources_used": [
              "9252e6e7-df0a-4845-8221-ced8c1f6ba26"
          ],
          "generated_media": [],
          "report": {
              "recommendation": {
                  "value": "APPROVE"
              },
              "breakdown": []
          },
          "created": "2023-06-01T11:58:16Z",
          "last_updated": "2023-06-01T11:58:16Z",
          "scheme": "UK_GDS"
      },
      {
          "type": "PROFILE_DOCUMENT_MATCH",
          "id": "417e4c23-b36b-440f-a8df-554d41b4e783",
          "state": "DONE",
          "resources_used": [
              "9252e6e7-df0a-4845-8221-ced8c1f6ba26",
              "b3d86229-7b3b-43df-9601-48a608669ae5"
          ],
          "generated_media": [],
          "report": {
              "recommendation": {
                  "value": "APPROVE"
              },
              "breakdown": []
          },
          "created": "2023-06-01T11:58:16Z",
          "last_updated": "2023-06-01T11:58:16Z"
      }
  ],
  "user_tracking_id": "some_id"
}