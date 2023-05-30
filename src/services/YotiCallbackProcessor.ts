import { Response } from "../utils/Response";
import { F2fService } from "./F2fService";
import { Metrics } from "@aws-lambda-powertools/metrics";
import { AppError } from "../utils/AppError";
import { Logger } from "@aws-lambda-powertools/logger";
import { YotiService } from "./YotiService";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { createDynamoDbClient } from "../utils/DynamoDBFactory";
import { buildCoreEventFields } from "../utils/TxmaEvent";
import { absoluteTimeNow } from "../utils/DateTimeUtils";
import { EnvironmentVariables } from "./EnvironmentVariables";
import { ServicesEnum } from "../models/enums/ServicesEnum";
import { VerifiableCredentialService } from "./VerifiableCredentialService";
import { KmsJwtAdapter } from "../utils/KmsJwtAdapter";
import { AuthSessionState } from "../models/enums/AuthSessionState";

export class YotiCallbackProcessor {

  	private static instance: YotiCallbackProcessor;

  	private readonly logger: Logger;

  	private readonly metrics: Metrics;

  	private readonly yotiService: YotiService;

  	private readonly f2fService: F2fService;

		private readonly environmentVariables: EnvironmentVariables;

		private readonly verifiableCredentialService: VerifiableCredentialService;

		private readonly kmsJwtAdapter: KmsJwtAdapter;

  	constructor(logger: Logger, metrics: Metrics, YOTI_PRIVATE_KEY: string) {
  		this.logger = logger;
  		this.metrics = metrics;
			this.environmentVariables = new EnvironmentVariables(logger, ServicesEnum.CALLBACK_SERVICE);
			this.yotiService = YotiService.getInstance(this.logger, this.environmentVariables.yotiSdk(), this.environmentVariables.resourcesTtlInSeconds(), this.environmentVariables.clientSessionTokenTtlInSeconds(), YOTI_PRIVATE_KEY, this.environmentVariables.yotiBaseUrl());
			this.f2fService = F2fService.getInstance(this.environmentVariables.sessionTable(), this.logger, createDynamoDbClient());
			this.kmsJwtAdapter = new KmsJwtAdapter(this.environmentVariables.kmsKeyArn());
			this.verifiableCredentialService = VerifiableCredentialService.getInstance(this.environmentVariables.sessionTable(), this.kmsJwtAdapter, this.environmentVariables.issuer(), this.logger);
  	}

  	static getInstance(
  		logger: Logger,
  		metrics: Metrics,
  		YOTI_PRIVATE_KEY: string,
  	): YotiCallbackProcessor {
  		if (!YotiCallbackProcessor.instance) {
  			YotiCallbackProcessor.instance =
        new YotiCallbackProcessor(logger, metrics, YOTI_PRIVATE_KEY);
  		}
  		return YotiCallbackProcessor.instance;
  	}

  	async processRequest(eventBody: any): Promise<Response> {

  		const yotiSessionID = eventBody.session_id;

			this.logger.info({ message:"Fetching status for Yoti SessionID" }, { yotiSessionID });
  		const completedYotiSessionInfo = await this.yotiService.getCompletedSessionInfo(yotiSessionID);

			if (!completedYotiSessionInfo) {
				//TODO: Throw alarm here
				this.logger.error({ message:"No YOTI Session found with ID:" }, { yotiSessionID });
				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti Session not found");
		 }

			if (completedYotiSessionInfo.state !== "COMPLETED") {
				this.logger.error({ message:"Session in Yoti does not have status COMPLETED" }, { yotiSessionID });
				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Yoti Session not complete", { shouldThrow: true });
		 }

		 this.logger.info({ message:"Fetching F2F Session info with Yoti SessionID" }, { yotiSessionID });
		 const f2fSession = await this.f2fService.getSessionByYotiId(yotiSessionID);

		 if (!f2fSession) {
				//TODO: Throw alarm here
				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing Info in Session Table");
		 }

		 const f2fSessionId = f2fSession.sessionId;
		 const f2fIndentityInfo = await this.f2fService.getPersonIdentityById(f2fSessionId, this.environmentVariables.personIdentityTableName());

		 if (!f2fIndentityInfo) {
				//TODO: Throw alarm here
				throw new AppError(HttpCodesEnum.SERVER_ERROR, "Missing Info in Person Identity Table");
			}

			// Validate the AuthSessionState to be "F2F_ACCESS_TOKEN_ISSUED"
			if (f2fSession.authSessionState === AuthSessionState.F2F_ACCESS_TOKEN_ISSUED ||
				f2fSession.authSessionState === AuthSessionState.F2F_AUTH_CODE_ISSUED) {


				try {
					await this.f2fService.sendToTXMA({
						event_name: "F2F_YOTI_END",
						...buildCoreEventFields(f2fSession, this.environmentVariables.issuer(), f2fSession.clientIpAddress, absoluteTimeNow),
					});
				} catch (error) {
					this.logger.error("Failed to write TXMA event F2F_YOTI_END to SQS queue.");
				}

				let signedJWT;
				try {
					signedJWT = await this.verifiableCredentialService.generateSignedVerifiableCredentialJwt(f2fSession, f2fIndentityInfo, absoluteTimeNow);
				} catch (error) {
					if (error instanceof AppError) {
						this.logger.error({ message: "Error generating signed verifiable credential jwt: " + error.message });
						return new Response(HttpCodesEnum.SERVER_ERROR, "Failed to sign the verifiableCredential Jwt");
					}
				}

				if (!signedJWT) {
				//TODO: Throw alarm here
					throw new AppError(HttpCodesEnum.SERVER_ERROR, "Unable to create signed JWT");
				}

				try {
					await this.f2fService.sendToIPVCore({
						sub: f2fSession.subject,
						state: f2fSession.state,
						"https://vocab.account.gov.uk/v1/credentialJWT": signedJWT,
					});
				} catch (error) {
					this.logger.error({ message: "Failed to send VC to IPV Core Queue" }, { error });
					throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to send to IPV Core", { shouldThrow: true });
				}

				try {
					await this.f2fService.sendToTXMA({
						event_name: "F2F_CRI_VC_ISSUED",
						...buildCoreEventFields(f2fSession, this.environmentVariables.issuer(), f2fSession.clientIpAddress, absoluteTimeNow),
					});
				} catch (error) {
					this.logger.error("Failed to write TXMA event F2F_CRI_VC_ISSUED to SQS queue.");
				}

				await this.f2fService.updateSessionAuthState(f2fSession.sessionId, AuthSessionState.F2F_CREDENTIAL_ISSUED);

				return new Response(HttpCodesEnum.OK, "OK");
			} else {
				return new Response(HttpCodesEnum.UNAUTHORIZED, `AuthSession is in wrong Auth state: Expected state- ${AuthSessionState.F2F_ACCESS_TOKEN_ISSUED} or ${AuthSessionState.F2F_AUTH_CODE_ISSUED}, actual state- ${f2fSession.authSessionState}`);
			}
  	}
}
