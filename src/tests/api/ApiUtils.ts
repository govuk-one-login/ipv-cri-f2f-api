import Ajv from "ajv";
import { XMLParser } from "fast-xml-parser";
import { HARNESS_API_INSTANCE } from "./ApiTestSteps";
import { TxmaEvent, TxmaEventName } from "../../utils/TxmaEvent";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import jp from "jsonpath";
const client = new LambdaClient({ region: process.env.REGION });
import * as F2F_CRI_AUTH_CODE_ISSUED_SCHEMA from "../data/F2F_CRI_AUTH_CODE_ISSUED_SCHEMA.json";
import * as F2F_CRI_END_SCHEMA from "../data/F2F_CRI_END_SCHEMA.json";
import * as F2F_CRI_START_SCHEMA from "../data/F2F_CRI_START_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_SCHEMA from "../data/F2F_CRI_VC_ISSUED_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_00_SCHEMA from "../data/F2F_CRI_VC_ISSUED_00_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_01_SCHEMA from "../data/F2F_CRI_VC_ISSUED_01_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_02_SCHEMA from "../data/F2F_CRI_VC_ISSUED_02_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_04_SCHEMA from "../data/F2F_CRI_VC_ISSUED_04_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_05_SCHEMA from "../data/F2F_CRI_VC_ISSUED_05_SCHEMA.json";
import * as F2F_DOCUMENT_UPLOADED_SCHEMA from "../data/F2F_DOCUMENT_UPLOADED_SCHEMA.json";
import * as F2F_YOTI_PDF_EMAILED_SCHEMA from "../data/F2F_YOTI_PDF_EMAILED_SCHEMA.json";
import * as F2F_YOTI_PDF_LETTER_POSTED_SCHEMA from "../data/F2F_YOTI_PDF_LETTER_POSTED.json";
import * as F2F_YOTI_START_SCHEMA from "../data/F2F_YOTI_START_SCHEMA.json";
import * as F2F_YOTI_RESPONSE_RECEIVED_SCHEMA from "../data/F2F_YOTI_RESPONSE_RECEIVED_SCHEMA.json";
import * as F2F_YOTI_START_00_SCHEMA from "../data/F2F_YOTI_START_00_SCHEMA.json";
import * as F2F_YOTI_START_01_SCHEMA from "../data/F2F_YOTI_START_01_SCHEMA.json";
import * as F2F_YOTI_START_02_SCHEMA from "../data/F2F_YOTI_START_02_SCHEMA.json";
import * as F2F_YOTI_START_04_SCHEMA from "../data/F2F_YOTI_START_04_SCHEMA.json";
import * as F2F_YOTI_START_05_SCHEMA from "../data/F2F_YOTI_START_05_SCHEMA.json";
import * as F2F_CRI_SESSION_ABORTED_SCHEMA from "../data/F2F_CRI_SESSION_ABORTED_SCHEMA.json";
import { PostalAddress } from "../api/types";

const ajv = new Ajv({ strictTuples: false });
ajv.addSchema(F2F_CRI_AUTH_CODE_ISSUED_SCHEMA, "F2F_CRI_AUTH_CODE_ISSUED_SCHEMA");
ajv.addSchema(F2F_CRI_END_SCHEMA, "F2F_CRI_END_SCHEMA");
ajv.addSchema(F2F_CRI_START_SCHEMA, "F2F_CRI_START_SCHEMA");
ajv.addSchema(F2F_YOTI_RESPONSE_RECEIVED_SCHEMA, "F2F_YOTI_RESPONSE_RECEIVED_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_SCHEMA, "F2F_CRI_VC_ISSUED_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_00_SCHEMA, "F2F_CRI_VC_ISSUED_00_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_01_SCHEMA, "F2F_CRI_VC_ISSUED_01_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_02_SCHEMA, "F2F_CRI_VC_ISSUED_02_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_04_SCHEMA, "F2F_CRI_VC_ISSUED_04_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_05_SCHEMA, "F2F_CRI_VC_ISSUED_05_SCHEMA");
ajv.addSchema(F2F_DOCUMENT_UPLOADED_SCHEMA, "F2F_DOCUMENT_UPLOADED_SCHEMA");
ajv.addSchema(F2F_YOTI_PDF_EMAILED_SCHEMA, "F2F_YOTI_PDF_EMAILED_SCHEMA");
ajv.addSchema(F2F_YOTI_PDF_LETTER_POSTED_SCHEMA, "F2F_YOTI_PDF_LETTER_POSTED_SCHEMA");
ajv.addSchema(F2F_YOTI_START_SCHEMA, "F2F_YOTI_START_SCHEMA");
ajv.addSchema(F2F_YOTI_START_00_SCHEMA, "F2F_YOTI_START_00_SCHEMA");
ajv.addSchema(F2F_YOTI_START_01_SCHEMA, "F2F_YOTI_START_01_SCHEMA");
ajv.addSchema(F2F_YOTI_START_02_SCHEMA, "F2F_YOTI_START_02_SCHEMA");
ajv.addSchema(F2F_YOTI_START_04_SCHEMA, "F2F_YOTI_START_04_SCHEMA");
ajv.addSchema(F2F_YOTI_START_05_SCHEMA, "F2F_YOTI_START_05_SCHEMA");
ajv.addSchema(F2F_CRI_SESSION_ABORTED_SCHEMA, "F2F_CRI_SESSION_ABORTED_SCHEMA");

const xmlParser = new XMLParser();

interface TestHarnessReponse {
	data: TxmaEvent;
}

interface AllTxmaEvents {
	"F2F_CRI_START"?: TxmaEvent;
	"F2F_CRI_AUTH_CODE_ISSUED"?: TxmaEvent;
	"F2F_YOTI_PDF_EMAILED"?: TxmaEvent;
	"F2F_YOTI_PDF_LETTER_POSTED"?: TxmaEvent;
	"F2F_YOTI_START"?: TxmaEvent;
	"F2F_YOTI_RESPONSE_RECEIVED"?: TxmaEvent;
	"F2F_CRI_VC_ISSUED"?: TxmaEvent;
	"F2F_CRI_END"?: TxmaEvent;
	"F2F_DOCUMENT_UPLOADED"?: TxmaEvent;
	"F2F_CRI_SESSION_ABORTED"?: TxmaEvent;
}

const getTxMAS3FileNames = async (prefix: string): Promise<any> => {
	const listObjectsResponse = await HARNESS_API_INSTANCE.get("/bucket/", {
		params: {
			prefix: "txma/" + prefix,
		},
	});
	const listObjectsParsedResponse = xmlParser.parse(listObjectsResponse.data);
	return listObjectsParsedResponse?.ListBucketResult?.Contents;
};

const getAllTxMAS3FileContents = async (fileNames: any[]): Promise<AllTxmaEvents> => {
	const allContents = await fileNames.reduce(
		async (accumulator: Promise<AllTxmaEvents>, fileName: any) => {
			const resolvedAccumulator = await accumulator;

			const eventContents: TestHarnessReponse = await HARNESS_API_INSTANCE.get("/object/" + fileName.Key, {});
			resolvedAccumulator[eventContents?.data?.event_name] = eventContents.data;

			return resolvedAccumulator;
		}, Promise.resolve({}),
	);

	return allContents;
};

export async function getTxmaEventsFromTestHarness(sessionId: string, numberOfTxMAEvents: number): Promise<any> {
	let objectList: AllTxmaEvents = {};
	let fileNames: any = [];

	await new Promise(res => setTimeout(res, 3000));
	fileNames = await getTxMAS3FileNames(sessionId);

	// AWS returns an array for multiple but an object for single
	if (numberOfTxMAEvents === 1) {
		if (!fileNames || !fileNames.Key) {
			console.log(`No TxMA events found for session ID ${sessionId}`);
			return undefined;
		}

		const eventContents: TestHarnessReponse = await HARNESS_API_INSTANCE.get("/object/" + fileNames.Key, {});
		objectList[eventContents?.data?.event_name] = eventContents.data;
	} else {
		if (!fileNames || !fileNames.length) {
			console.log(`No TxMA events found for session ID ${sessionId}`);
			return undefined;
		}

		const additionalObjectList = await getAllTxMAS3FileContents(fileNames);
		objectList = { ...objectList, ...additionalObjectList };
	}
	return objectList;
}

export function validateTxMAEventData(
	{ eventName, schemaName }: { eventName: TxmaEventName; schemaName: string }, allTxmaEventBodies: AllTxmaEvents = {},
): void {
	const currentEventBody: TxmaEvent | undefined = allTxmaEventBodies[eventName];

	if (currentEventBody?.event_name) {
		try {
			const validate = ajv.getSchema(schemaName);
			if (validate) {
				const isSchemaValid = validate(currentEventBody);
				if (validate.errors) {
					console.log("Schema validation errors: " + JSON.stringify(validate.errors));
				}
				expect(isSchemaValid).toBe(true);
			} else {
				throw new Error(`Could not find schema ${schemaName}`);
			}
		} catch (error) {
			console.error("Error validating event", error);
			throw error;
		}
	} else {
		throw new Error(`No event found in the test harness for ${eventName} event`);
	}
}

const getYotiLetterS3FileName = async (prefix: string, yotiSessionId?: string): Promise<string | undefined> => {
	const listObjectsResponse = await HARNESS_API_INSTANCE.get("/yotiletterbucket/", {
		params: {
			prefix: `${prefix}${yotiSessionId}`,
		},
	});

	const listObjectsParsedResponse = xmlParser.parse(listObjectsResponse.data);
	const file = listObjectsParsedResponse?.ListBucketResult?.Contents;

	// Ensure we only return one expected file
	if (!file || !file.Key) {
		console.log(`No Yoti Letter file found for session ID ${yotiSessionId} with prefix ${prefix}`);
		return undefined;
	}

	return file.Key;
};

export const getYotiLetterFileContents = async (prefix: string, yotiSessionId: string): Promise<any> => {

	const fileName = await getYotiLetterS3FileName(prefix, yotiSessionId);
	if (!fileName) return undefined;

	const fileContentsResponse = await HARNESS_API_INSTANCE.get(`/yotiletterbucket/${fileName}`, {});

	return fileContentsResponse.data;
};

export const testYotiLetterFileExists = async (prefix: string, yotiSessionId: string) => {
	const fileContents = await getYotiLetterFileContents(prefix, yotiSessionId);

	if (!fileContents) {
		throw new Error(`File with prefix "${prefix}" and session ID "${yotiSessionId}" NOT found!`);
	}
};

export function validateTxMAEventField(
	{
		eventName,
		jsonPath,
		expectedValue,
	}: {
		eventName: TxmaEventName;
		jsonPath: string;
		expectedValue: unknown;
	},
	allTxmaEventBodies: AllTxmaEvents = {},
): void {
	const currentEventBody: TxmaEvent | undefined = allTxmaEventBodies[eventName];

	if (!currentEventBody) {
		throw new Error(`No event found in the test harness for ${eventName} event`);
	}

	try {
		const results = jp.query(currentEventBody, jsonPath);
		if (results.length === 0) {
			throw new Error(`No value found for JSONPath ${jsonPath} in event ${eventName}`);
		}
		
		expect(results[0]).toEqual(expectedValue);
	} catch (error) {
		console.error("Error validating event field", error);
		throw error;
	}
}

export function buildExpectedPostalAddress(data: { postal_address: PostalAddress }): PostalAddress {
	return {
		preferredAddress: data.postal_address.preferredAddress,
		uprn: data.postal_address.uprn,
		buildingName: data.postal_address.buildingName,
		streetName: data.postal_address.streetName,
		postalCode: data.postal_address.postalCode,
		buildingNumber: data.postal_address.buildingNumber,
		addressLocality: data.postal_address.addressLocality,
		subBuildingName: data.postal_address.subBuildingName,
		addressCountry: data.postal_address.addressCountry,
	};
}


export async function invokeLambdaFunction(lambdaName: string, payload: object): Promise<void> {

	const command = new InvokeCommand({
		FunctionName: lambdaName,
		Payload: new TextEncoder().encode(JSON.stringify(payload)),
	});

	try {
		await client.send(command);
	} catch (error) {
		console.error("Error invoking Lambda function", error);
		throw new Error(`Failed to invoke Lambda function: ${error}`);
	}
}

