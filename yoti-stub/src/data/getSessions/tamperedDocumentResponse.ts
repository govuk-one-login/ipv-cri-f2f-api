export const TAMPERED_DOCUMENT_RESPONSE = {
	"client_session_token_ttl": 2129173,
	"session_id": "2141c928-c70b-481c-b459-750582b329a1",
	"state": "COMPLETED",
	"resources": {
			"id_documents": [
					{
							"id": "23e65c13-539e-4c58-8b5f-2565f34c641c",
							"tasks": [
									{
											"type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
											"id": "c3d3de05-1e97-4882-8d4b-6fcc42250ae5",
											"state": "DONE",
											"created": "2023-04-12T08:30:51Z",
											"last_updated": "2023-04-12T08:32:05Z",
											"generated_checks": [],
											"generated_media": [
													{
															"id": "631423b2-cef7-499a-ad79-a0ad7390f146",
															"type": "JSON"
													}
											]
									}
							],
							"source": {
									"type": "IBV"
							},
							"created_at": "2023-04-12T08:30:51Z",
							"last_updated": "2023-04-12T08:32:05Z",
							"document_type": "PASSPORT",
							"issuing_country": "GBR",
							"pages": [
									{
											"capture_method": "CAMERA",
											"media": {
													"id": "213441d4-c7e3-431f-8de4-593df6aa64c9",
													"type": "IMAGE",
													"created": "2023-04-12T08:31:55Z",
													"last_updated": "2023-04-12T08:31:55Z"
											},
											"frames": [
													{
															"media": {
																	"id": "f9d32ddf-3bb3-4f9f-b629-907ca7c98fd9",
																	"type": "IMAGE",
																	"created": "2023-04-12T08:31:57Z",
																	"last_updated": "2023-04-12T08:31:57Z"
															}
													},
													{
															"media": {
																	"id": "960f8059-8041-4a0b-9848-3c8246f2f9cf",
																	"type": "IMAGE",
																	"created": "2023-04-12T08:31:59Z",
																	"last_updated": "2023-04-12T08:31:59Z"
															}
													},
													{
															"media": {
																	"id": "8ea5b69c-b740-4d4e-a943-025563c65e59",
																	"type": "IMAGE",
																	"created": "2023-04-12T08:32:01Z",
																	"last_updated": "2023-04-12T08:32:01Z"
															}
													}
											]
									}
							],
							"document_fields": {
									"media": {
											"id": "631423b2-cef7-499a-ad79-a0ad7390f146",
											"type": "JSON",
											"created": "2023-04-12T08:32:04Z",
											"last_updated": "2023-04-12T08:32:04Z"
									}
							},
							"document_id_photo": {
									"media": {
											"id": "2edbba3e-dedb-4240-a900-883f3f32b323",
											"type": "IMAGE",
											"created": "2023-04-12T08:32:04Z",
											"last_updated": "2023-04-12T08:32:04Z"
									}
							}
					}
			],
			"supplementary_documents": [],
			"liveness_capture": [],
			"face_capture": [
					{
							"id": "7298d724-2355-4f4b-b372-48bb831d3c1a",
							"tasks": [],
							"source": {
									"type": "IBV"
							},
							"created_at": "2023-04-12T08:32:20Z",
							"last_updated": "2023-04-12T08:32:36Z",
							"image": {
									"media": {
											"id": "92df358a-6eae-4749-ab27-a3b7c0837aba",
											"type": "IMAGE",
											"created": "2023-04-12T08:32:36Z",
											"last_updated": "2023-04-12T08:32:36Z"
									}
							}
					}
			],
			"applicant_profiles": [
					{
							"id": "a8f01d2e-69ac-44d3-8c02-7f2284774edf",
							"tasks": [],
							"source": {
									"type": "RELYING_BUSINESS"
							},
							"created_at": "2023-04-12T08:28:42Z",
							"last_updated": "2023-04-12T08:28:42Z",
							"media": {
									"id": "6afe585b-ab58-4c0b-ab0a-9a24294d017d",
									"type": "JSON",
									"created": "2023-04-12T08:28:42Z",
									"last_updated": "2023-04-12T08:28:42Z"
							}
					}
			]
	},
	"checks": [
			{
					"type": "ID_DOCUMENT_AUTHENTICITY",
					"id": "c54dcc18-8047-42cf-ae79-ab3e8f47a7fb",
					"state": "DONE",
					"resources_used": [
							"23e65c13-539e-4c58-8b5f-2565f34c641c"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "REJECT",
									"reason": "TAMPERED"
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
											"result": "FAIL",
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
											"result": "FAIL",
											"details": [
													{
															"name": "face_photo_integrity",
															"value": "PASS"
													},
													{
															"name": "data_integrity",
															"value": "FAIL"
													}
											]
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
									}
							]
					},
					"created": "2023-04-12T08:32:43Z",
					"last_updated": "2023-04-12T08:33:32Z"
			},
			{
					"type": "ID_DOCUMENT_FACE_MATCH",
					"id": "f12e619c-246d-4202-a064-8900f6abfc85",
					"state": "DONE",
					"resources_used": [
							"23e65c13-539e-4c58-8b5f-2565f34c641c",
							"7298d724-2355-4f4b-b372-48bb831d3c1a"
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
											"details": []
									},
									{
											"sub_check": "manual_face_match",
											"result": "PASS",
											"details": []
									}
							]
					},
					"created": "2023-04-12T08:32:43Z",
					"last_updated": "2023-04-12T08:33:09Z"
			},
			{
					"type": "IBV_VISUAL_REVIEW_CHECK",
					"id": "074ffc81-3907-4b49-85f3-ba0cde2e72b9",
					"state": "DONE",
					"resources_used": [
							"23e65c13-539e-4c58-8b5f-2565f34c641c"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-04-12T08:32:43Z",
					"last_updated": "2023-04-12T08:32:43Z"
			},
			{
					"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
					"id": "5c5ce36a-ca1b-4372-8961-1232aee4e219",
					"state": "DONE",
					"resources_used": [
							"23e65c13-539e-4c58-8b5f-2565f34c641c"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-04-12T08:32:43Z",
					"last_updated": "2023-04-12T08:32:43Z",
					"scheme": "UK_GDS"
			},
			{
					"type": "PROFILE_DOCUMENT_MATCH",
					"id": "1d3b473d-25de-443e-99b7-5db932d2457e",
					"state": "DONE",
					"resources_used": [
							"23e65c13-539e-4c58-8b5f-2565f34c641c",
							"a8f01d2e-69ac-44d3-8c02-7f2284774edf"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-04-12T08:32:43Z",
					"last_updated": "2023-04-12T08:32:43Z"
			}
	],
	"user_tracking_id": "some_id2"
}