import { Logger } from "@aws-lambda-powertools/logger";
import { KmsJwtAdapter } from "../utils/KmsJwtAdapter";
import { ISessionItem } from "../models/ISessionItem";
import { AppError } from "../utils/AppError";
import { HttpCodesEnum } from "../utils/HttpCodesEnum";
import { Constants } from "../utils/Constants";
import { randomUUID } from "crypto";
import { VerifiedCredential } from "../utils/IVeriCredential";
import { PersonIdentityItem } from "../models/PersonIdentityItem";

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

    async generateSignedVerifiableCredentialJwt(sessionItem: ISessionItem | undefined, personIdentityItem: PersonIdentityItem | undefined, getNow: () => number): Promise<string> {
    	const now = getNow();
    	const subject = sessionItem?.subject as string;
    	//TODO: Filling in given user details from personIdentityTable for now, details will be pulled from Yoti response as part of F2F-502
    	const verifiedCredential: VerifiedCredential = new VerifiableCredentialBuilder(personIdentityItem?.name, personIdentityItem?.birthDate)
    		.build();
    	const result = {
    		sub: subject,
    		nbf: now,
    		iss: this.issuer,
    		iat: now,
    		vc: verifiedCredential,
    	};

    	this.logger.info({ message: "Verified Credential jwt: " }, JSON.stringify(result));
    	try {
    		// Sign the VC
    		const signedVerifiedCredential = await this.kmsJwtAdapter.sign(result);
    		return signedVerifiedCredential;
    	} catch (error) {
    		throw new AppError( HttpCodesEnum.SERVER_ERROR, "Failed to sign Jwt" );
    	}
    }
}
class VerifiableCredentialBuilder {
    private readonly credential: VerifiedCredential;

    constructor(nameParts: any, date_of_birth: any) {
    	this.credential = {
    		"@context": [
    			Constants.W3_BASE_CONTEXT,
    			Constants.DI_CONTEXT,
    		],
    		type: [
    			Constants.VERIFIABLE_CREDENTIAL,
    			Constants.IDENTITY_CHECK_CREDENTIAL,
    		],
    		credentialSubject: {
    			name: nameParts,
    			birthDate: date_of_birth,
    		},
    	};
    }

    build(): VerifiedCredential {
    	return this.credential;
    }

}
