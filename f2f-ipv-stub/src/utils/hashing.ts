import { createHash } from "crypto";

export const getHashedKid = (keyId: string) => {
    const kidBytes = Buffer.from(keyId, "utf8");
    const hash = createHash("sha256").update(kidBytes).digest();
    return Buffer.from(hash).toString("hex");
};