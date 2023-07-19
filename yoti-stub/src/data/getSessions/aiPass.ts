export const AI_PASS = {
	"client_session_token_ttl": 2637158,
	"session_id": "f4340e05-03ec-48fe-bf6b-5946089bb4f3",
	"state": "COMPLETED",
	"resources": {
			"id_documents": [
					{
							"id": "355e9f80-6f2a-470c-a72e-e13c7417fb9a",
							"tasks": [
									{
											"type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
											"id": "a9521ad3-8b17-4115-b75f-0f3de86a4e2f",
											"state": "DONE",
											"created": "2023-04-05T10:11:03Z",
											"last_updated": "2023-04-05T10:14:02Z",
											"generated_checks": [],
											"generated_media": [
													{
															"id": "6b9efa9d-4968-4f5d-8536-377008526b26",
															"type": "JSON"
													}
											]
									}
							],
							"source": {
									"type": "IBV"
							},
							"created_at": "2023-04-05T10:11:03Z",
							"last_updated": "2023-04-05T10:14:02Z",
							"document_type": "PASSPORT",
							"issuing_country": "GBR",
							"pages": [
									{
											"capture_method": "CAMERA",
											"media": {
													"id": "cbb1503e-0fd5-456c-a023-2cfda11697e1",
													"type": "IMAGE",
													"created": "2023-04-05T10:13:50Z",
													"last_updated": "2023-04-05T10:13:50Z"
											},
											"frames": [
													{
															"media": {
																	"id": "5e7cee77-3718-4a99-a8b8-eb2f8969449a",
																	"type": "IMAGE",
																	"created": "2023-04-05T10:13:52Z",
																	"last_updated": "2023-04-05T10:13:52Z"
															}
													},
													{
															"media": {
																	"id": "82f2b1db-9bef-4a0a-ad6c-622da80b0894",
																	"type": "IMAGE",
																	"created": "2023-04-05T10:13:54Z",
																	"last_updated": "2023-04-05T10:13:54Z"
															}
													},
													{
															"media": {
																	"id": "df322a12-ce9b-4790-bf96-810b84982129",
																	"type": "IMAGE",
																	"created": "2023-04-05T10:13:56Z",
																	"last_updated": "2023-04-05T10:13:56Z"
															}
													}
											]
									}
							],
							"document_fields": {
									"media": {
											"id": "6b9efa9d-4968-4f5d-8536-377008526b26",
											"type": "JSON",
											"created": "2023-04-05T10:14:02Z",
											"last_updated": "2023-04-05T10:14:02Z"
									}
							},
							"document_id_photo": {
									"media": {
											"id": "2c4b59e8-fb68-4c7c-ac35-edac5cafa687",
											"type": "IMAGE",
											"created": "2023-04-05T10:14:02Z",
											"last_updated": "2023-04-05T10:14:02Z"
									}
							}
					}
			],
			"supplementary_documents": [],
			"liveness_capture": [],
			"face_capture": [
					{
							"id": "3c3ea0ac-2902-4c7c-a0ba-cf5daef5cc38",
							"tasks": [],
							"source": {
									"type": "IBV"
							},
							"created_at": "2023-04-05T10:17:58Z",
							"last_updated": "2023-04-05T10:18:06Z",
							"image": {
									"media": {
											"id": "5b77cd1f-a15a-4748-ba5c-92913be6974d",
											"type": "IMAGE",
											"created": "2023-04-05T10:18:06Z",
											"last_updated": "2023-04-05T10:18:06Z"
									}
							}
					}
			],
			"applicant_profiles": [
					{
							"id": "88eb9e0b-acd8-4f49-940b-89740d649508",
							"tasks": [],
							"source": {
									"type": "RELYING_BUSINESS"
							},
							"created_at": "2023-04-05T08:13:56Z",
							"last_updated": "2023-04-05T08:13:56Z",
							"media": {
									"id": "119b8fb5-626d-43ad-9a09-450c1580d9e1",
									"type": "JSON",
									"created": "2023-04-05T08:13:56Z",
									"last_updated": "2023-04-05T08:13:56Z"
							}
					}
			]
	},
	"checks": [
			{
					"type": "ID_DOCUMENT_AUTHENTICITY",
					"id": "0a3f07a4-def6-4d62-bc99-9893459c1bfb",
					"state": "DONE",
					"resources_used": [
							"355e9f80-6f2a-470c-a72e-e13c7417fb9a"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": [
									{
											"sub_check": "document_in_date",
											"result": "PASS",
											"details": []
									},
									{
											"sub_check": "fraud_list_check",
											"result": "PASS",
											"details": []
									},
									{
											"sub_check": "hologram",
											"result": "PASS",
											"details": []
									},
									{
											"sub_check": "hologram_movement",
											"result": "PASS",
											"details": []
									},
									{
											"sub_check": "mrz_validation",
											"result": "PASS",
											"details": []
									},
									{
											"sub_check": "no_sign_of_forgery",
											"result": "PASS",
											"details": []
									},
									{
											"sub_check": "no_sign_of_tampering",
											"result": "PASS",
											"details": []
									},
									{
											"sub_check": "ocr_mrz_comparison",
											"result": "PASS",
											"details": []
									},
									{
											"sub_check": "other_security_features",
											"result": "PASS",
											"details": []
									},
									{
											"sub_check": "physical_document_captured",
											"result": "PASS",
											"details": []
									},
									{
											"sub_check": "yoti_fraud_list_check",
											"result": "FAIL",
											"details": [
													{
															"name": "provider_org",
															"value": "Yoti Ltd"
													}
											]
									}
							]
					},
					"created": "2023-04-05T10:18:16Z",
					"last_updated": "2023-04-05T10:18:38Z"
			},
			{
					"type": "ID_DOCUMENT_FACE_MATCH",
					"id": "b8020135-612a-431b-a457-76d4a9959918",
					"state": "DONE",
					"resources_used": [
							"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
							"3c3ea0ac-2902-4c7c-a0ba-cf5daef5cc38"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": [
									{
											"sub_check": "ai_face_match",
											"result": "PASS",
											"details": [
													{
															"name": "confidence_score",
															"value": "0.20"
													}
											]
									},
									{
										"sub_check": "manual_face_match",
										"result": "PASS",
										"details": []
								}
							]
					},
					"created": "2023-04-05T10:18:16Z",
					"last_updated": "2023-04-05T10:37:19Z"
			},
			{
					"type": "IBV_VISUAL_REVIEW_CHECK",
					"id": "d3304228-a7f3-4b33-92aa-569209de8a0a",
					"state": "DONE",
					"resources_used": [
							"355e9f80-6f2a-470c-a72e-e13c7417fb9a"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-04-05T10:18:16Z",
					"last_updated": "2023-04-05T10:18:16Z"
			},
			{
					"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
					"id": "f19eba50-0cf6-434a-8592-9f0d97141495",
					"state": "DONE",
					"resources_used": [
							"355e9f80-6f2a-470c-a72e-e13c7417fb9a"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-04-05T10:18:16Z",
					"last_updated": "2023-04-05T10:18:16Z",
					"scheme": "UK_GDS"
			},
			{
					"type": "PROFILE_DOCUMENT_MATCH",
					"id": "424a95ff-7ef6-4db4-b721-cb94fb4aed70",
					"state": "DONE",
					"resources_used": [
							"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
							"88eb9e0b-acd8-4f49-940b-89740d649508"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-04-05T10:18:16Z",
					"last_updated": "2023-04-05T10:18:16Z"
			}
	],
	"user_tracking_id": "some_id"
}