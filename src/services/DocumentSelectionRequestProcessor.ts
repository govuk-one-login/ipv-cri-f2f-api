import { Metrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { APIGatewayProxyEvent } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";

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
        "LS0tLS1CRUdJTiBSU0EgUFJJVkFURSBLRVktLS0tLQ0KTUlJRXBRSUJBQUtDQVFFQXhEZ3dhQWJVaytFclQ3NUJqbjhDQ3FSdm9RUXR2VEVlV3NNVkZNeFJvYVVvcklHRw0KOThGYjdCVENmSFRZakFXcU9WQTBYNHN5cUtvZDZ5YytsTjRZTGxpaGVEY3R3UFBvWlBvWjM2ZnByOW1mV1RHRQ0KUWhLSEFRWWV3ZkdnM2lWUGFyUlU0VHROVjBuRjFWNm93R3daYVdPS2U0V1NMUU0wSk9UaTZmT3pzOXhMekhhdA0KTmV6WDVHSGpZK2JZUEh3cDVhQnJ1ZmR3YjFReVFIbDhYMFdDc2NabnVXUmdyMksyekxCWjQ0N3d3bXM0clFKSA0KaHFNb0ludDloRThGbEJ1ZUdzR3Q5NHR2WG05UmxRMzJZd0hKN2JUaEx5MGFuOVBIREJvb3FJQ2NCdENIanFYbA0KWkdwWDhGU25qVTFDSDQ2T2VFdnkrYzBScGgrKzZpNlB6ODVVb1FJREFRQUJBb0lCQUFuNHV3a0dVOVpDQ3FQdQ0KVE1HVGxjUjVyOHlVZkVpUmp2UFkxeURyOHpnT1B4OXBJN1ZDaDh2YkVEa243UHRNckdabU80c2hkVTBaL0JRLw0KdGMvMTYyK3JoR1VxRkxLcUVvVFRLdTV4UjVCdXRFamhtZEdMeEgyYVZJVFJwVFcwMnJEWEFqdEIrcisxV1k3cQ0KMVJPV1NzSk8wekpNeXUxcnJNSTFPWXpmSENKSE9FWis5VjJTcGFTaUE3LzlpMy9ZVXlHaG5WS3VmcVBMbmlSYw0KNFNibVNaUWFBeGhUR3F6L3BjY3A4Q3czWXdLQlZlK00vQTE3a1Q3TklLWStad285cUFVeHh3NnFPckpZOUlzUg0KUWNJYktxK3dLZDgyL1ZiK3FQblIyVjNxb1B0U1k0djBTOCtBUXpnelZDNVNtMkVoQ1ExYnRXOG15QTFpZk9XLw0KZjhpNFcwc0NnWUVBL1BhVzlXWE1OVktKeXppdWNkbm12TllZZlZtbjFDK2plVjRjQVY1bE5PdHMrSEZZZVdEUQ0KRTJpTDRrSEVDajlaZVhGclk0UTEwc2dqOXkrQ3VRQldLQVRBLzFvN0dTT281bExGN1I1UWthMzhTTHlxSlR1RQ0KV1h6U0VFLzY2bEcvMXVDRVEzZ292V0EzcVJsdzJ5TEMzUWtZZ054cXpKT1RXZWNETWhxdkFjY0NnWUVBeHBNMg0KczZqczJZSEVZekJpMUpSN21lQmt4TTdIelpMMFFOSnp6d2pDY1h5K2E2NXFjcWZuWmtKaHg2emxJZS9zS2hXVg0KN0FHSXJoREtvbVdncC85ZUlscEdUWC9rQzFHRCtqQXg2WkpvckwvZC9HR3dUZzZrMDk1M1pERURoOUhJeXZFWA0KMmFwME05K3FTQlB6QmdyS3JnOTd5c0JTWWFkUmRLTG5US0JsZGxjQ2dZRUExSDRmMlF3bU9qU1hZNHE5bncyMw0KOGJDMjZiVkNjYytDdHhVQzJYTjkrTEk2MjRmN0ZocnBMeVNIUFF5WnJUSUI2eTRIVTVWZjBTd21haUlTNFcwUw0KOHBMcnZKVURSOTdZcG9HcG1jSDVWQ2FlNGtyNWNrVklyQk5hTWpHOVNOQmJJaGwvZ1YyU2UySXozMnhyak9qcQ0KWDlxZ0pyOEJSOUEvMnlsZldkdG9YMGtDZ1lFQWpCN3pPYUZZeUQ2bWVxdDVBYkpvNlhNTENFazFlaDFaVjZocA0KYWMwdmorOUxXeWF2SElyWVlUTTBWamJ0Vko0OUVwRTZ3bGR1d0EwL1A0cmc2OHJwL09tZ3RDMHJtTVVEa1BhVA0KTWROTEk2TWNIR3crZ1VZYUR4cnJPbnJQbC9aemJxampnSWVrQ2JxcEtNVlM5bytFNTRBcmhTMWl0Ri9odmFENQ0KLy9zcXZXOENnWUVBa3NrN05QRkhqSXpaa3ZDa21zaGd2cHlLY0lPMjZIVGdXbDRjWFU5Q0NDNzNTT2dpb3daYg0KQ0FYOW5pK2ZoMjA1TXZoVVJhbWs0MHBBK1UxcjBvTytiSHgwQnZja1RvZnk4UzVwbXlVSnJOQ0c5cE9OUUlMbA0KeWl0bWhPUnMvUzkzK2VqZ1BVa3NRTllNSUlnWTRCbWF6Z1NyMzR3L0U0UlRpSGhaQ2RkKytnST0NCi0tLS0tRU5EIFJTQSBQUklWQVRFIEtFWS0tLS0t",
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
		this.logger.info('Creating new session in Yoti')
    const sessionID = await this.yotiService.createSession();

		this.logger.info('Fetching Session InfoF')
    const sessionInfo = await this.yotiService.fetchSessionInfo(sessionID);

    const requirements = sessionInfo.capture.required_resources
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

		this.logger.info('Generating Instructions PDF')
    await this.yotiService.generateInstructions(
      sessionID,
      requirements
    );

		this.logger.info('Fetching Instructions PDF')
    const pdf = await this.yotiService.fetchInstructionsPdf(
      sessionID
    );

    return {
      statusCode: 200,
      body: pdf,
    };
  }
}
