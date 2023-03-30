export interface ISessionItem {
	sessionId: string;
	clientId: string;
	clientSessionId: string;
	authorizationCode: string;
	authorizationCodeExpiryDate: number;
	redirectUri: string;
	accessToken: string;
	accessTokenExpiryDate: number;
	expiryDate: number;
	createdDate: number;
	state: string;
	subject: string;
	persistentSessionId: string;
	clientIpAddress: string;
	attemptCount: number;
	authSessionState: string;
}
