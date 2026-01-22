import { handler } from "../handlers/callback";
import callbackSuccess from "../events/callbackSuccess.json";
import axios from "axios";

const mockVc = {
  sub: "89620274-1839-496e-a3fe-73fa8a7cb64a",
  "https://vocab.account.gov.uk/v1/credentialJWT": [
    "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRpZDp3ZWI6cmV2aWV3LWJhdi5kZXYuYWNjb3VudC5nb3YudWsjNjUxZmYwZjY3ZDJmMTM3MDE1MTNiYzA4N2NhNGQxNWU1ZTdmNTc3ZjhkODg3MmQ4ZDBlM2UzNmIzODdlOWVmYyJ9.eyJzdWIiOiI4OTYyMDI3NC0xODM5LTQ5NmUtYTNmZS03M2ZhOGE3Y2I2NGEiLCJuYmYiOjE3NjgzMDk4MjUsImlzcyI6Imh0dHBzOi8vcmV2aWV3LWJhdi5kZXYuYWNjb3VudC5nb3YudWsiLCJpYXQiOjE3NjgzMDk4MjUsImp0aSI6InVybjp1dWlkOmU3NWJiYjkyLWE5ZjEtNDljOC04MGVjLTMzMGE2NGMyZWVmZCIsInZjIjp7IkBjb250ZXh0IjpbImh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIiwiaHR0cHM6Ly92b2NhYi5hY2NvdW50Lmdvdi51ay9jb250ZXh0cy9pZGVudGl0eS12MS5qc29ubGQiXSwidHlwZSI6WyJWZXJpZmlhYmxlQ3JlZGVudGlhbCIsIklkZW50aXR5Q2hlY2tDcmVkZW50aWFsIl0sImNyZWRlbnRpYWxTdWJqZWN0Ijp7Im5hbWUiOlt7Im5hbWVQYXJ0cyI6W3sidHlwZSI6IkdpdmVuTmFtZSIsInZhbHVlIjoiS2VubmV0aCJ9LHsidHlwZSI6IkZhbWlseU5hbWUiLCJ2YWx1ZSI6IkRlY2VycXVlaXJhIn1dfV0sImJpcnRoRGF0ZSI6W3sidmFsdWUiOiIxOTY1LTA3LTA4In1dLCJiYW5rQWNjb3VudCI6W3sic29ydENvZGUiOiIxMTExMTEiLCJhY2NvdW50TnVtYmVyIjoiMTAxOTkyODMifV19LCJldmlkZW5jZSI6W3sidHlwZSI6IklkZW50aXR5Q2hlY2siLCJ0eG4iOiJiNWZmY2E3Ny0wZWYzLTRiZWItYWQyZC1kMTQ5ZjRmNTkzYjkiLCJzdHJlbmd0aFNjb3JlIjozLCJ2YWxpZGl0eVNjb3JlIjoyLCJjaGVja0RldGFpbHMiOlt7ImNoZWNrTWV0aG9kIjoiZGF0YSIsImlkZW50aXR5Q2hlY2tQb2xpY3kiOiJub25lIn1dfV19fQ.a-uLLcUcSiRsjx6J1xmbbtknbPokg_0-LtofPjBiAX3TCB5DG7M63L5TQ2UAcKPTLwHHNYzIqKxWg9-sW_7lCg",
  ],
};

const token = {
  access_token: {
    sub: "sessionId",
    aud: "ipvstub-review-o.dev.account.gov.uk",
    iss: "review-o.dev.account.gov.uk",
    exp: "123456789",
  },
};

jest.mock("axios");

describe("Callback Endpoint", () => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;

  beforeEach(() => {
    mockedAxios.post
      .mockResolvedValueOnce({ data: "jwtText" })
      .mockResolvedValueOnce({ data: token })
      .mockResolvedValueOnce({ data: mockVc });
  });

  it("informs with authorisation was granted.", async () => {
    const response = await handler(callbackSuccess);

    expect(response.statusCode).toBe(200);
    expect(response.body.toLowerCase().includes("vc")).toBe(true);
  });
});
