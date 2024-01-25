export const AI_FAIL_MANUAL_PASS = {
	"client_session_token_ttl": 1236123,
	"session_id": "c3584f5b-c89c-4632-aa29-a77cda7820a4",
	"state": "COMPLETED",
	"resources": {
			"id_documents": [
					{
							"id": "b29d7381-8966-4e27-98f0-fbdb761a6563",
							"tasks": [
									{
											"type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
											"id": "288e53eb-51f6-441b-a01c-c754150e2b10",
											"state": "DONE",
											"created": "2023-05-22T14:23:42Z",
											"last_updated": "2023-05-22T14:24:31Z",
											"generated_checks": [],
											"generated_media": [
													{
															"id": "63a4184f-e590-4ea6-9c04-03fae8692992",
															"type": "JSON"
													}
											]
									}
							],
							"source": {
									"type": "IBV"
							},
							"created_at": "2023-05-22T14:23:42Z",
							"last_updated": "2023-05-22T14:24:31Z",
							"document_type": "PASSPORT",
							"issuing_country": "GBR",
							"pages": [
									{
											"capture_method": "CAMERA",
											"media": {
													"id": "74e91fdd-3bba-4e6e-b8cd-26d0638b6a3b",
													"type": "IMAGE",
													"created": "2023-05-22T14:24:18Z",
													"last_updated": "2023-05-22T14:24:18Z"
											},
											"frames": [
													{
															"media": {
																	"id": "421eca5e-deff-4e2c-bf73-7046cd9f85c5",
																	"type": "IMAGE",
																	"created": "2023-05-22T14:24:20Z",
																	"last_updated": "2023-05-22T14:24:20Z"
															}
													},
													{
															"media": {
																	"id": "dcea246c-65b4-44e4-9153-e00f168c20f4",
																	"type": "IMAGE",
																	"created": "2023-05-22T14:24:23Z",
																	"last_updated": "2023-05-22T14:24:23Z"
															}
													},
													{
															"media": {
																	"id": "f8738176-d389-4525-92b5-45f06c7814b4",
																	"type": "IMAGE",
																	"created": "2023-05-22T14:24:25Z",
																	"last_updated": "2023-05-22T14:24:25Z"
															}
													}
											]
									}
							],
							"document_fields": {
									"media": {
											"id": "63a4184f-e590-4ea6-9c04-03fae8692992",
											"type": "JSON",
											"created": "2023-05-22T14:24:31Z",
											"last_updated": "2023-05-22T14:24:31Z"
									}
							},
							"document_id_photo": {
									"media": {
											"id": "6bab1339-fa9c-4b04-91ea-cacf29bf5c5e",
											"type": "IMAGE",
											"created": "2023-05-22T14:24:31Z",
											"last_updated": "2023-05-22T14:24:31Z"
									}
							}
					}
			],
			"supplementary_documents": [],
			"liveness_capture": [],
			"face_capture": [
					{
							"id": "6bbc2014-1805-4de3-a7fc-97a8ce8ec17b",
							"tasks": [],
							"source": {
									"type": "IBV"
							},
							"created_at": "2023-05-22T14:24:39Z",
							"last_updated": "2023-05-22T14:24:45Z",
							"image": {
									"media": {
											"id": "65fd4121-5a56-40a4-a8e1-c4d6eddc598d",
											"type": "IMAGE",
											"created": "2023-05-22T14:24:45Z",
											"last_updated": "2023-05-22T14:24:45Z"
									}
							}
					}
			],
			"applicant_profiles": [
					{
							"id": "5499512d-fcdf-42e9-8ab7-63d14a0ff5a2",
							"tasks": [],
							"source": {
									"type": "RELYING_BUSINESS"
							},
							"created_at": "2023-05-22T14:22:41Z",
							"last_updated": "2023-05-22T14:22:41Z",
							"media": {
									"id": "9ce7d623-3f19-459a-9105-2878395bdd61",
									"type": "JSON",
									"created": "2023-05-22T14:22:41Z",
									"last_updated": "2023-05-22T14:22:41Z"
							}
					}
			]
	},
	"checks": [
			{
					"type": "ID_DOCUMENT_AUTHENTICITY",
					"id": "a4812551-670e-4165-a990-582b2db0cd45",
					"state": "DONE",
					"resources_used": [
							"b29d7381-8966-4e27-98f0-fbdb761a6563"
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
											"result": "PASS",
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
									},
									{
											"sub_check": "yoti_fraud_list_check",
											"result": "PASS",
											"details": [],
											"process": "EXPERT_REVIEW"
									}
							]
					},
					"created": "2023-05-22T14:24:51Z",
					"last_updated": "2023-05-22T15:09:30Z"
			},
			{
					"type": "ID_DOCUMENT_FACE_MATCH",
					"id": "8d8cf2e8-9e72-4c19-8fef-2353f9ab72e8",
					"state": "DONE",
					"resources_used": [
							"b29d7381-8966-4e27-98f0-fbdb761a6563",
							"6bbc2014-1805-4de3-a7fc-97a8ce8ec17b"
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
					"created": "2023-05-22T14:24:51Z",
					"last_updated": "2023-05-22T15:09:19Z"
			},
			{
					"type": "IBV_VISUAL_REVIEW_CHECK",
					"id": "c72cc71d-4528-4d3d-bf54-d004845e5731",
					"state": "DONE",
					"resources_used": [
							"b29d7381-8966-4e27-98f0-fbdb761a6563"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-05-22T14:24:51Z",
					"last_updated": "2023-05-22T14:24:51Z"
			},
			{
					"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
					"id": "da6050db-c452-490f-9137-baee7252a741",
					"state": "DONE",
					"resources_used": [
							"b29d7381-8966-4e27-98f0-fbdb761a6563"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-05-22T14:24:51Z",
					"last_updated": "2023-05-22T14:24:51Z",
					"scheme": "UK_GDS"
			},
			{
					"type": "PROFILE_DOCUMENT_MATCH",
					"id": "9a819d4c-ae73-4c3d-a4ab-f0c5fa7171f3",
					"state": "DONE",
					"resources_used": [
							"b29d7381-8966-4e27-98f0-fbdb761a6563",
							"5499512d-fcdf-42e9-8ab7-63d14a0ff5a2"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-05-22T14:24:51Z",
					"last_updated": "2023-05-22T14:24:51Z"
			}
	],
	"user_tracking_id": "some_id"
}