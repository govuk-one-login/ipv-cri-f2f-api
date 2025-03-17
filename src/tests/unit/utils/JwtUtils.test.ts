import { jwtUtils } from "../../../utils/JwtUtils";

describe("jwtUtils", () => {
	it("should base64 encode a string", () => {
		const input = "This is a test string";
		const expectedOutput = "VGhpcyBpcyBhIHRlc3Qgc3RyaW5n";
		expect(jwtUtils.base64Encode(input)).toBe(expectedOutput);
	});

	it("should base64 decode a string to Uint8Array", () => {
		const input = "VGhpcyBpcyBhIHRlc3Qgc3RyaW5n";
		const expectedOutput = new Uint8Array([
			84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 116, 101, 115, 116, 32,
			115, 116, 114, 105, 110, 103,
		]);
		expect(jwtUtils.base64DecodeToUint8Array(input)).toEqual(
			expectedOutput,
		);
	});

	it("should base64 decode a string to string", () => {
		const input = "VGhpcyBpcyBhIHRlc3Qgc3RyaW5n";
		const expectedOutput = "This is a test string";
		expect(jwtUtils.base64DecodeToString(input)).toBe(expectedOutput);
	});

	it("should decode a Uint8Array to string", () => {
		const input = new Uint8Array([
			84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 116, 101, 115, 116, 32,
			115, 116, 114, 105, 110, 103,
		]);
		const expectedOutput = "This is a test string";
		expect(jwtUtils.decode(input)).toBe(expectedOutput);
	});

	it("should encode a string to Uint8Array", () => {
		const input = "This is a test string";
		const expectedOutput = new Uint8Array([
			84, 104, 105, 115, 32, 105, 115, 32, 97, 32, 116, 101, 115, 116, 32,
			115, 116, 114, 105, 110, 103,
		]);
		expect(jwtUtils.encode(input)).toEqual(expectedOutput);
	});

	it("should return the correct hashed kid", () => {
		const keyId = "test-key-id";
		const expectedHashedKid =
      "b4bc4f795761b7695032158cc06aeb67a46b6ddc7d2121db9509d06b4d2d13e1";
		expect(jwtUtils.getHashedKid(keyId)).toBe(expectedHashedKid);
	});
});
