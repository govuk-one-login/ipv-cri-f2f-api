import { absoluteTimeNow } from "../../../utils/DateTimeUtils";
import { Jwt, JwtPayload } from "../../../utils/IVeriCredential";

const ACCESS_TOKEN = "ACCESS_TOKEN";

export class MockKmsJwtAdapter {
    result: boolean;

    mockJwt: Jwt;

    constructor(result: boolean, mockJwT: Jwt = {
    	header: {
    		alg: "alg",
    		typ: "typ",
    		kid: "kid",
    	},
    	payload: {
    		iss: "issuer",
    		sub: "sessionId",
    		aud: "audience",
    		exp: absoluteTimeNow() + 1000,
    	},
    	signature: "testSignature",
    },
    ) {
    	this.result = result;
    	this.mockJwt = mockJwT;
    }

	// ignored so as not log PII
	/* eslint-disable @typescript-eslint/no-unused-vars */
    verify(_urlEncodedJwt: string): boolean { return this.result; }
	
	// ignored so as not log PII
	/* eslint-disable @typescript-eslint/no-unused-vars */
    decode(_urlEncodedJwt: string): Jwt { return this.mockJwt; }

	// ignored so as not log PII
	/* eslint-disable @typescript-eslint/no-unused-vars */
    sign(_jwtPayload: JwtPayload): string { return "signedJwt-test"; }
}

export class MockFailingKmsSigningJwtAdapter {

	sign(_jwtPayload: JwtPayload): string { throw new Error("Failed to sign Jwt"); }
}

export class MockKmsSigningTokenJwtAdapter {

	sign(_jwtPayload: JwtPayload): string { return ACCESS_TOKEN; }
}

export class MockKmsJwtAdapterForVc {
    result: boolean;

    constructor(result: boolean) {
    	this.result = result;
    }

    verify(_urlEncodedJwt: string): boolean { return this.result; }

    sign(jwtPayload: JwtPayload): string {
    	return JSON.stringify(jwtPayload);
    }
}
