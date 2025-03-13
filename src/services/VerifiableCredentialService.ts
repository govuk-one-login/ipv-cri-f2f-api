import { Logger } from "@aws-lambda-powertools/logger";
import { KmsJwtAdapter } from "../utils/KmsJwtAdapter";
import { ISessionItem } from "../models/ISessionItem";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { Constants } from "../utils/Constants";
import {
	CredentialJwt,
	VerifiedCredential,
	VerifiedCredentialEvidence,
	VerifiedCredentialSubject,
} from "../utils/IVeriCredential";
import { randomUUID } from "crypto";

export class VerifiableCredentialService {

  readonly tableName: string;

  readonly logger: Logger;

  readonly issuer: string;

  readonly dnsSuffix: string;	

  private readonly kmsJwtAdapter: KmsJwtAdapter;

  private static instance: VerifiableCredentialService;

  private constructor(
  	tableName: string,
  	kmsJwtAdapter: KmsJwtAdapter,
  	issuer: string,
  	logger: Logger,
  	dnsSuffix: string,
  ) {
  	this.issuer = issuer;
  	this.tableName = tableName;
  	this.logger = logger;
  	this.kmsJwtAdapter = kmsJwtAdapter;
  	this.dnsSuffix = dnsSuffix;
  }

  static getInstance(
  	tableName: string,
  	kmsJwtAdapter: KmsJwtAdapter,
  	issuer: string,
  	logger: Logger,
  	dnsSuffix: string,
  ): VerifiableCredentialService {
  	if (!VerifiableCredentialService.instance) {
  		VerifiableCredentialService.instance = new VerifiableCredentialService(tableName, kmsJwtAdapter, issuer, logger, dnsSuffix);
  	}
  	return VerifiableCredentialService.instance;
  }

  async signGeneratedVerifiableCredentialJwt(result: CredentialJwt): Promise<string> {
  	try {
  		if (result) {
  			// Sign the VC
  			const signedJwt = await this.kmsJwtAdapter.sign(result, this.dnsSuffix);
  			this.logger.info({ message: "Successfully Signed Generated Verified Credential jwt" });
  			return signedJwt;
  		}
  		return "";
		// ignored so as not log PII
		/* eslint-disable @typescript-eslint/no-unused-vars */
  	} catch (error) {
  		throw new AppError(HttpCodesEnum.SERVER_ERROR, "Failed to sign Jwt");
  	}
  }

  generateVerifiableCredentialJwt(
  	sessionItem: ISessionItem | undefined,
  	credentialSubject: VerifiedCredentialSubject,
  	evidence: VerifiedCredentialEvidence,
  	getNow: () => number,
  ): CredentialJwt {
  	const now = getNow();
  	const subject = sessionItem?.subject as string;
  	const verifiedCredential: VerifiedCredential = this.buildVerifiableCredential(credentialSubject, evidence);
  	const result: CredentialJwt = {
  		sub: `${subject}`,
  		nbf: now,
  		iss: this.issuer,
  		iat: now,
  		jti: Constants.URN_UUID_PREFIX + randomUUID(),
  		vc: verifiedCredential,
  	};

  	this.logger.info({ message: "Generated Verified Credential jwt" });
  	return result;
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
