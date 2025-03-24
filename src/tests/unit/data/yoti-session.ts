export const authenticityCheck = {
	type: "ID_DOCUMENT_AUTHENTICITY",
	id: "1b97f98a-7ec8-49b4-8054-719592f04db3",
	state: "DONE",
	resources_used: ["b2a71a45-3c5a-4a6c-9246-c05356f6260c"],
	generated_media: [],
	report: {
		recommendation: {
			value: "APPROVE",
		},
		breakdown: [
			{
				sub_check: "chip_csca_trusted",
				result: "PASS",
				details: [],
				process: "AUTOMATED",
			},
			{
				sub_check: "chip_data_integrity",
				result: "PASS",
				details: [],
				process: "AUTOMATED",
			},
			{
				sub_check: "chip_digital_signature_verification",
				result: "PASS",
				details: [],
				process: "AUTOMATED",
			},
			{
				sub_check: "chip_parse",
				result: "PASS",
				details: [],
				process: "AUTOMATED",
			},
			{
				sub_check: "chip_sod_parse",
				result: "PASS",
				details: [],
				process: "AUTOMATED",
			},
			{
				sub_check: "document_in_date",
				result: "PASS",
				details: [],
				process: "AUTOMATED",
			},
			{
				sub_check: "fraud_list_check",
				result: "PASS",
				details: [],
				process: "AUTOMATED",
			},
			{
				sub_check: "mrz_validation",
				result: "PASS",
				details: [],
				process: "AUTOMATED",
			},
			{
				sub_check: "ocr_mrz_comparison",
				result: "PASS",
				details: [],
				process: "AUTOMATED",
			},
		],
	},
	created: "2023-04-11T10:19:29Z",
	last_updated: "2023-04-11T10:19:30Z",
};

export const mockFaceMatchCheck = {
	type: "ID_DOCUMENT_FACE_MATCH",
	id: "62d20daa-1c6f-4558-8381-2d9c7f8a73d5",
	state: "DONE",
	resources_used: ["b2a71a45-3c5a-4a6c-9246-c05356f6260c", "4b6eb8a9-882f-4ae4-a10f-26b57ff5a328"],
	generated_media: [],
	report: {
		recommendation: {
			value: "APPROVE",
		},
		breakdown: [
			{
				sub_check: "ai_face_match",
				result: "PASS",
				details: [
					{
						name: "confidence_score",
						value: "0.95",
					},
				],
				process: "AUTOMATED",
			},
		],
	},
	created: "2023-04-11T10:19:29Z",
	last_updated: "2023-04-11T10:19:31Z",
};

export const validityCheck = {
	type: "DOCUMENT_SCHEME_VALIDITY_CHECK",
	id: "24eb03f3-9768-42df-82bf-f3d26869e579",
	state: "DONE",
	resources_used: ["b2a71a45-3c5a-4a6c-9246-c05356f6260c"],
	generated_media: [],
	report: {
		recommendation: {
			value: "APPROVE",
		},
		breakdown: [],
	},
	created: "2023-04-11T10:19:29Z",
	last_updated: "2023-04-11T10:19:29Z",
	scheme: "UK_GDS",
};

export const profileMatchCheck = {
	type: "PROFILE_DOCUMENT_MATCH",
	id: "124211f6-f41c-435e-b6aa-33ba9153cbab",
	state: "DONE",
	resources_used: ["b2a71a45-3c5a-4a6c-9246-c05356f6260c", "a2c78800-fc3c-4104-808c-70de5285b916"],
	generated_media: [],
	report: {
		recommendation: {
			value: "APPROVE",
		},
		breakdown: [],
	},
	created: "2023-04-11T10:19:29Z",
	last_updated: "2023-04-11T10:19:29Z",
};

export const visualReviewCheck = {
	type: "IBV_VISUAL_REVIEW_CHECK",
	id: "7dce5f7f-6e63-4472-a77d-30fe4aaf142f",
	state: "DONE",
	resources_used: ["b2a71a45-3c5a-4a6c-9246-c05356f6260c"],
	generated_media: [],
	report: {
		recommendation: {
			value: "APPROVE",
		},
		breakdown: [],
	},
	created: "2023-04-11T10:19:29Z",
	last_updated: "2023-04-11T10:19:29Z",
};

export const mockCompletedYotiSessionPayload = {
	client_session_token_ttl: 2209195,
	session_id: "87a7b98e-b4d0-4670-9819-e5288642eddb",
	state: "COMPLETED",
	resources: {
		id_documents: [
			{
				id: "b2a71a45-3c5a-4a6c-9246-c05356f6260c",
				tasks: [
					{
						type: "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
						id: "a20bbcab-223b-433a-a9a7-2a347a29f6bb",
						state: "DONE",
						created: "2023-04-11T10:17:40Z",
						last_updated: "2023-04-11T10:18:37Z",
						generated_checks: [],
						generated_media: [
							{
								id: "01a7ac11-fe73-4991-b188-4914f2011d1a",
								type: "JSON",
							},
						],
					},
				],
				source: {
					type: "IBV",
				},
				created_at: "2023-04-11T10:17:40Z",
				last_updated: "2023-04-11T10:18:37Z",
				document_type: "PASSPORT",
				issuing_country: "GBR",
				pages: [
					{
						capture_method: "CAMERA",
						media: {
							id: "3f477902-e517-4ead-9131-3129fbb64845",
							type: "IMAGE",
							created: "2023-04-11T10:18:25Z",
							last_updated: "2023-04-11T10:18:25Z",
						},
						frames: [
							{
								media: {
									id: "b5fbda3b-b2be-48d6-b6a7-6120198519f0",
									type: "IMAGE",
									created: "2023-04-11T10:18:27Z",
									last_updated: "2023-04-11T10:18:27Z",
								},
							},
							{
								media: {
									id: "888b57a4-3fdc-47d1-9655-a5bc3114c179",
									type: "IMAGE",
									created: "2023-04-11T10:18:29Z",
									last_updated: "2023-04-11T10:18:29Z",
								},
							},
							{
								media: {
									id: "58c2fc48-ab4f-4737-a57b-f577e9964b69",
									type: "IMAGE",
									created: "2023-04-11T10:18:31Z",
									last_updated: "2023-04-11T10:18:31Z",
								},
							},
						],
					},
				],
				document_fields: {
					media: {
						id: "01a7ac11-fe73-4991-b188-4914f2011d1a",
						type: "JSON",
						created: "2023-04-11T10:18:36Z",
						last_updated: "2023-04-11T10:18:36Z",
					},
				},
				document_id_photo: {
					media: {
						id: "0f9a5e39-476d-48d3-9eb4-c66342a2916e",
						type: "IMAGE",
						created: "2023-04-11T10:18:36Z",
						last_updated: "2023-04-11T10:18:36Z",
					},
				},
			},
		],
		supplementary_documents: [],
		liveness_capture: [],
		face_capture: [
			{
				id: "4b6eb8a9-882f-4ae4-a10f-26b57ff5a328",
				tasks: [],
				source: {
					type: "IBV",
				},
				created_at: "2023-04-11T10:18:45Z",
				last_updated: "2023-04-11T10:19:16Z",
				image: {
					media: {
						id: "d8285306-7d47-47b9-b964-df2d668ba013",
						type: "IMAGE",
						created: "2023-04-11T10:19:16Z",
						last_updated: "2023-04-11T10:19:16Z",
					},
				},
			},
		],
		applicant_profiles: [
			{
				id: "a2c78800-fc3c-4104-808c-70de5285b916",
				tasks: [],
				source: {
					type: "RELYING_BUSINESS",
				},
				created_at: "2023-04-11T10:16:33Z",
				last_updated: "2023-04-11T10:16:33Z",
				media: {
					id: "1a30b3a4-83a1-4493-a796-1dd000041cb5",
					type: "JSON",
					created: "2023-04-11T10:16:33Z",
					last_updated: "2023-04-11T10:16:33Z",
				},
			},
		],
	},
	checks: [authenticityCheck, mockFaceMatchCheck, visualReviewCheck, validityCheck, profileMatchCheck],
	user_tracking_id: "some_id2",
};

export const mockYotiSessionItemBST = {
	client_session_token_ttl: 2453254,
	session_id: "99ce0305-444e-4793-b1a2-36cac84e7a07",
	state: "ONGOING",
	resources: {
		id_documents: [
			{
				id: "c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
				tasks: [
					{
						type: "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
						id: "5e557551-51fc-49b8-9f2e-32da31cba8fd",
						state: "DONE",
						created: "2023-09-07T14:30:37Z",
						last_updated: "2023-09-07T14:31:16Z",
						generated_checks: [],
						generated_media: [
							{
								id: "e8841901-44fb-42b2-b6b8-88937a106d65",
								type: "JSON",
							},
						],
					},
				],
				source: {
					type: "IBV",
				},
				created_at: "2023-09-07T14:30:37Z",
				last_updated: "2023-09-07T14:31:16Z",
				document_type: "PASSPORT",
				issuing_country: "GBR",
				pages: [
					{
						capture_method: "CAMERA",
						media: {
							id: "3a5441af-da2b-4b9e-b2e3-db9c55e780e8",
							type: "IMAGE",
							created: "2023-09-07T14:31:07Z",
							last_updated: "2023-09-07T14:31:07Z",
						},
						frames: [
							{
								media: {
									id: "c502725a-3f16-4a7d-95ee-48b56281fe81",
									type: "IMAGE",
									created: "2023-09-07T14:31:08Z",
									last_updated: "2023-09-07T14:31:08Z",
								},
							},
						],
					},
				],
				document_fields: {
					media: {
						id: "e8841901-44fb-42b2-b6b8-88937a106d65",
						type: "JSON",
						created: "2023-09-07T14:31:16Z",
						last_updated: "2023-09-07T14:31:16Z",
					},
				},
				document_id_photo: {
					media: {
						id: "99e0d324-4023-4b81-8414-ddd391bb13e4",
						type: "IMAGE",
						created: "2023-09-07T14:31:16Z",
						last_updated: "2023-09-07T14:31:16Z",
					},
				},
			},
		],
		supplementary_documents: [],
		liveness_capture: [],
		face_capture: [
			{
				id: "d068c3e3-9bde-4cf8-bc7f-fe68c06777ca",
				tasks: [],
				source: {
					type: "IBV",
				},
				created_at: "2023-09-07T14:31:49Z",
				last_updated: "2023-09-07T14:32:01Z",
				image: {
					media: {
						id: "914014a3-703a-4a9b-834f-aad505e95d02",
						type: "IMAGE",
						created: "2023-09-07T14:32:01Z",
						last_updated: "2023-09-07T14:32:01Z",
					},
				},
			},
		],
		applicant_profiles: [
			{
				id: "0da43bf8-fc60-4d4d-b846-cdfe8cc96f2b",
				tasks: [],
				source: {
					type: "RELYING_BUSINESS",
				},
				created_at: "2023-09-07T14:29:12Z",
				last_updated: "2023-09-07T14:29:12Z",
				media: {
					id: "e8f55883-0071-4b46-a1e8-610b279b8a15",
					type: "JSON",
					created: "2023-09-07T14:29:12Z",
					last_updated: "2023-09-07T14:29:12Z",
				},
			},
		],
	},
	checks: [
		{
			type: "ID_DOCUMENT_AUTHENTICITY",
			id: "e29b5645-7cd1-4f42-94d7-0a2c43283f4c",
			state: "PENDING",
			resources_used: [
				"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
			],
			generated_media: [],
			created: "2023-09-07T14:32:13Z",
			last_updated: "2023-09-07T14:32:13Z",
		},
		{
			type: "ID_DOCUMENT_FACE_MATCH",
			id: "f4799bad-7a34-41f9-8956-be9fb22f9efe",
			state: "PENDING",
			resources_used: [
				"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
				"d068c3e3-9bde-4cf8-bc7f-fe68c06777ca",
			],
			generated_media: [],
			created: "2023-09-07T14:32:13Z",
			last_updated: "2023-09-07T14:32:13Z",
		},
		{
			type: "IBV_VISUAL_REVIEW_CHECK",
			id: "f1191e59-eb6c-4dca-9b15-88cff7187b2a",
			state: "DONE",
			resources_used: [
				"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
			],
			generated_media: [],
			report: {
				recommendation: {
					value: "APPROVE",
				},
				breakdown: [],
			}, 
			created: "2023-09-07T14:32:13Z",
			last_updated: "2023-09-07T14:32:13Z",
		},
		{
			type: "DOCUMENT_SCHEME_VALIDITY_CHECK",
			id: "f03051b1-532d-4388-95a3-9d07bb807429",
			state: "DONE",
			resources_used: [
				"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
			],
			generated_media: [],
			report: {
				recommendation: {
					value: "APPROVE",
				},
				breakdown: [],
			},
			created: "2023-09-07T14:32:13Z",
			last_updated: "2023-09-07T14:32:13Z",
			scheme: "UK_GDS",
		},
		{
			type: "PROFILE_DOCUMENT_MATCH",
			id: "05f16627-2803-4b20-b909-5dd3fba420ef",
			state: "DONE",
			resources_used: [
				"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
				"0da43bf8-fc60-4d4d-b846-cdfe8cc96f2b",
			],
			generated_media: [],
			report: {
				recommendation: {
					value: "APPROVE",
				},
				breakdown: [],
			},
			created: "2023-09-07T14:32:13Z",
			last_updated: "2023-09-07T14:32:13Z",
		},
	],
	user_tracking_id: "some_id",
};

export const mockYotiSessionItemGMT = {
	client_session_token_ttl: 2453254,
	session_id: "99ce0305-444e-4793-b1a2-36cac84e7a07",
	state: "ONGOING",
	resources: {
		id_documents: [
			{
				id: "c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
				tasks: [
					{
						type: "ID_DOCUMENT_TEXT_DATA_EXTRACTION",
						id: "5e557551-51fc-49b8-9f2e-32da31cba8fd",
						state: "DONE",
						created: "2023-02-07T14:30:37Z",
						last_updated: "2023-02-07T14:31:16Z",
						generated_checks: [],
						generated_media: [
							{
								id: "e8841901-44fb-42b2-b6b8-88937a106d65",
								type: "JSON",
							},
						],
					},
				],
				source: {
					type: "IBV",
				},
				created_at: "2023-02-07T14:30:37Z",
				last_updated: "2023-02-07T14:31:16Z",
				document_type: "PASSPORT",
				issuing_country: "GBR",
				pages: [
					{
						capture_method: "CAMERA",
						media: {
							id: "3a5441af-da2b-4b9e-b2e3-db9c55e780e8",
							type: "IMAGE",
							created: "2023-02-07T14:31:07Z",
							last_updated: "2023-02-07T14:31:07Z",
						},
						frames: [
							{
								media: {
									id: "c502725a-3f16-4a7d-95ee-48b56281fe81",
									type: "IMAGE",
									created: "2023-02-07T14:31:08Z",
									last_updated: "2023-02-07T14:31:08Z",
								},
							},
						],
					},
				],
				document_fields: {
					media: {
						id: "e8841901-44fb-42b2-b6b8-88937a106d65",
						type: "JSON",
						created: "2023-02-07T14:31:16Z",
						last_updated: "2023-02-07T14:31:16Z",
					},
				},
				document_id_photo: {
					media: {
						id: "99e0d324-4023-4b81-8414-ddd391bb13e4",
						type: "IMAGE",
						created: "2023-02-07T14:31:16Z",
						last_updated: "2023-02-07T14:31:16Z",
					},
				},
			},
		],
		supplementary_documents: [],
		liveness_capture: [],
		face_capture: [
			{
				id: "d068c3e3-9bde-4cf8-bc7f-fe68c06777ca",
				tasks: [],
				source: {
					type: "IBV",
				},
				created_at: "2023-02-07T14:31:49Z",
				last_updated: "2023-02-07T14:32:01Z",
				image: {
					media: {
						id: "914014a3-703a-4a9b-834f-aad505e95d02",
						type: "IMAGE",
						created: "2023-02-07T14:32:01Z",
						last_updated: "2023-02-07T14:32:01Z",
					},
				},
			},
		],
		applicant_profiles: [
			{
				id: "0da43bf8-fc60-4d4d-b846-cdfe8cc96f2b",
				tasks: [],
				source: {
					type: "RELYING_BUSINESS",
				},
				created_at: "2023-02-07T14:29:12Z",
				last_updated: "2023-02-07T14:29:12Z",
				media: {
					id: "e8f55883-0071-4b46-a1e8-610b279b8a15",
					type: "JSON",
					created: "2023-02-07T14:29:12Z",
					last_updated: "2023-02-07T14:29:12Z",
				},
			},
		],
	},
	checks: [
		{
			type: "ID_DOCUMENT_AUTHENTICITY",
			id: "e29b5645-7cd1-4f42-94d7-0a2c43283f4c",
			state: "PENDING",
			resources_used: [
				"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
			],
			generated_media: [],
			created: "2023-02-07T14:32:13Z",
			last_updated: "2023-02-07T14:32:13Z",
		},
		{
			type: "ID_DOCUMENT_FACE_MATCH",
			id: "f4799bad-7a34-41f9-8956-be9fb22f9efe",
			state: "PENDING",
			resources_used: [
				"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
				"d068c3e3-9bde-4cf8-bc7f-fe68c06777ca",
			],
			generated_media: [],
			created: "2023-02-07T14:32:13Z",
			last_updated: "2023-02-07T14:32:13Z",
		},
		{
			type: "IBV_VISUAL_REVIEW_CHECK",
			id: "f1191e59-eb6c-4dca-9b15-88cff7187b2a",
			state: "DONE",
			resources_used: [
				"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
			],
			generated_media: [],
			report: {
				recommendation: {
					value: "APPROVE",
				},
				breakdown: [],
			}, 
			created: "2023-02-07T14:32:13Z",
			last_updated: "2023-02-07T14:32:13Z",
		},
		{
			type: "DOCUMENT_SCHEME_VALIDITY_CHECK",
			id: "f03051b1-532d-4388-95a3-9d07bb807429",
			state: "DONE",
			resources_used: [
				"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
			],
			generated_media: [],
			report: {
				recommendation: {
					value: "APPROVE",
				},
				breakdown: [],
			},
			created: "2023-02-07T14:32:13Z",
			last_updated: "2023-02-07T14:32:13Z",
			scheme: "UK_GDS",
		},
		{
			type: "PROFILE_DOCUMENT_MATCH",
			id: "05f16627-2803-4b20-b909-5dd3fba420ef",
			state: "DONE",
			resources_used: [
				"c2a33e99-1c55-4e21-b7d2-411a5f987ae2",
				"0da43bf8-fc60-4d4d-b846-cdfe8cc96f2b",
			],
			generated_media: [],
			report: {
				recommendation: {
					value: "APPROVE",
				},
				breakdown: [],
			},
			created: "2023-02-07T14:32:13Z",
			last_updated: "2023-02-07T14:32:13Z",
		},
	],
	user_tracking_id: "some_id",
};
