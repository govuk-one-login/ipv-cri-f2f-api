import * as jose from "jose";

export const jwtUtils = {
  // convert non-base64 string or uint8array into base64 encoded string
  base64Encode(value: string | Uint8Array): string {
    const inputValue = new Uint8Array(Buffer.from(value));
    return jose.base64url.encode(inputValue);
  },

  // convert base64 into uint8array
  base64DecodeToUint8Array(value: string): Uint8Array {
    return jose.base64url.decode(value); // jose.base64url.decode default returns a Uint8Array
  },

  // convert base64 encoded string into non-base64 string
  base64DecodeToString(value: string): string {
    return Buffer.from(value, "base64url").toString();
  },

  // convert uint8array into string
  decode(value: Uint8Array): string {
    const decoder = new TextDecoder();
    return decoder.decode(value);
  },

  // convert string into uint8array
  encode(value: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(value);
  },
};
