import { HttpCodesEnum } from "./HttpCodesEnum";
import { AppError } from "./AppError";
import { Readable } from "stream";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";


export async function fetchEncodedFileFromS3Bucket(s3Client: S3Client, bucket: string | undefined, key: string): Promise<any> {
	const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
		return new Promise((resolve, reject) => {
			const chunks: Uint8Array[] = [];
			stream.on("data", (chunk) => chunks.push(chunk));
			stream.on("end", () => resolve(Buffer.concat(chunks)));
			stream.on("error", reject);
		});
	};
  
	const pdfParams = {
		Bucket: bucket,
		Key: key,
	};

	try {
		const file = await s3Client.send(new GetObjectCommand(pdfParams));
		if (file.Body instanceof Readable) {
			const body = await streamToBuffer(file.Body);
			return body;
		}
		// ignored so as not log PII
		/* eslint-disable @typescript-eslint/no-unused-vars */
	} catch (error) {
		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching the file from S3 bucket");
	}		
}
