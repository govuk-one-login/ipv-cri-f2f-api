import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { VerifiableCredentialService } from "./VerifiableCredentialService";
import { KmsJwtAdapter } from "../utils/KmsJwtAdapter";
import { AuthSessionState } from "../models/enums/AuthSessionState";
import { GenerateVerifiableCredential } from "./GenerateVerifiableCredential";
import { YotiSessionDocument } from "../utils/YotiPayloadEnums";
import { MessageCodes } from "../models/enums/MessageCodes";
import { DocumentNames, DocumentTypes } from "../models/enums/DocumentTypes";
import { DrivingPermit, IdentityCard, Passport, ResidencePermit, Name } from "../utils/IVeriCredential";
import { personIdentityUtils } from "../utils/PersonIdentityUtils";

export class ThankYouEmailProcessor {

  private static instance: ThankYouEmailProcessor;

  private readonly logger: Logger;

  private readonly metrics: Metrics;

  private readonly yotiService: YotiService;

  private readonly environmentVariables: EnvironmentVariables;

  constructor(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
  ) {
  	this.logger = logger;
  	this.metrics = metrics;
  	this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.CALLBACK_SERVICE);
  	this.yotiService = YotiService.getInstance(this.logger, this.environmentVariables.yotiSdk(), this.environmentVariables.resourcesTtlInSeconds(), this.environmentVariables.clientSessionTokenTtlInDays(), YOTI_PRIVATE_KEY, this.environmentVariables.yotiBaseUrl());
  }

  static getInstance(
  	logger: Logger,
  	metrics: Metrics,
  	YOTI_PRIVATE_KEY: string,
  ): ThankYouEmailProcessor {
  	if (!ThankYouEmailProcessor.instance) {
  		ThankYouEmailProcessor.instance = new ThankYouEmailProcessor(
  			logger,
  			metrics,
  			YOTI_PRIVATE_KEY,
  		);
  	}
  	return ThankYouEmailProcessor.instance;
  }

  processRequest(eventBody: any): void {
  	console.log("hi");
  }
}
