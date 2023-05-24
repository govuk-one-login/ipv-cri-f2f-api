export const EXPIRED_PASSPORT_RESPONSE = {
	"client_session_token_ttl": 1167393,
	"session_id": "3ea21e56-79a4-42bc-8078-5ab3d98b6dab",
	"state": "COMPLETED",
	"resources": {
			"id_documents": [
					{
							"id": "3fbf6c69-3d07-434f-ab5e-79d62010d280",
							"tasks": [
									{
											"type": "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
											"id": "79a0a09e-3f9a-4112-a2f3-bec11bcb0fef",
											"state": "DONE",
											"created": "2023-05-23T11:06:20Z",
											"last_updated": "2023-05-23T11:08:57Z",
											"generated_checks": [],
											"generated_media": [
													{
															"id": "17c32c5e-c38d-40dd-8af7-0df2908b4045",
															"type": "JSON"
													}
											]
									}
							],
							"source": {
									"type": "IBV"
							},
							"created_at": "2023-05-23T11:06:20Z",
							"last_updated": "2023-05-23T11:08:57Z",
							"document_type": "PASSPORT",
							"issuing_country": "GBR",
							"pages": [
									{
											"capture_method": "CAMERA",
											"media": {
													"id": "9b659dc5-690c-4dc7-84a7-808b8bb3751e",
													"type": "IMAGE",
													"created": "2023-05-23T11:08:44Z",
													"last_updated": "2023-05-23T11:08:44Z"
											},
											"frames": [
													{
															"media": {
																	"id": "1a78325f-333d-48f6-bece-d3af7d649f77",
																	"type": "IMAGE",
																	"created": "2023-05-23T11:08:46Z",
																	"last_updated": "2023-05-23T11:08:46Z"
															}
													},
													{
															"media": {
																	"id": "ca521174-284d-4185-af8b-133d3be201fb",
																	"type": "IMAGE",
																	"created": "2023-05-23T11:08:49Z",
																	"last_updated": "2023-05-23T11:08:49Z"
															}
													},
													{
															"media": {
																	"id": "1e21fafc-ab95-445b-a15e-0ae649878027",
																	"type": "IMAGE",
																	"created": "2023-05-23T11:08:52Z",
																	"last_updated": "2023-05-23T11:08:52Z"
															}
													}
											]
									}
							],
							"document_fields": {
									"media": {
											"id": "17c32c5e-c38d-40dd-8af7-0df2908b4045",
											"type": "JSON",
											"created": "2023-05-23T11:08:57Z",
											"last_updated": "2023-05-23T11:08:57Z"
									}
							},
							"document_id_photo": {
									"media": {
											"id": "eb27d913-57fd-40b6-8a2b-d5cbcd0e27ed",
											"type": "IMAGE",
											"created": "2023-05-23T11:08:57Z",
											"last_updated": "2023-05-23T11:08:57Z"
									}
							}
					}
			],
			"supplementary_documents": [],
			"liveness_capture": [],
			"face_capture": [
					{
							"id": "e85766df-f382-46f1-a85e-bcb7dffdd32f",
							"tasks": [],
							"source": {
									"type": "IBV"
							},
							"created_at": "2023-05-23T11:09:07Z",
							"last_updated": "2023-05-23T11:09:14Z",
							"image": {
									"media": {
											"id": "23fe7781-b574-40bb-88b1-c5637e539049",
											"type": "IMAGE",
											"created": "2023-05-23T11:09:14Z",
											"last_updated": "2023-05-23T11:09:14Z"
									}
							}
					}
			],
			"applicant_profiles": [
					{
							"id": "f78ead5c-7549-40d4-bb45-0cfa69417065",
							"tasks": [],
							"source": {
									"type": "RELYING_BUSINESS"
							},
							"created_at": "2023-05-23T11:03:28Z",
							"last_updated": "2023-05-23T11:03:28Z",
							"media": {
									"id": "3a316fb0-6b20-40ec-80c7-3426cf8adeb7",
									"type": "JSON",
									"created": "2023-05-23T11:03:28Z",
									"last_updated": "2023-05-23T11:03:28Z"
							}
					}
			]
	},
	"checks": [
			{
					"type": "ID_DOCUMENT_AUTHENTICITY",
					"id": "e4582663-432f-4c29-8247-99efbe1421f7",
					"state": "DONE",
					"resources_used": [
							"3fbf6c69-3d07-434f-ab5e-79d62010d280"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": [
									{
											"sub_check": "document_in_date",
											"result": "FAIL",
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
									}
							]
					},
					"created": "2023-05-23T11:09:26Z",
					"last_updated": "2023-05-23T11:21:44Z"
			},
			{
					"type": "ID_DOCUMENT_FACE_MATCH",
					"id": "df6d4b38-2c75-4aee-9e61-024b67652264",
					"state": "DONE",
					"resources_used": [
							"3fbf6c69-3d07-434f-ab5e-79d62010d280",
							"e85766df-f382-46f1-a85e-bcb7dffdd32f"
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
															"value": "0.99"
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
					"created": "2023-05-23T11:09:26Z",
					"last_updated": "2023-05-23T11:21:17Z"
			},
			{
					"type": "IBV_VISUAL_REVIEW_CHECK",
					"id": "2d43d759-7f32-42d2-bca8-b9e4fd31102a",
					"state": "DONE",
					"resources_used": [
							"3fbf6c69-3d07-434f-ab5e-79d62010d280"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-05-23T11:09:26Z",
					"last_updated": "2023-05-23T11:09:26Z"
			},
			{
					"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
					"id": "091627ef-f385-4cef-9a91-05836d8dd200",
					"state": "DONE",
					"resources_used": [
							"3fbf6c69-3d07-434f-ab5e-79d62010d280"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-05-23T11:09:26Z",
					"last_updated": "2023-05-23T11:09:26Z",
					"scheme": "UK_GDS"
			},
			{
					"type": "PROFILE_DOCUMENT_MATCH",
					"id": "0538c4e9-bf96-4e48-a56a-9eb88d1f8e7a",
					"state": "DONE",
					"resources_used": [
							"3fbf6c69-3d07-434f-ab5e-79d62010d280",
							"f78ead5c-7549-40d4-bb45-0cfa69417065"
					],
					"generated_media": [],
					"report": {
							"recommendation": {
									"value": "APPROVE"
							},
							"breakdown": []
					},
					"created": "2023-05-23T11:09:26Z",
					"last_updated": "2023-05-23T11:09:26Z"
			}
	],
	"user_tracking_id": "some_id"
}