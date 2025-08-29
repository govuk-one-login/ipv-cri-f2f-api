import { handlerClass, lambdaHandler, logger} from "../../JwksHandler";
import { Jwk, Algorithm } from "../../utils/IVeriCredential";
import crypto from "crypto";

jest.mock("@aws-lambda-powertools/logger", () => ({
	Logger: jest.fn().mockImplementation(() => ({
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
	})),
}));

jest.mock("@aws-sdk/client-kms", () => ({
	KMS: jest.fn().mockImplementation(() => ({
		getPublicKey: jest.fn(),
	})),
}));

jest.mock("crypto", () => ({
	createPublicKey: jest.fn().mockImplementation(() => ({
		export: jest.fn().mockImplementation(() => ({
			key: "123456789",
		})),
	})),
}));

jest.mock("@aws-sdk/client-s3", () => ({
	S3Client: jest.fn().mockImplementation(() => ({
		send: jest.fn(),
	})),
	PutObjectCommand: jest.fn().mockImplementation((args) => args),
	CopyObjectCommand: jest.fn().mockImplementation((args) => args),
}));

jest.mock("../../utils/JwtUtils", () => ({
	jwtUtils: {
		getHashedKid: jest.fn().mockImplementation((args) => {return args;}),
	},
}));

describe("JwksHandler", () => {
	describe("#handler", () => {
		beforeEach(() => {
			jest.clearAllMocks(); 
		});

		it("uploads keys to s3", async () => {
			const body = {
				keys: [],
			};
    
			await lambdaHandler();

			expect(logger.info).toHaveBeenNthCalledWith(1, { message:"Building wellknown JWK endpoint with keys" + ["f2f-cri-api-vc-signing-key", "EncryptionKeyArn"] });
			expect(handlerClass.s3Client.send).toHaveBeenCalledWith({
				Bucket: "f2f-cri-api-jwks-dev",
				Key: ".well-known/jwks.json",
				Body: JSON.stringify(body),
				ContentType: "application/json",
			});
		});

		it("copies keys from jwks bucket to published keys bucket", async () => {
			await lambdaHandler();

			expect(logger.info).toHaveBeenCalledWith({ message: "Copying keys to published keys bucket" });
			expect(handlerClass.s3Client.send).toHaveBeenCalledWith({
				Bucket: "published-keys-bucket",
				Key: "jwks.json",
				CopySource: "f2f-cri-api-jwks-dev/.well-known/jwks.json",
			});
			expect(logger.info).toHaveBeenCalledWith({ message: "Keys copied to published keys bucket" });
		});
	});

	describe("#getAsJwk", () => {
		it("gets the kms key with the given KeyId and returns jwk with public key", async () => {
			const keyId = "f2f-cri-api-vc-signing-key";
			// pragma: allowlist nextline secret
			const publicKey = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAES4sDJifz8h3GDznZZ6NC3QN5qlQn8Zf2mck4yBmlwqvXzZu7Wkwc4QuOxXhGHXamfkoG5d0UJVXJwwvFxiSzRQ==";
			jest.spyOn(handlerClass.kmsClient, "getPublicKey").mockImplementationOnce(() => ({
				KeySpec: "ECC_NIST_P256",
				KeyId: keyId,
				KeyUsage: "ENCRYPT_DECRYPT",
				PublicKey: publicKey,
			}));

			const result = await handlerClass.getAsJwk(keyId);

			expect(handlerClass.kmsClient.getPublicKey).toHaveBeenCalledWith({ KeyId: keyId });
			expect(crypto.createPublicKey).toHaveBeenCalledWith({
				key: publicKey as unknown as Buffer,
				type: "spki",
				format: "der",
			});
			expect(result).toEqual({
				key: "123456789",
				use: "enc",
				kid: keyId.split("/").pop(),
				alg: "ES256" as Algorithm,
			} as unknown as Jwk);
		});

		it("logs error if no key is fetched", async () => {
			const keyId = "f2f-cri-api-vc-signing-key";
			jest.spyOn(handlerClass.kmsClient, "getPublicKey").mockImplementationOnce(() => null);

			const result = await handlerClass.getAsJwk(keyId);

			expect(logger.error).toHaveBeenCalledWith({ message: "Failed to build JWK from key" + keyId }, undefined);
			expect(result).toBeNull();
		});

		it("logs error if fetched key does not contain KeySpec", async () => {
			const keyId = "f2f-cri-api-vc-signing-key";
			// pragma: allowlist nextline secret
			const publicKey = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAES4sDJifz8h3GDznZZ6NC3QN5qlQn8Zf2mck4yBmlwqvXzZu7Wkwc4QuOxXhGHXamfkoG5d0UJVXJwwvFxiSzRQ==";
			jest.spyOn(handlerClass.kmsClient, "getPublicKey").mockImplementationOnce(() => ({
				KeyId: keyId,
				KeyUsage: "ENCRYPT_DECRYPT",
				PublicKey: publicKey,
			}));

			const result = await handlerClass.getAsJwk(keyId);

			expect(logger.error).toHaveBeenCalledWith({ message: "Failed to build JWK from key" + keyId }, undefined);
			expect(result).toBeNull();
		});

		it("logs error if fetched key does not contain KeyId", async () => {
			const keyId = "f2f-cri-api-vc-signing-key";
			// pragma: allowlist nextline secret
			const publicKey = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAES4sDJifz8h3GDznZZ6NC3QN5qlQn8Zf2mck4yBmlwqvXzZu7Wkwc4QuOxXhGHXamfkoG5d0UJVXJwwvFxiSzRQ==";
			jest.spyOn(handlerClass.kmsClient, "getPublicKey").mockImplementationOnce(() => ({
				KeySpec: "ECC_NIST_P256",
				KeyUsage: "ENCRYPT_DECRYPT",
				PublicKey: publicKey,
			}));

			const result = await handlerClass.getAsJwk(keyId);

			expect(logger.error).toHaveBeenCalledWith({ message: "Failed to build JWK from key" + keyId }, JSON.stringify({
				keySpec: "ECC_NIST_P256",
				algorithm: "ES256" as Algorithm,
			}));
			expect(result).toBeNull();
		});

		it("logs error if fetched key does not contain PublicKey", async () => {
			const keyId = "f2f-cri-api-vc-signing-key";
			jest.spyOn(handlerClass.kmsClient, "getPublicKey").mockImplementationOnce(() => ({
				KeySpec: "ECC_NIST_P256",
				KeyUsage: "ENCRYPT_DECRYPT",
				KeyId: keyId,
			}));

			const result = await handlerClass.getAsJwk(keyId);

			expect(logger.error).toHaveBeenCalledWith({ message: "Failed to build JWK from key" + keyId }, JSON.stringify({
				keySpec: "ECC_NIST_P256",
				algorithm: "ES256" as Algorithm,
			}));
			expect(result).toBeNull();
		});
	});

	describe("#getKeySpecMap", () => {
		it("returns undefined if spec is not given", () => {
			expect(handlerClass.getKeySpecMap()).toBeUndefined();
		});

		it("returns the correct key spec map for ECC_NIST_P256 spec", () => {
			expect(handlerClass.getKeySpecMap("ECC_NIST_P256")).toEqual({
				keySpec: "ECC_NIST_P256",
				algorithm: "ES256" as Algorithm,
			});
		});

		it("returns the correct key spec map for RSA_2048 spec", () => {
			expect(handlerClass.getKeySpecMap("RSA_2048")).toEqual({
				keySpec: "RSA_2048",
				algorithm: "RSA-OAEP-256" as Algorithm,
			});
		});
	});
});
