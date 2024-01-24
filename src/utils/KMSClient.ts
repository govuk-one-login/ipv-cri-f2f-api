import * as AWS from "@aws-sdk/client-kms";
import AWSXRay from "aws-xray-sdk-core";
import { mockKmsCient } from "../tests/contract/mocks/kmsClient";

const createKmsClient = () => {    

    let kmsClient: AWS.KMS;	

    if (process.env.USE_MOCKED) {
        console.log("USING MOCKED");
        kmsClient = mockKmsCient as unknown as AWS.KMS;
    } else {

        AWSXRay.setContextMissingStrategy("LOG_ERROR");
        const kms = new AWS.KMS({
            region: process.env.REGION,
        });

        kmsClient = process.env.XRAY_ENABLED === "true" ? AWSXRay.captureAWSv3Client(kms as any) : kms;
    }
    return kmsClient;
}

export { createKmsClient };
