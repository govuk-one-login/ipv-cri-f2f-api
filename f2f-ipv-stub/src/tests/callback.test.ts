import { handler } from "../handlers/callback";
import callbackSuccess from "../events/callbackSuccess.json";
import callbackFailed from "../events/callbackFailure.json";

describe("Callback Endpoint", () => {
  it("informs with authorisation was granted.", async () => {
    const response = await handler(callbackSuccess);

    expect(response.statusCode).toBe(200);
    expect(response.body.toLowerCase().includes("granted")).toBe(true);
  });

  it("informs with authorisation was rejected.", async () => {
    const response = await handler(callbackFailed);

    expect(response.statusCode).toBe(200);
    expect(response.body.toLowerCase().includes("grant failed")).toBe(true);
  });
});
