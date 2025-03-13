 
import format from "ecdsa-sig-formatter";
import { KmsJwtAdapter } from "../../../utils/KmsJwtAdapter";
import { Constants } from "../../../utils/Constants";
import { absoluteTimeNow } from "../../../utils/DateTimeUtils";
import { jwtUtils } from "../../../utils/JwtUtils";

jest.mock("ecdsa-sig-formatter", () => ({
	derToJose: jest.fn().mockImplementation(() => "JOSE-formatted signature"),
	joseToDer: jest.fn().mockImplementation(() => "DER-formatted signature"),
}));

jest.mock("../../../utils/JwtUtils", () => ({
	jwtUtils: {
		base64Encode: jest.fn().mockImplementation((args) => JSON.parse(args)),
		base64DecodeToString: jest.fn().mockImplementation((args) => JSON.stringify(args)),
		getHashedKid: jest.fn().mockImplementation((args) => {return args;}),
	},
}));

describe("KmsJwtAdapter utils", () => {
	let kmsJwtAdapter: KmsJwtAdapter;
	const dnsSuffix = process.env.DNSSUFFIX!;

	beforeEach(() => {
		kmsJwtAdapter = new KmsJwtAdapter(process.env.KMS_KEY_ARN!);
		jest.spyOn(kmsJwtAdapter.kms, "sign").mockImplementation(() => ({
			Signature: "signature",
		}));
		jest.spyOn(kmsJwtAdapter.kms, "verify").mockImplementation(() => ({
			SignatureValid: true,
		}));
	});

	describe("#sign", () => {
		it("returns a signed access token", async () => {
			const jwtHeader = { alg: "ES256", typ: "JWT", kid: `did:web:${dnsSuffix}#${process.env.KMS_KEY_ARN}` };
			const jwtPayload = {
				sub: "b0668808-67ce-8jc7-a2fc-132b81612111",
				aud: process.env.ISSUER,
				iss: process.env.ISSUER,
				exp: absoluteTimeNow() + Constants.TOKEN_EXPIRY_SECONDS,
			};

			const accessToken = await kmsJwtAdapter.sign(jwtPayload, dnsSuffix);

			expect(jwtUtils.base64Encode).toHaveBeenNthCalledWith(1, JSON.stringify(jwtHeader));
			expect(jwtUtils.base64Encode).toHaveBeenNthCalledWith(2, JSON.stringify(jwtPayload));
			expect(format.derToJose).toHaveBeenCalledWith(Buffer.from("signature").toString("base64"), "ES256");
			expect(accessToken).toBe(`${jwtHeader}.${jwtPayload}.JOSE-formatted signature`);
		});

		it("error is thrown if jwt cannot be signed", async () => {
			const jwtPayload = {
				sub: "b0668808-67ce-8jc7-a2fc-132b81612111",
				aud: process.env.ISSUER,
				iss: process.env.ISSUER,
				exp: absoluteTimeNow() + Constants.TOKEN_EXPIRY_SECONDS,
			};

			jest.spyOn(kmsJwtAdapter.kms, "sign").mockImplementationOnce(() => ({ Signature: null }));

			await expect(kmsJwtAdapter.sign(jwtPayload, dnsSuffix)).rejects.toThrow(expect.objectContaining({ message: "Failed to sign Jwt" }));
		});
	});

	describe("#verify", () => {
		it("returns true if jwt is valid", async () => {
			const isValid = await kmsJwtAdapter.verify("header.payload.signature");

			expect(kmsJwtAdapter.kms.verify).toHaveBeenCalledWith({
				KeyId: process.env.KMS_KEY_ARN,
				Message: Buffer.from("header.payload"),
				MessageType: "RAW",
				Signature: "DER-formatted signature",
				SigningAlgorithm: "ECDSA_SHA_256",
			});
			expect(isValid).toBe(true);
		});

		it("returns false if jwt is invalid", async () => {
			jest.spyOn(kmsJwtAdapter.kms, "verify").mockImplementationOnce(() => ({ SignatureValid: null }));

			const isValid = await kmsJwtAdapter.verify("header.payload.signature");

			expect(isValid).toBe(false);
		});

		it("error is thrown if jwt can't be verified", async () => {
			jest.spyOn(kmsJwtAdapter.kms, "verify").mockImplementationOnce(() => {
				throw new Error("cannot verify signature");
			});

			await expect(kmsJwtAdapter.verify("header.payload.signature")).rejects.toThrow(expect.objectContaining({ message: "Failed to verify signature: Error: cannot verify signature" }));
		});
	});

	describe("#decode", () => {
		it("returns correctly formatted result", () => {
			expect(kmsJwtAdapter.decode("header.payload.signature")).toEqual({
				header: "header",
				payload: "payload",
				signature: "signature",
			});
		});
	});

	describe("#decrypt", () => {
		it("throws error if the jwe doesn't contain the correct number of components", async () => {
			await expect(kmsJwtAdapter.decrypt("protectedHeader.encryptedKey.iv.ciphertext")).rejects.toThrow(expect.objectContaining({ message: "Error decrypting JWE: Missing component" }));
		});
	});
});
