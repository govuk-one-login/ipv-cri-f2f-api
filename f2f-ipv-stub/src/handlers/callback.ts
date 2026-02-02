import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import axios, { AxiosResponse } from "axios";
import { constants } from "../ApiConstants";
import { Constants } from "../Constants";
import { jwtUtils } from "../JwtUtils";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: string;
  }

  interface UserInfoResponse {
    sub: string;
    "https://vocab.account.gov.uk/v1/credentialStatus": string;
  }
  interface KidOptions {
    journeyType: "invalidKid" | "missingKid";
  }

  if (event.queryStringParameters?.error != null) {
    return {
      statusCode: 200,
      body: "IPV Callback endpoint Failed. See logs for details",
    };
  } else {
    const assertationJwt = await generateTokenAssertation();

    const token = await tokenPost(
      event.queryStringParameters?.code,
      constants.DEV_IPV_F2F_STUB_URL! + "/credential-issuer/callback?id=f2f",
      assertationJwt.data,
      Constants.CLIENT_ASSERTION_TYPE_JWT_BEARER
    );

    const vc = await userInfoPost("Bearer " + token.data.access_token);

    return {
      statusCode: 200,
      body: JSON.stringify(vc.data),
    };
  }

  async function generateTokenAssertation(
    options?: KidOptions
  ): Promise<AxiosResponse<string>> {
    const path = constants.DEV_IPV_F2F_STUB_URL! + "/generate-token-request";
    let postResponse: AxiosResponse<string>;

    if (options) {
      const payload = { [options.journeyType]: true };

      try {
        postResponse = await axios.post(path, payload);
      } catch (error: any) {
        console.error(`Error response from ${path} endpoint: ${error}`);
        return error.response;
      }
    } else {
      try {
        postResponse = await axios.post(path);
      } catch (error: any) {
        console.error(`Error response from ${path} endpoint: ${error}`);
        return error.response;
      }
    }
    return postResponse;
  }

  async function tokenPost(
    authCode?: string,
    redirectUri?: string,
    clientAssertionJwt?: string,
    clientAssertionType?: string
  ): Promise<AxiosResponse<TokenResponse>> {
    const path = "/token";

    const assertionType =
      clientAssertionType || Constants.CLIENT_ASSERTION_TYPE_JWT_BEARER;

    try {
      const postRequest = await axios.post(
        constants.DEV_CRI_F2F_API_URL + path,
        `code=${authCode}&grant_type=authorization_code&redirect_uri=${redirectUri}&client_assertion_type=${assertionType}&client_assertion=${clientAssertionJwt}`,
        { headers: { "Content-Type": "text/plain" } }
      );
      return postRequest;
    } catch (error: any) {
      console.log(`Error response from ${path} endpoint ${error}.`);
      return error.response;
    }
  }

  async function userInfoPost(
    accessToken: string
  ): Promise<AxiosResponse<UserInfoResponse>> {
    const path = "/userinfo";
    try {
      const postRequest = await axios.post(
        constants.DEV_CRI_F2F_API_URL + path,
        null,
        {
          headers: { Authorization: `${accessToken}` },
        }
      );
      return postRequest;
    } catch (error: any) {
      console.log(`Error response from ${path} endpoint ${error}.`);
      return error.response;
    }
  }
};
