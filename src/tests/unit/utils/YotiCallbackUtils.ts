import { YotiCompletedSession } from "../../../models/YotiPayloads";

export function getCompletedYotiSession(): YotiCompletedSession {
	const completedYotiSession: YotiCompletedSession = {
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
									"type": "JSON",
								},
							],
						},
					],
					"source": {
						"type": "IBV",
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
								"last_updated": "2023-04-05T10:13:50Z",
							},
							"frames": [
								{
									"media": {
										"id": "5e7cee77-3718-4a99-a8b8-eb2f8969449a",
										"type": "IMAGE",
										"created": "2023-04-05T10:13:52Z",
										"last_updated": "2023-04-05T10:13:52Z",
									},
								},
								{
									"media": {
										"id": "82f2b1db-9bef-4a0a-ad6c-622da80b0894",
										"type": "IMAGE",
										"created": "2023-04-05T10:13:54Z",
										"last_updated": "2023-04-05T10:13:54Z",
									},
								},
								{
									"media": {
										"id": "df322a12-ce9b-4790-bf96-810b84982129",
										"type": "IMAGE",
										"created": "2023-04-05T10:13:56Z",
										"last_updated": "2023-04-05T10:13:56Z",
									},
								},
							],
						},
					],
					"document_fields": {
						"media": {
							"id": "6b9efa9d-4968-4f5d-8536-377008526b26",
							"type": "JSON",
							"created": "2023-04-05T10:14:02Z",
							"last_updated": "2023-04-05T10:14:02Z",
						},
					},
					"document_id_photo": {
						"media": {
							"id": "2c4b59e8-fb68-4c7c-ac35-edac5cafa687",
							"type": "IMAGE",
							"created": "2023-04-05T10:14:02Z",
							"last_updated": "2023-04-05T10:14:02Z",
						},
					},
				},
			],
			"supplementary_documents": [],
			"liveness_capture": [],
			"face_capture": [
				{
					"id": "3c3ea0ac-2902-4c7c-a0ba-cf5daef5cc38",
					"tasks": [],
					"source": {
						"type": "IBV",
					},
					"created_at": "2023-04-05T10:17:58Z",
					"last_updated": "2023-04-05T10:18:06Z",
					"image": {
						"media": {
							"id": "5b77cd1f-a15a-4748-ba5c-92913be6974d",
							"type": "IMAGE",
							"created": "2023-04-05T10:18:06Z",
							"last_updated": "2023-04-05T10:18:06Z",
						},
					},
				},
			],
			"applicant_profiles": [
				{
					"id": "88eb9e0b-acd8-4f49-940b-89740d649508",
					"tasks": [],
					"source": {
						"type": "RELYING_BUSINESS",
					},
					"created_at": "2023-04-05T08:13:56Z",
					"last_updated": "2023-04-05T08:13:56Z",
					"media": {
						"id": "119b8fb5-626d-43ad-9a09-450c1580d9e1",
						"type": "JSON",
						"created": "2023-04-05T08:13:56Z",
						"last_updated": "2023-04-05T08:13:56Z",
					},
				},
			],
		},
		"checks": [
			{
				"type": "ID_DOCUMENT_AUTHENTICITY",
				"id": "0a3f07a4-def6-4d62-bc99-9893459c1bfb",
				"state": "DONE",
				"resources_used": [
					"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
				],
				"generated_media": [],
				"report": {
					"recommendation": {
						"value": "APPROVE",
					},
					"breakdown": [
						{
							"sub_check": "document_in_date",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "fraud_list_check",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "hologram",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "hologram_movement",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "mrz_validation",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "no_sign_of_forgery",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "no_sign_of_tampering",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "ocr_mrz_comparison",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "other_security_features",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "physical_document_captured",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "yoti_fraud_list_check",
							"result": "FAIL",
							"details": [
								{
									"name": "provider_org",
									"value": "Yoti Ltd",
								},
							],
						},
					],
				},
				"created": "2023-04-05T10:18:16Z",
				"last_updated": "2023-04-05T10:18:38Z",
			},
			{
				"type": "ID_DOCUMENT_FACE_MATCH",
				"id": "b8020135-612a-431b-a457-76d4a9959918",
				"state": "DONE",
				"resources_used": [
					"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
					"3c3ea0ac-2902-4c7c-a0ba-cf5daef5cc38",
				],
				"generated_media": [],
				"report": {
					"recommendation": {
						"value": "APPROVE",
					},
					"breakdown": [
						{
							"sub_check": "ai_face_match",
							"result": "PASS",
							"details": [
								{
									"name": "confidence_score",
									"value": "0.99",
								},
							],
						},
						{
							"sub_check": "manual_face_match",
							"result": "PASS",
							"details": [],
						},
						{
							"sub_check": "yoti_fraud_list_check",
							"result": "FAIL",
							"details": [
								{
									"name": "provider_org",
									"value": "Yoti Ltd",
								},
							],
						},
					],
				},
				"created": "2023-04-05T10:18:16Z",
				"last_updated": "2023-04-05T10:37:19Z",
			},
			{
				"type": "IBV_VISUAL_REVIEW_CHECK",
				"id": "d3304228-a7f3-4b33-92aa-569209de8a0a",
				"state": "DONE",
				"resources_used": [
					"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
				],
				"generated_media": [],
				"report": {
					"recommendation": {
						"value": "APPROVE",
					},
					"breakdown": [],
				},
				"created": "2023-04-05T10:18:16Z",
				"last_updated": "2023-04-05T10:18:16Z",
			},
			{
				"type": "DOCUMENT_SCHEME_VALIDITY_CHECK",
				"id": "f19eba50-0cf6-434a-8592-9f0d97141495",
				"state": "DONE",
				"resources_used": [
					"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
				],
				"generated_media": [],
				"report": {
					"recommendation": {
						"value": "APPROVE",
					},
					"breakdown": [],
				},
				"created": "2023-04-05T10:18:16Z",
				"last_updated": "2023-04-05T10:18:16Z",
				"scheme": "UK_DBS",
			},
			{
				"type": "PROFILE_DOCUMENT_MATCH",
				"id": "424a95ff-7ef6-4db4-b721-cb94fb4aed70",
				"state": "DONE",
				"resources_used": [
					"355e9f80-6f2a-470c-a72e-e13c7417fb9a",
					"88eb9e0b-acd8-4f49-940b-89740d649508",
				],
				"generated_media": [],
				"report": {
					"recommendation": {
						"value": "APPROVE",
					},
					"breakdown": [],
				},
				"created": "2023-04-05T10:18:16Z",
				"last_updated": "2023-04-05T10:18:16Z",
			},
		],
		"user_tracking_id": "some_id",
	};
	return completedYotiSession;
}

export function getDocumentFields(): any {
	const documentFields = {
		"full_name": "ANGELA ZOE UK SPECIMEN",
		"date_of_birth": "1988-12-04",
		"nationality": "GBR",
		"given_names": "ANGELA ZOE",
		"family_name": "UK SPECIMEN",
		"place_of_birth": "CROYDON",
		"gender": "FEMALE",
		"document_type": "PASSPORT",
		"issuing_country": "GBR",
		"document_number": "533401372",
		"expiration_date": "2025-09-28",
		"date_of_issue": "2015-09-28",
		"issuing_authority": "HMPO",
		"mrz": {
			"type": 2,
			"line1": "P<GBRUK<SPECIMEN<<ANGELA<ZOE<<<<<<<<<<<<<<<<",
			"line2": "5334013720GBR8812049F2509286<<<<<<<<<<<<<<00",
		},
	};
	return documentFields;
}

export function getDrivingPermitFields(): any {
	const documentFields = {
		"full_name": "LEEROY JENKINS",
		"date_of_birth": "1988-12-04",
		"given_names": "LEEROY",
		"family_name": "JENKINS",
		"place_of_birth": "UNITED KINGDOM",
		"gender": "MALE",
		"structured_postal_address": {
			"address_format": 1,
			"building_number": "122",
			"address_line1": "122 BURNS CRESCENT",
			"address_line2": "EDINBURGH",
			"address_line3": "EH1 9GP",
			"town_city": "STORMWIND",
			"postal_code": "EH1 9GP",
			"country_iso": "GBR",
			"country": "United Kingdom",
			"formatted_address": "122 BURNS CRESCENT\nStormwind\nEH1 9GP",
		},
		"document_type": "DRIVING_LICENCE",
		"issuing_country": "GBR",
		"document_number": "LJENK533401372",
		"expiration_date": "2025-09-28",
		"date_of_issue": "2015-09-28",
		"issuing_authority": "DVLA",
	};
	return documentFields;
}

export function getEuDrivingPermitFields(): any {
	const documentFields = {
		"full_name": "Erika - Mustermann",
		"date_of_birth": "1988-12-04",
		"given_names": "Erika -",
		"family_name": "Mustermann",
		"place_of_birth": "Berlin",
		"document_type": "DRIVING_LICENCE",
		"issuing_country": "DEU",
		"document_number": "Z021AB37X13",
		"expiration_date": "2036-03-19",
		"date_of_issue": "2021-03-20",
		"place_of_issue": "Landratsamt Mu sterhausen amSee",
	};
	return documentFields;
}

export function getEeaIdCardFields(): any {
	const documentFields = {
		"full_name": "Wiieke Liselotte De Bruijn",
		"date_of_birth": "1988-12-04",
		"given_names": "Wiieke Liselotte",
		"family_name": "De Bruijn",
		"document_type": "NATIONAL_ID",
		"issuing_country": "NLD",
		"document_number": "SPEC12031",
		"expiration_date": "2031-08-02",
		"date_of_issue": "2021-08-02",
	};
	return documentFields;
}

export function getBrpFields(): any {
	const documentFields = {
		"full_name": "TECH REFRESH ICTHREEMALE",
		"date_of_birth": "1988-12-04",
		"nationality": "KEN",
		"given_names": "TECH REFRESH",
		"family_name": "ICTHREEMALE",
		"place_of_birth": "NAIROBI",
		"gender": "MALE",
		"document_type": "RESIDENCE_PERMIT",
		"issuing_country": "GBR",
		"document_number": "RF9082242",
		"expiration_date": "2024-11-11",
		"date_of_issue": "2015-05-19",
		"mrz": {
			"type": 1,
			"line1": "IRGBRRF90822427<<<<<<<<<<<<<<<",
			"line2": "9008010M1511114KEN<<<<<<<<<<<8",
			"line3": "ICTHREEMALE<<TECH<REFRESH<<<<<",
		},
		"place_of_issue": "UK",
	};
	return documentFields;
}
