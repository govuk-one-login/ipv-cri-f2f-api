import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import AWSXRay from "aws-xray-sdk-core";
import { mockSsmCient } from "../tests/contract/mocks/ssmClient";
import { Logger } from "@aws-lambda-powertools/logger";

const createSsmClient = (logger: Logger) => {
	let ssmClient: SSMClient;
	if (process.env.USE_MOCKED) {
		logger.info("SSMClient: USING MOCKED");
		ssmClient = mockSsmCient as unknown as SSMClient;
	} else {
        
		AWSXRay.setContextMissingStrategy("LOG_ERROR");

		const ssmClientRaw = new SSMClient({ region: process.env.REGION });

		ssmClient = process.env.XRAY_ENABLED === "true" ? AWSXRay.captureAWSv3Client(ssmClientRaw as any) : ssmClientRaw;
	}
	return ssmClient;
};

export { createSsmClient, GetParameterCommand };
