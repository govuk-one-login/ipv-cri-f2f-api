export const AI_FAIL_MANUAL_FAIL = {
	"client_session_token_ttl": 1931768,
	"session_id": "05ee9da4-988f-4122-adb1-be1b4909a8de",
	"state": "COMPLETED",
	"resources": {
			"id_documents": [
					{
							"id": "726d7390-7015-4f75-8591-1975250fdc95",
							"tasks": [
									{
											"type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
											"id": "c041ae98-21fe-4d29-bfe7-82b89b604244",
											"state": "DONE",
											"created": "2023-04-14T15:20:48Z",
											"last_updated": "2023-04-14T15:22:09Z",
											"generated_checks": [],
											"generated_media": [
													{
															"id": "99409c16-6d94-4278-aafc-db94813666cf",
															"type": "JSON"
													}
											]
									}
							],
							"source": {
									"type": "IBV"
							},
							"created_at": "2023-04-14T15:20:48Z",
							"last_updated": "2023-04-14T15:22:09Z",
							"document_type": "PASSPORT",
							"issuing_country": "GBR",
							"pages": [
									{
											"capture_method": "CAMERA",
											"media": {
													"id": "40e8efe8-b619-4f1c-912c-f328e004c5b0",
													"type": "IMAGE",
													"created": "2023-04-14T15:21:58Z",
													"last_updated": "2023-04-14T15:21:58Z"
											},
											"frames": [
													{
															"media": {
																	"id": "7d4f4fdb-e2c8-4da3-9032-e94b642d0d79",
																	"type": "IMAGE",
																	"created": "2023-04-14T15:22:00Z",
																	"last_updated": "2023-04-14T15:22:00Z"
															}
													},
													{
															"media": {
																	"id": "a731229f-61ee-444b-b470-b7ab4f68b957",
																	"type": "IMAGE",
																	"created": "2023-04-14T15:22:01Z",
																	"last_updated": "2023-04-14T15:22:01Z"
															}
													},
													{
															"media": {
																	"id": "f41e5b01-9c1c-43be-baf3-dc69b17ba487",
																	"type": "IMAGE",
																	"created": "2023-04-14T15:22:03Z",
																	"last_updated": "2023-04-14T15:22:03Z"
															}
													}
											]
									}
							],
							"document_fields": {
									"media": {
											"id": "99409c16-6d94-4278-aafc-db94813666cf",
											"type": "JSON",
											"created": "2023-04-14T15:22:09Z",
											"last_updated": "2023-04-14T15:22:09Z"
									}
							},
							"document_id_photo": {
									"media": {
											"id": "965565d4-b04b-4c38-99b8-c1e5cf11286d",
											"type": "IMAGE",
											"created": "2023-04-14T15:22:09Z",
											"last_updated": "2023-04-14T15:22:09Z"
									}
							}
					}
			],
			"supplementary_documents": [],
			"liveness_capture": [],
			"face_capture": [
					{
							"id": "5caf2460-4b01-4bef-a590-990ecdbb6934",
							"tasks": [],
							"source": {
									"type": "IBV"
							},
							"created_at": "2023-04-14T15:22:14Z",
							"last_updated": "2023-04-14T15:22:20Z",
							"image": {
									"media": {
											"id": "570fe4d8-4964-4da5-94f7-ddb5f49521c3",
											"type": "IMAGE",
											"created": "2023-04-14T15:22:20Z",
											"last_updated": "2023-04-14T15:22:20Z"
									}
							}
					}
			],
			"applicant_profiles": [
					{
							"id": "526e469d-7842-4701-8d5d-eeb5486a6ab6",
							"tasks": [],
							"source": {
									"type": "RELYING_BUSINESS"
							},
							"created_at": "2023-04-14T15:19:38Z",
							"last_updated": "2023-04-14T15:19:38Z",
							"media": {
									"id": "b67d165b-eaf7-4936-9612-71c113d717b9",
									"type": "JSON",
									"created": "2023-04-14T15:19:38Z",
									"last_updated": "2023-04-14T15:19:38Z"
							}
					}
			]
	},
	"checks": [
			{
					"type": "ID_DOCUMENT_AUTHENTICITY",
					"id": "149b2100-481d-4e59-90ae-f0fe58ff9539",
					"state": "DONE",
					"resources_used": [
							"726d7390-7015-4f75-8591-1975250fdc95"
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
											"sub_check": "mrz_validation",
											"result": "PASS",
											"details": [],
											"process": "EXPERT_REVIEW"
									},
									{
											"sub_check": "ocr_mrz_comparison",
											"result": "PASS",
											"details": [],
											"process": "EXPERT_REVIEW"
									}
							]
					},
					"created": "2023-04-14T15:22:27Z",
					"last_updated": "2023-04-14T15:22:28Z"
			},
			{
					"type": "ID_DOCUMENT_FACE_MATCH",
					"id": "e737bc6a-1d44-4d83-80c2-14af2446a6e1",
					"state": "DONE",
					"resources_used": [
							"726d7390-7015-4f75-8591-1975250fdc95",
							"5caf2460-4b01-4bef-a590-990ecdbb6934"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "REJECT",
									"reason": "DIFFERENT_PERSON"
							},
							"breakdown": [
									{
											"sub_check": "ai_face_match",
											"result": "FAIL",
											"details": [
													{
															"name": "confidence_score",
															"value": "0.20"
													}
											],
											"process": "EXPERT_REVIEW"
									},
									{
											"sub_check": "manual_face_match",
											"result": "FAIL",
											"details": []
									}
							]
					},
					"created": "2023-04-14T15:22:27Z",
					"last_updated": "2023-04-14T15:23:41Z"
			},
			{
					"type": "IBV_VISUAL_REVIEW_CHECK",
					"id": "4cfd4917-b159-4eb4-8c98-24f8ac471357",
					"state": "DONE",
					"resources_used": [
							"726d7390-7015-4f75-8591-1975250fdc95"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-04-14T15:22:26Z",
					"last_updated": "2023-04-14T15:22:26Z"
			},
			{
					"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
					"id": "8f0d8191-1dc7-4fac-9f5a-018947d46122",
					"state": "DONE",
					"resources_used": [
							"726d7390-7015-4f75-8591-1975250fdc95"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-04-14T15:22:26Z",
					"last_updated": "2023-04-14T15:22:26Z",
					"scheme": "UK_GDS"
			},
			{
					"type": "PROFILE_DOCUMENT_MATCH",
					"id": "9343973a-c037-4040-a70f-cbde8ecced5a",
					"state": "DONE",
					"resources_used": [
							"726d7390-7015-4f75-8591-1975250fdc95",
							"526e469d-7842-4701-8d5d-eeb5486a6ab6"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-04-14T15:22:26Z",
					"last_updated": "2023-04-14T15:22:26Z"
			}
	],
	"user_tracking_id": "some_id2"
}