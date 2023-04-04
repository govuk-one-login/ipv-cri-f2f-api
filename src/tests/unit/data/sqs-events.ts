export const VALID_SQS_EVENT = {
	"Records": [
		{
			"messageId": "6e67a34a-94f1-493f-b9eb-3d421aa701a8",
			// pragma: allowlist nextline secret
			"receiptHandle": "AQEBDzpW+TMqnd6I8zcqmrq8g8BTsuDjI745ci0bJ46g0Ej",
			"body": "{\"TopicArn\": \"topic_arn\", \"Message\": \"{\\\"yotiSessionId\\\":\\\"b373b3cc-d514-4119-9043-bfeee7cda000\\\",\\\"emailAddress\\\":\\\"bhavana.hemanth@digital.cabinet-office.gov.uk\\\",\\\"firstName\\\":\\\"Joe Niel\\\",\\\"lastName\\\":\\\"Jacob\\\",\\\"messageType\\\":\\\"email\\\"}\", \"MessageStructure\": \"json\", \"MessageAttributes\":{\"messageType\": { \"DataType\": \"String\", \"StringValue\": \"email\" }, \"uniqueId\": { \"DataType\": \"String\", \"StringValue\": \"as67di2w\"} } }",
			"attributes": {
				"ApproximateReceiveCount": "1",
				"SentTimestamp": "1588867971441",
				"SenderId": "AIDAIVEA3AGEU7NF6DRAG",
				"ApproximateFirstReceiveTimestamp": "1588867971443",
			},
			"messageAttributes": {},
			// pragma: allowlist nextline secret
			"md5OfBody": "ef38e4dfa52ade850f671b7e1915f26b",
			"eventSource": "aws:sqs",
			"eventSourceARN": "queue_arn",
			"awsRegion": "eu-west-2",
		},
	],
}
;
