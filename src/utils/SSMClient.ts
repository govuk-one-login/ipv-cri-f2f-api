import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import AWSXRay from "aws-xray-sdk-core";

AWSXRay.setContextMissingStrategy("LOG_ERROR");

const ssmClientRaw = new SSMClient({ region: process.env.REGION });

const ssmClient = process.env.XRAY_ENABLED === "true" ? AWSXRay.captureAWSv3Client(ssmClientRaw as any) : ssmClientRaw;

export { ssmClient, GetParameterCommand };
