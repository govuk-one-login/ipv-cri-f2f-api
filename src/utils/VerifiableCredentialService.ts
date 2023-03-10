import { Logger } from "@aws-lambda-powertools/logger";
import { VerifiedCredential } from "./IVeriCredential";
import { KmsJwtAdapter } from "./KmsJwtAdapter";
import { ISessionItem } from "../models/ISessionItem";
import { AppError } from "./AppError";
import { HttpCodesEnum } from "./HttpCodesEnum";
import { Constants } from "./Constants";

export class VerifiableCredentialService {
    readonly tableName: string;

    readonly logger: Logger;

	readonly issuer: string;

    private readonly kmsJwtAdapter: KmsJwtAdapter;

    private static instance: VerifiableCredentialService;

    constructor(tableName: any, kmsJwtAdapter: KmsJwtAdapter, issuer: any, logger: Logger ) {
    	this.issuer = issuer;
    	this.tableName = tableName;
    	this.logger = logger;
    	this.kmsJwtAdapter = kmsJwtAdapter;
    }

    static getInstance(tableName: string, kmsJwtAdapter: KmsJwtAdapter, issuer: string, logger: Logger): VerifiableCredentialService {
    	if (!VerifiableCredentialService.instance) {
    		VerifiableCredentialService.instance = new VerifiableCredentialService(tableName, kmsJwtAdapter, issuer, logger);
    	}
    	return VerifiableCredentialService.instance;
    }

    async generateSignedVerifiableCredentialJwt(sessionItem: ISessionItem | undefined, getNow: () => number): Promise<string> {
    	const now = getNow();
    	const subject = sessionItem?.clientId as string;
    	const verifiedCredential: VerifiedCredential = new VerifiableCredentialBuilder(sessionItem?.full_name, sessionItem?.date_of_birth, sessionItem?.document_selected, sessionItem?.date_of_expiry)
    		.build();
    	const result = {
    		iat: now,
    		iss: this.issuer,
    		aud: this.issuer,
    		sub: subject,
    		nbf: now,
    		exp: now + Constants.CREDENTIAL_EXPIRY,
    		vc: verifiedCredential,
    	};

    	try {
    		// Sign the VC
    		const signedVerifiedCredential = await this.kmsJwtAdapter.sign(result);
    		return signedVerifiedCredential;
    	} catch (error) {
    		throw new AppError( "Failed to sign Jwt", HttpCodesEnum.SERVER_ERROR);
    	}
    }
}
class VerifiableCredentialBuilder {
    private readonly credential: VerifiedCredential;

    constructor(full_name: string | undefined, date_of_birth: string | undefined, document_selected: string | undefined, date_of_expiry: string | undefined) {
    	this.credential = {
    		"@context": [
    			Constants.W3_BASE_CONTEXT,
    			Constants.DI_CONTEXT,
    		],
    		type: [
    			Constants.VERIFIABLE_CREDENTIAL,
    			Constants.CLAIMED_IDENTITY_CREDENTIAL_TYPE,
    		],
    		credentialSubject: {
    			fullName: [
    				{ value: full_name }],
    			dateOfBirth: date_of_birth,
    			documentType: document_selected,
    			dateOfExpiry: date_of_expiry,
    		},
    	};
    }

    build(): VerifiedCredential {
    	return this.credential;
    }
}
