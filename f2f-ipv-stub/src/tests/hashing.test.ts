import { getHashedKid } from "../utils/hashing";

describe("hashing", () => {
    describe("getHashedKid", () => {
        it("returns a hashed key id", () => {
            const result = getHashedKid("ipv-core-stub-2-from-mkjwk.org");
            expect(result).toEqual("74c5b00d698a18178a738f5305ee67f9d50fc620f8be6b89d94638fa16a4c828"); // pragma: allowlist secret
        });
    });
});
