import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import axios from "axios";
import https from "https";

export class DocumentSelectionRequestProcessor {
  private static instance: DocumentSelectionRequestProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private readonly yotiService: YotiService;

  constructor(logger: Logger, metrics: Metrics) {
    this.logger = logger;
    this.metrics = metrics;
    this.yotiService = YotiService.getInstance(
      this.logger,
      "1f9edc97-c60c-40d7-becb-c1c6a2ec4963",
      Buffer.from(
        '"LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ0KTUlJRW93SUJBQUtDQVFFQXVPengvUE5IWUZjVDI5SEozWkk4eUVscVhGa3p6QzlQVnVXZkNVSmg1TDlzeml6TA0KSndadmNtWm9UdnJKd0JwdVRuUktOOGQ2cGVOdG1iVW5NVUVwOFArUCtTUFJ0Nm14NEt4S3c4NGZyaU9KVldRMw0KRnp0YzQzZDRPdDRWWnVsM2dLMDNpWjE5OWpIS09TY3pQR0lIOFVHbTBtdG5pQjY1RWNVbzBCcXliTkFydkZ4Mg0KbGY0NGdXZFlXa3pxN1JlWXJjV0IzUnQyZW9UQ29OSHB1b1BCMmxheDdLTGpaSW8yQnI2a2hmNXpHZFk2TlZ3Yw0KV2lqUXVrZHhBZzFXODQ3djVGM3ZxZiswYTdtdy96dXp4UE84b2grbCtvTlZGWnV6OFdRcE5GOGpYSmJqSjJtdw0KdDJlZENlRjhPdHE5aXVvZ0FwbTdHVkM5NnRGY2dZOHdjMzRCbHdJREFRQUJBb0lCQUVSRkFWODdadjNibDlLKw0KdzlIL1UxNHpzRWJ3alkxVForeHlNQURJbDRCTjVUckdVYWVTR2lHM1Njbmlqd25UR0NieGlwYkdGM0xYbjlZdg0KaVEwSGZCYmpHa0ZGWm41eDhOKzdhNHlXODU0anMyY3BiS2N3ZkszakpLbEM1TTdONFJiSm0rZTdrMDJJK3htWA0KYmJSY2tvY1FFQ2k5aXdhM0pPYTVEVVNxbm5WSjBqTGlFYkcyd2dMR1NMUE5XQjdNTG1tU2ZLb1dMMHFhUTFUbA0KQUdBM0ExU1JhQ21HbHpEcUZpNEhzQXFTOWcvY2FuKzlsbHMwLzlrUGJYbTgvTVI0TkV5NlNLTkQrVG45NXA0TA0KV29UN0RWUUhXUm5hSnNwT0RGZEdONi9EdlJDcTRPcjFBZ2dta2hSNUY2OGwveDZ1VmYrdVhIZWpsai9tdUs1Wg0KVlRWYmFzMENnWUVBM21vcElsV3VoMllSVGpLRVYvS3J6Uk5LNFdLODR3MktvYzdpbENxSFptM1g4Z29VY1lYWg0KQVdDUkxwbk5BNjM3bE40WFdBUGpzWUh2SVZiSDZqTkZJVXVVWjBvSDZKM0ptQWwyNnJ4RDF1MHlMV3ptVnpjZw0KYVQ3SlB2a3N6R01RajVQNnplbFpLeDNjRlhEYVpOUzQwOUdFTDJNRFhibVRYbElFbldXMEJJTUNnWUVBMU5tVA0KUVVBTUdwVVNXK3gvaE4zM1BvcVBvMWc3VVBiQzNXR0RzUk1TN1Axclg1cko1dWZGNHBPM0hNRWxCYnI3MUQvdQ0KZG5GRXpIU2R3amk0K3B3azZlN3ZxWmZZTjZxcm15ZE1XNStydFpMRDZGN0UwOHRsTlRjS1lxWEdFb01LU20rTQ0KZXh3NHpFaFR3eHJpb0k4OVNLMitwZjFsRlY2WStqT0ZBM2dEeWwwQ2dZQTl4T3dCbmh3bmZHQklBRjJpODBGbA0KWmZ0QTF5UXdScjErcks5ZWlPVXJ2RXZoNjR5NzdubFRHWmVZZ3B4ZWJqNVZuTXlNNUIralY3dXEzYWdOMGdsYg0KOHRxWFNRY2pRbGNQZzJsa1RiN2xmT0NYbnd2bG91aThjZlNBS2NHWVRkYjJtUmxwZ0dvRVFIbXo5ckNnbWpkdQ0KbEZ5S3NJdnB4clUzMTcxeVhTRitzd0tCZ0Nnci9FZlhYN0Z3cXl0Z1FsMEFTNWFwTGh6bEhTVFZ2Y2RzalI5Ug0KZTBQeFBGK3A1aXRIV1NpL09sTVovUFBNNjVTT2tHSVlWS1RGNmJScllqWWlYREV1b0ZzQXhwVVRDQnBiVzJUNw0KaUx2WFBGUlI5cElHbEU1cjJmRHVXcWpKeEpweDNUQ3JEZWs0U1Y3TVp6Tm9kV2VQS3lsRzN0b2VwWDZyVkpKbw0KQjBjZEFvR0JBSlBZY0lSdVVjRUE0T3NMTDYrQnZwbldVTFZQQUNPY3I3Z0dkOTg3bExJNm9DemQ0ajJWZ1ZTNQ0KQ1kvbkRXQ2lvZTFWbElab3ptQzFxdDF6dTg3ZE1WdS8vNGhRNklDYUQ1K2VIMnlQTVRuYmVmZVVESTRqVklFVg0KU21SSmo5YVVHWjRHWXd2TnhPbmtjeTI2eGs3RkpqbW12clJIK2FHRXNqZzVCWkxxUlAwdA0KLS0tLS1FTkQgUlNBIFBSSVZBVEUgS0VZLS0tLS0="',
        "base64"
      ).toString("utf8")
    );
  }

  static getInstance(
    logger: Logger,
    metrics: Metrics
  ): DocumentSelectionRequestProcessor {
    if (!DocumentSelectionRequestProcessor.instance) {
      DocumentSelectionRequestProcessor.instance =
        new DocumentSelectionRequestProcessor(logger, metrics);
    }
    return DocumentSelectionRequestProcessor.instance;
  }

  async processRequest() {
    const CLIENT_SDK_ID = "1f9edc97-c60c-40d7-becb-c1c6a2ec4963";
    const PEM_KEY = Buffer.from(
      '"LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ0KTUlJRW93SUJBQUtDQVFFQXVPengvUE5IWUZjVDI5SEozWkk4eUVscVhGa3p6QzlQVnVXZkNVSmg1TDlzeml6TA0KSndadmNtWm9UdnJKd0JwdVRuUktOOGQ2cGVOdG1iVW5NVUVwOFArUCtTUFJ0Nm14NEt4S3c4NGZyaU9KVldRMw0KRnp0YzQzZDRPdDRWWnVsM2dLMDNpWjE5OWpIS09TY3pQR0lIOFVHbTBtdG5pQjY1RWNVbzBCcXliTkFydkZ4Mg0KbGY0NGdXZFlXa3pxN1JlWXJjV0IzUnQyZW9UQ29OSHB1b1BCMmxheDdLTGpaSW8yQnI2a2hmNXpHZFk2TlZ3Yw0KV2lqUXVrZHhBZzFXODQ3djVGM3ZxZiswYTdtdy96dXp4UE84b2grbCtvTlZGWnV6OFdRcE5GOGpYSmJqSjJtdw0KdDJlZENlRjhPdHE5aXVvZ0FwbTdHVkM5NnRGY2dZOHdjMzRCbHdJREFRQUJBb0lCQUVSRkFWODdadjNibDlLKw0KdzlIL1UxNHpzRWJ3alkxVForeHlNQURJbDRCTjVUckdVYWVTR2lHM1Njbmlqd25UR0NieGlwYkdGM0xYbjlZdg0KaVEwSGZCYmpHa0ZGWm41eDhOKzdhNHlXODU0anMyY3BiS2N3ZkszakpLbEM1TTdONFJiSm0rZTdrMDJJK3htWA0KYmJSY2tvY1FFQ2k5aXdhM0pPYTVEVVNxbm5WSjBqTGlFYkcyd2dMR1NMUE5XQjdNTG1tU2ZLb1dMMHFhUTFUbA0KQUdBM0ExU1JhQ21HbHpEcUZpNEhzQXFTOWcvY2FuKzlsbHMwLzlrUGJYbTgvTVI0TkV5NlNLTkQrVG45NXA0TA0KV29UN0RWUUhXUm5hSnNwT0RGZEdONi9EdlJDcTRPcjFBZ2dta2hSNUY2OGwveDZ1VmYrdVhIZWpsai9tdUs1Wg0KVlRWYmFzMENnWUVBM21vcElsV3VoMllSVGpLRVYvS3J6Uk5LNFdLODR3MktvYzdpbENxSFptM1g4Z29VY1lYWg0KQVdDUkxwbk5BNjM3bE40WFdBUGpzWUh2SVZiSDZqTkZJVXVVWjBvSDZKM0ptQWwyNnJ4RDF1MHlMV3ptVnpjZw0KYVQ3SlB2a3N6R01RajVQNnplbFpLeDNjRlhEYVpOUzQwOUdFTDJNRFhibVRYbElFbldXMEJJTUNnWUVBMU5tVA0KUVVBTUdwVVNXK3gvaE4zM1BvcVBvMWc3VVBiQzNXR0RzUk1TN1Axclg1cko1dWZGNHBPM0hNRWxCYnI3MUQvdQ0KZG5GRXpIU2R3amk0K3B3azZlN3ZxWmZZTjZxcm15ZE1XNStydFpMRDZGN0UwOHRsTlRjS1lxWEdFb01LU20rTQ0KZXh3NHpFaFR3eHJpb0k4OVNLMitwZjFsRlY2WStqT0ZBM2dEeWwwQ2dZQTl4T3dCbmh3bmZHQklBRjJpODBGbA0KWmZ0QTF5UXdScjErcks5ZWlPVXJ2RXZoNjR5NzdubFRHWmVZZ3B4ZWJqNVZuTXlNNUIralY3dXEzYWdOMGdsYg0KOHRxWFNRY2pRbGNQZzJsa1RiN2xmT0NYbnd2bG91aThjZlNBS2NHWVRkYjJtUmxwZ0dvRVFIbXo5ckNnbWpkdQ0KbEZ5S3NJdnB4clUzMTcxeVhTRitzd0tCZ0Nnci9FZlhYN0Z3cXl0Z1FsMEFTNWFwTGh6bEhTVFZ2Y2RzalI5Ug0KZTBQeFBGK3A1aXRIV1NpL09sTVovUFBNNjVTT2tHSVlWS1RGNmJScllqWWlYREV1b0ZzQXhwVVRDQnBiVzJUNw0KaUx2WFBGUlI5cElHbEU1cjJmRHVXcWpKeEpweDNUQ3JEZWs0U1Y3TVp6Tm9kV2VQS3lsRzN0b2VwWDZyVkpKbw0KQjBjZEFvR0JBSlBZY0lSdVVjRUE0T3NMTDYrQnZwbldVTFZQQUNPY3I3Z0dkOTg3bExJNm9DemQ0ajJWZ1ZTNQ0KQ1kvbkRXQ2lvZTFWbElab3ptQzFxdDF6dTg3ZE1WdS8vNGhRNklDYUQ1K2VIMnlQTVRuYmVmZVVESTRqVklFVg0KU21SSmo5YVVHWjRHWXd2TnhPbmtjeTI2eGs3RkpqbW12clJIK2FHRXNqZzVCWkxxUlAwdA0KLS0tLS1FTkQgUlNBIFBSSVZBVEUgS0VZLS0tLS0="',
      "base64"
    ).toString("utf8");

    const sessionID = await this.yotiService.createSession();
    console.log("sessionID", sessionID);
    const info = await this.yotiService.fetchSessionInfo(sessionID);
    console.log("info", info);
    const requirements = info.capture.required_resources
      .filter((x: any) => x.type.includes("DOCUMENT"))
      .map((resource: any) => {
        if (resource.type === "ID_DOCUMENT") {
          return {
            requirement_id: resource.id,
            document: {
              type: resource.type,
              country_code: resource.supported_countries[0].code,
              document_type:
                resource.supported_countries[0].supported_documents[0].type,
            },
          };
        } else if (resource.type === "SUPPLEMENTARY_DOCUMENT") {
          return {
            requirement_id: resource.id,
            document: {
              type: resource.type,
              country_code: resource.country_codes[0],
              document_type: resource.document_types[0],
            },
          };
        }
      });

    console.log("requirements", requirements);
    const genInsturctions = await this.yotiService.generateInstructions(
      sessionID,
      requirements
    );
    console.log("genInsturctions", genInsturctions);
    const fetchInstructions = await this.yotiService.fetchInstructionsPdf(
      sessionID
    );
    console.log("fetchInstructions", fetchInstructions);

    return {
      statusCode: 200,
      body: JSON.stringify({
        access_token: sessionID,
      }),
    };
  }
}
