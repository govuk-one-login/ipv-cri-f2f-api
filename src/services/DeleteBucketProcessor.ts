import {
  S3Client,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";import { NodeHttpHandler } from "@smithy/node-http-handler";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { AppError } from "../utils/AppError";

export class DeleteBucketProcessor {

    private static instance: DeleteBucketProcessor;

    readonly s3Client: S3Client;

    constructor() {
		this.s3Client = new S3Client({
			region: process.env.REGION,
			maxAttempts: 2,
			requestHandler: new NodeHttpHandler({
				connectionTimeout: 29000,
				socketTimeout: 29000,
			}),
		});
	}

    static getInstance(): DeleteBucketProcessor {
		if (!DeleteBucketProcessor.instance) {
			DeleteBucketProcessor.instance =
				new DeleteBucketProcessor();
		}
		return DeleteBucketProcessor.instance;
	}

    async processRequest(event: any): Promise<any> {
		const bucketName = event?.ResourceProperties?.BucketName;

		try {
			if (event.RequestType === "Delete") {
				await this.deleteBucketVersions(bucketName)
				await this.deleteBucket(bucketName)

				await this.sendResponse(event, "SUCCESS", { message: "Bucket deleted"} );
				return { statusCode: HttpCodesEnum.OK, body: "Bucket deleted" }
			} else {
				// For Create or Update events. Response sent to prevent Cloudformation hanging
				await this.sendResponse(event, "SUCCESS", { message: `${event.RequestType} success` });
				return { statusCode: 200, body: `${event.RequestType} success` };
			}
		} catch(error: any) {
			await this.sendResponse(event, "FAILED", { message: `Bucket deletion failed with error: ${error}`})
			return { statusCode: HttpCodesEnum.SERVER_ERROR, body: `Bucket deletion failed with error: ${error}` }	
		}
    }

	private async deleteBucketVersions(bucketName: string) {
		const toDelete = []
		let bucketVersions = await this.s3Client.send(new ListObjectVersionsCommand({ Bucket: bucketName}));

		if (bucketVersions?.Versions) {
			for (const version of bucketVersions.Versions) {
				toDelete.push({ Key: version.Key, VersionId: version.VersionId})
			}
		}

		if (bucketVersions?.DeleteMarkers) {
			for (const deleteMarker of bucketVersions.DeleteMarkers) {
				toDelete.push({ Key: deleteMarker.Key, VersionId: deleteMarker.VersionId })
			}
		}

		if (toDelete.length > 0) {
			await this.s3Client.send(
				new DeleteObjectsCommand({
					Bucket: bucketName,
					Delete: { Objects: toDelete },
				})
			);
		}
	}

	private async deleteBucket(bucketName: string) {
		let bucket = await this.s3Client.send(new ListObjectsV2Command({ Bucket: bucketName }));

		if (bucket?.Contents) {
			await this.s3Client.send(
				new DeleteObjectsCommand({
				Bucket: bucketName,
				Delete: { Objects: bucket.Contents.map((objects) => ({ Key: objects.Key })) },
				})
			);
		}
	}

	private async sendResponse(event: any, status: "SUCCESS" | "FAILED", data: any): Promise<any> {

		const body = JSON.stringify({
			Status: status,
			PhysicalResourceId: `${event.ResourceProperties.BucketName}-${event.StackId}`,
			StackId: event.StackId,
			RequestId: event.RequestId,
			LogicalResourceId: event.LogicalResourceId,
			Data: data,
		});

		try {
			await fetch(event.ResponseURL, {
				method: "PUT",
				headers: { "Content-Type": "", "Content-Length": body.length.toString() },
				body,
			});
		} catch(error: any) {
			throw new AppError(HttpCodesEnum.SERVER_ERROR, `fetch request failed with error: ${error}`);
		}
	}
}