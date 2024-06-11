import Ajv from "ajv";
import { XMLParser } from "fast-xml-parser";
import { HARNESS_API_INSTANCE } from "./ApiTestSteps";
import { TxmaEvent, TxmaEventName } from "../../../utils/TxmaEvent";
import * as F2F_CRI_AUTH_CODE_ISSUED_SCHEMA from "../../data/F2F_CRI_AUTH_CODE_ISSUED_SCHEMA.json";
import * as F2F_CRI_END_SCHEMA from "../../data/F2F_CRI_END_SCHEMA.json";
import * as F2F_CRI_START_SCHEMA from "../../data/F2F_CRI_START_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_SCHEMA from "../../data/F2F_CRI_VC_ISSUED_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_00_SCHEMA from "../../data/F2F_CRI_VC_ISSUED_00_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_01_SCHEMA from "../../data/F2F_CRI_VC_ISSUED_01_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_02_SCHEMA from "../../data/F2F_CRI_VC_ISSUED_02_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_03_SCHEMA from "../../data/F2F_CRI_VC_ISSUED_03_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_04_SCHEMA from "../../data/F2F_CRI_VC_ISSUED_04_SCHEMA.json";
import * as F2F_CRI_VC_ISSUED_05_SCHEMA from "../../data/F2F_CRI_VC_ISSUED_05_SCHEMA.json";
import * as F2F_DOCUMENT_UPLOADED_SCHEMA from "../../data/F2F_DOCUMENT_UPLOADED_SCHEMA.json";
import * as F2F_YOTI_PDF_EMAILED_SCHEMA from "../../data/F2F_YOTI_PDF_EMAILED_SCHEMA.json";
import * as F2F_YOTI_START_SCHEMA from "../../data/F2F_YOTI_START_SCHEMA.json";
import * as F2F_YOTI_RESPONSE_RECEIVED_SCHEMA from "../../data/F2F_YOTI_RESPONSE_RECEIVED_SCHEMA.json";
import * as F2F_YOTI_START_00_SCHEMA from "../../data/F2F_YOTI_START_00_SCHEMA.json";
import * as F2F_YOTI_START_01_SCHEMA from "../../data/F2F_YOTI_START_01_SCHEMA.json";
import * as F2F_YOTI_START_02_SCHEMA from "../../data/F2F_YOTI_START_02_SCHEMA.json";
import * as F2F_YOTI_START_03_SCHEMA from "../../data/F2F_YOTI_START_03_SCHEMA.json";
import * as F2F_YOTI_START_04_SCHEMA from "../../data/F2F_YOTI_START_04_SCHEMA.json";
import * as F2F_YOTI_START_05_SCHEMA from "../../data/F2F_YOTI_START_05_SCHEMA.json";
import * as F2F_CRI_SESSION_ABORTED_SCHEMA from "../../data/F2F_CRI_SESSION_ABORTED_SCHEMA.json";

const ajv = new Ajv({ strictTuples: false });
ajv.addSchema(F2F_CRI_AUTH_CODE_ISSUED_SCHEMA, "F2F_CRI_AUTH_CODE_ISSUED_SCHEMA");
ajv.addSchema(F2F_CRI_END_SCHEMA, "F2F_CRI_END_SCHEMA");
ajv.addSchema(F2F_CRI_START_SCHEMA, "F2F_CRI_START_SCHEMA");
ajv.addSchema(F2F_YOTI_RESPONSE_RECEIVED_SCHEMA, "F2F_YOTI_RESPONSE_RECEIVED_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_SCHEMA, "F2F_CRI_VC_ISSUED_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_00_SCHEMA, "F2F_CRI_VC_ISSUED_00_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_01_SCHEMA, "F2F_CRI_VC_ISSUED_01_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_02_SCHEMA, "F2F_CRI_VC_ISSUED_02_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_03_SCHEMA, "F2F_CRI_VC_ISSUED_03_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_04_SCHEMA, "F2F_CRI_VC_ISSUED_04_SCHEMA");
ajv.addSchema(F2F_CRI_VC_ISSUED_05_SCHEMA, "F2F_CRI_VC_ISSUED_05_SCHEMA");
ajv.addSchema(F2F_DOCUMENT_UPLOADED_SCHEMA, "F2F_DOCUMENT_UPLOADED_SCHEMA");
ajv.addSchema(F2F_YOTI_PDF_EMAILED_SCHEMA, "F2F_YOTI_PDF_EMAILED_SCHEMA");
ajv.addSchema(F2F_YOTI_START_SCHEMA, "F2F_YOTI_START_SCHEMA");
ajv.addSchema(F2F_YOTI_START_00_SCHEMA, "F2F_YOTI_START_00_SCHEMA");
ajv.addSchema(F2F_YOTI_START_01_SCHEMA, "F2F_YOTI_START_01_SCHEMA");
ajv.addSchema(F2F_YOTI_START_02_SCHEMA, "F2F_YOTI_START_02_SCHEMA");
ajv.addSchema(F2F_YOTI_START_03_SCHEMA, "F2F_YOTI_START_03_SCHEMA");
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
	const allContents  = await fileNames.reduce(
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
				expect(validate(currentEventBody)).toBe(true);
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
