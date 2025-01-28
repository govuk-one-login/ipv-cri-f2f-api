import { HttpCodesEnum } from "./HttpCodesEnum";
import { AppError } from "./AppError";
import { Readable } from "stream";
import { GetObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";

export async function fetchEncodedFileFromS3Bucket(bucket: string, key: string): Promise<any> {
	const streamToBuffer = async (stream: Readable): Promise<Buffer> => {
		return new Promise((resolve, reject) => {
			const chunks: Uint8Array[] = [];
			stream.on("data", (chunk) => chunks.push(chunk));
			stream.on("end", () => resolve(Buffer.concat(chunks)));
			stream.on("error", reject);
		});
	};

	const s3Config: S3ClientConfig = {
		region: process.env.REGION,
		maxAttempts: 2,
		requestHandler: new NodeHttpHandler({
			connectionTimeout: 29000,
			socketTimeout: 29000,
		}),
	};

	const s3Client = new S3Client(s3Config);
  
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
	} catch (error) {
		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Error fetching the file from S3 bucket");
	}		
}
