import format from "ecdsa-sig-formatter";
import { Buffer } from "buffer";
import { Jwt, JwtHeader, JwtPayload } from "./IVeriCredential";
import * as AWS from "@aws-sdk/client-kms";
import { jwtUtils } from "./JwtUtils";
import { DecryptCommand, DecryptCommandInput, DecryptCommandOutput } from "@aws-sdk/client-kms";

export class KmsJwtAdapter {
    readonly kid: string;

    private kms = new AWS.KMS({
    	region: process.env.REGION,
    });

    /**
     * An implemention the JWS standard using KMS to sign Jwts
     *
     * kid: The key Id of the KMS key
     */
    ALG = "ECDSA_SHA_256";

    constructor(kid: string) {
    	this.kid = kid;
    }

    async sign(jwtPayload: JwtPayload): Promise<string> {
    	const jwtHeader: JwtHeader = { alg: "ES256", typ: "JWT" };
    	const kid = this.kid.split("/").pop();
    	if (kid != null) {
    		jwtHeader.kid = kid;
    	}
    	const tokenComponents = {
    		header: jwtUtils.base64Encode(JSON.stringify(jwtHeader)),
    		payload: jwtUtils.base64Encode(JSON.stringify(jwtPayload)),
    		signature: "",
    	};
    	const params = {
    		Message: Buffer.from(`${tokenComponents.header}.${tokenComponents.payload}`),
    		KeyId: this.kid,
    		SigningAlgorithm: this.ALG,
    		MessageType: "RAW",
    	};
    	const res = await this.kms.sign(params);
    	if (res.Signature == null) {
    		throw new Error("Failed to sign Jwt");
    	}
    	tokenComponents.signature = format.derToJose(Buffer.from(res.Signature).toString("base64"), "ES256");
    	return `${tokenComponents.header}.${tokenComponents.payload}.${tokenComponents.signature}`;
    }

    async verify(urlEncodedJwt: string): Promise<boolean> {
    	const [header, payload, signature] = urlEncodedJwt.split(".");
    	const message = Buffer.from(`${header}.${payload}`);
    	try {
    		const derSignature = format.joseToDer(signature, "ES256");
    		const result = await this.kms.verify({
    			KeyId: this.kid,
    			Message: message,
    			MessageType: "RAW",
    			Signature: derSignature,
    			SigningAlgorithm: this.ALG,
    		});
    		return result.SignatureValid ?? false;
    	} catch (error) {
    		throw new Error("Failed to verify signature: " + error);
    	}
    }

    decode(urlEncodedJwt: string): Jwt {
    	const [header, payload, signature] = urlEncodedJwt.split(".");

    	const result: Jwt = {
    		header: JSON.parse(jwtUtils.base64DecodeToString(header)),
    		payload: JSON.parse(jwtUtils.base64DecodeToString(payload)),
    		signature,
    	};
    	return result;
    }

    async decrypt(encrypted: Uint8Array): Promise<Uint8Array> {
    	const inputs: DecryptCommandInput = {
    		CiphertextBlob: encrypted,
    		EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
    		KeyId: this.kid,
    	};

    	const output: DecryptCommandOutput = await this.kms.send(
    		new DecryptCommand(inputs),
    	);

    	const plaintext = output.Plaintext ?? null;

    	if (plaintext === null) {
    		throw new Error("No Plaintext received when calling KMS to decrypt the Encryption Key");
    	}
    	return plaintext;
    }
}
