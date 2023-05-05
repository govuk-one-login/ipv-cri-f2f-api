import { Logger } from "@aws-lambda-powertools/logger";
import { KmsJwtAdapter } from "../utils/KmsJwtAdapter";
import { ISessionItem } from "../models/ISessionItem";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { Constants } from "../utils/Constants";
import {
	VerifiedCredential,
	VerifiedCredentialEvidence,
	VerifiedCredentialSubject,
} from "../utils/IVeriCredential";

export class VerifiableCredentialService {

  readonly tableName: string;

  readonly logger: Logger;

  readonly issuer: string;

  private readonly kmsJwtAdapter: KmsJwtAdapter;

  private static instance: VerifiableCredentialService;

  private constructor(
  	tableName: string,
  	kmsJwtAdapter: KmsJwtAdapter,
  	issuer: string,
  	logger: Logger,
  ) {
  	this.issuer = issuer;
  	this.tableName = tableName;
  	this.logger = logger;
  	this.kmsJwtAdapter = kmsJwtAdapter;
  }

  static getInstance(
  	tableName: string,
  	kmsJwtAdapter: KmsJwtAdapter,
  	issuer: string,
  	logger: Logger,
  ): VerifiableCredentialService {
  	if (!VerifiableCredentialService.instance) {
  		VerifiableCredentialService.instance = new VerifiableCredentialService(tableName, kmsJwtAdapter, issuer, logger);
  	}
  	return VerifiableCredentialService.instance;
  }

  async generateSignedVerifiableCredentialJwt(
  	sessionItem: ISessionItem | undefined,
  	credentialSubject: VerifiedCredentialSubject,
  	evidence: VerifiedCredentialEvidence,
  	getNow: () => number,
  ): Promise<string> {
  	const now = getNow();
  	const subject = sessionItem?.subject as string;
  	const verifiedCredential: VerifiedCredential = this.buildVerifiableCredential(credentialSubject, evidence);
  	const result = {
  		sub: subject,
  		nbf: now,
  		iss: this.issuer,
  		iat: now,
  		vc: verifiedCredential,
  	};

  	this.logger.info({ message: "Verified Credential jwt: " }, result);
  	try {
  		// Sign the VC
  		const signedVerifiedCredential = await this.kmsJwtAdapter.sign(result);
  		return signedVerifiedCredential;
  	} catch (error) {
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to sign Jwt");
  	}
  }

  private buildVerifiableCredential(
  	credentialSubject: VerifiedCredentialSubject,
  	evidence: VerifiedCredentialEvidence,
  ): VerifiedCredential {
  	return {
  		"@context": [Constants.W3_BASE_CONTEXT, Constants.DI_CONTEXT],
  		type: [
  			Constants.VERIFIABLE_CREDENTIAL,
  			Constants.IDENTITY_CHECK_CREDENTIAL,
  		],
  		credentialSubject,
  		evidence,
  	};
  }
}
