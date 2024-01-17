import { absoluteTimeNow } from "../../../utils/DateTimeUtils";

export const dbClient = {
	send: (command: any) => {
		// console.log("command", command);
		return { Item: 
      {
      	sessionId: "b0668808-67ce-8jc7-a2fc-132b81612111",
      	clientId: "ipv-core-stub",
      	// pragma: allowlist secret
      	accessToken: "AbCdEf123456",
      	clientSessionId: "sdfssg",
      	authorizationCode: "",
      	authorizationCodeExpiryDate: 123,
      	redirectUri: "http://localhost:8085/callback",
      	accessTokenExpiryDate: 1234,
      	expiryDate: absoluteTimeNow() + 1000,
      	createdDate: 123,
      	state: "initial",
      	subject: "sub",
      	persistentSessionId: "sdgsdg",
      	clientIpAddress: "127.0.0.1",
      	attemptCount: 1,
      	authSessionState: "F2F_YOTI_SESSION_CREATED",
      },
		};
	},
};
