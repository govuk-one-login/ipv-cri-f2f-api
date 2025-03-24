import format from "ecdsa-sig-formatter";
import { Buffer } from "buffer";
import { Jwt, JwtHeader, JwtPayload, JsonWebTokenError, Jwk } from "./IVeriCredential";
import { jwtUtils } from "./JwtUtils";
import { DecryptCommand, DecryptCommandInput, DecryptCommandOutput } from "@aws-sdk/client-kms";
import crypto from "crypto";
import { importJWK, JWTPayload, jwtVerify } from "jose";
import axios from "axios";
import { createKmsClient } from "./KMSClient";
import * as AWS from "@aws-sdk/client-kms";

export class KmsJwtAdapter {
	readonly kid: string;	

	readonly kms: AWS.KMS;

	/**
	 * An implemention the JWS standard using KMS to sign Jwts
	 *
	 * kid: The key Id of the KMS key
	 */
	constructor(kid: string) {
		this.kid = kid;
		this.kms = createKmsClient();
	}

	async sign(jwtPayload: JwtPayload, dnsSuffix: string): Promise<string> {
		const jwtHeader: JwtHeader = { alg: "ES256", typ: "JWT" };
		const kid = this.kid.split("/").pop();
		if (kid != null) {
			jwtHeader.kid = (`did:web:${dnsSuffix}#${jwtUtils.getHashedKid(kid)}`);
		}
		const tokenComponents = {
			header: jwtUtils.base64Encode(JSON.stringify(jwtHeader)),
			payload: jwtUtils.base64Encode(JSON.stringify(jwtPayload)),
			signature: "",
		};
		const params = {
			Message: Buffer.from(`${tokenComponents.header}.${tokenComponents.payload}`),
			KeyId: this.kid,
			SigningAlgorithm: AWS.SigningAlgorithmSpec.ECDSA_SHA_256,
			MessageType: AWS.MessageType.RAW,
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
				SigningAlgorithm: AWS.SigningAlgorithmSpec.ECDSA_SHA_256,
			});
			return result.SignatureValid ?? false;
		} catch (error) {
			throw new Error("Failed to verify signature: " + error);
		}
	}

	async verifyWithJwks(urlEncodedJwt: string, publicKeyEndpoint: string): Promise<JWTPayload | null> {
		const oidcProviderJwks = (await axios.get(publicKeyEndpoint)).data;
		const signingKey = oidcProviderJwks.keys.find((key: Jwk) => key.use === "sig");
		const publicKey = await importJWK(signingKey, signingKey.alg);

		try {
			const { payload } = await jwtVerify(urlEncodedJwt, publicKey);
			return payload;
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

	async decrypt(serializedJwe: string): Promise<string> {
		const jweComponents = serializedJwe.split(".");
		if (jweComponents.length !== 5) {
			throw new JsonWebTokenError("Error decrypting JWE: Missing component");
		}

		const [
			protectedHeader,
			encryptedKey,
			iv,
			ciphertext,
			tag,
		] = jweComponents;

		let cek: Uint8Array;
		try {
			const inputs: DecryptCommandInput = {
				CiphertextBlob: jwtUtils.base64DecodeToUint8Array(encryptedKey),
				EncryptionAlgorithm: "RSAES_OAEP_SHA_256",
				KeyId: process.env.ENCRYPTION_KEY_IDS,
			};

			const output: DecryptCommandOutput = await this.kms.send(
				new DecryptCommand(inputs),
			);

			const plaintext = output.Plaintext ?? null;

			if (plaintext === null) {
				throw new Error("No Plaintext received when calling KMS to decrypt the Encryption Key");
			}
			cek = plaintext;
		} catch (err) {
			throw new JsonWebTokenError("Error decrypting JWE: Unable to decrypt encryption key via KMS", err);
		}

		let payload: Uint8Array;
		try {
			const webcrypto = crypto.webcrypto as unknown as Crypto;
			const cek1 = await webcrypto.subtle.importKey("raw", cek, "AES-GCM", false, ["decrypt"]);
			const decryptedBuffer = await webcrypto.subtle.decrypt(
				{
					name: "AES-GCM",
					iv: jwtUtils.base64DecodeToUint8Array(iv),
					additionalData: new Uint8Array(Buffer.from(protectedHeader)),
					tagLength: 128,
				},
				cek1,
				Buffer.concat([new Uint8Array(jwtUtils.base64DecodeToUint8Array(ciphertext)), new Uint8Array(jwtUtils.base64DecodeToUint8Array(tag))]),
			);

			payload = new Uint8Array(decryptedBuffer);
		} catch (err) {
			throw new JsonWebTokenError("Error decrypting JWE: Unable to decrypt payload via Crypto", err);
		}

		try {
			return jwtUtils.decode(payload);
		} catch (err) {
			throw new JsonWebTokenError("Error decrypting JWE: Unable to decode the decrypted payload", err);
		}
	}
}
