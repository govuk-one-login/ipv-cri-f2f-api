import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import AWSXRay from "aws-xray-sdk-core";

AWSXRay.setContextMissingStrategy("LOG_ERROR");

const ssmClientRaw = new SSMClient({ region: "eu-west-2" });

const ssmClient = process.env.XRAY_ENABLED === "true" ? AWSXRay.captureAWSv3Client(ssmClientRaw as any) : ssmClientRaw;

export { ssmClient, GetParameterCommand };
