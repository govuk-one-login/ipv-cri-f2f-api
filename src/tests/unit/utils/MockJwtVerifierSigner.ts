import { absoluteTimeNow } from "../../../utils/DateTimeUtils";
import { Jwt, JwtPayload } from "../../../utils/IVeriCredential";

const ACCESS_TOKEN = "ACCESS_TOKEN";
const testJwt = {
		header: {
			"alg": "ES256",
			"typ": "JWT",
			"kid": "5d6ec7413ae8bf2ea7c416e766ba9b9299b67eaf9e14f984e2f798a48bf6c921"
		},
		payload: {
			"iss": "https://ipv.core.account.gov.uk",
			"sub": "5ad58c01-3672-4e22-bd1b-9151f3d766c1",
			"aud": "https://review-o.dev.account.gov.uk",
			"jti": "4b5067a335b158598eb217887cfe8322",
			"iat": 1749636899,
			exp: absoluteTimeNow() + 1000,
		},
		signature: "testSignature",
	};
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
	decode(_urlEncodedJwt: string): Jwt { return testJwt }
	verifyWithJwks(jwt: Jwt, jwksEndpoint: string, kid: string) {
		return jwt;
	}
}

export class MockKmsSigningTokenJwtAdapter {
	sign(_jwtPayload: JwtPayload): string { return ACCESS_TOKEN; }
	decode(_urlEncodedJwt: string): Jwt { return testJwt }
	verifyWithJwks(jwt: Jwt, jwksEndpoint: string, kid: string) {
		return jwt;
	}
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
