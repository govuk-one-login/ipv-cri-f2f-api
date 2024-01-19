export interface IPVCoreEvent {
	"sub": string;
	"state": string;
	"https://vocab.account.gov.uk/v1/credentialJWT"?: string[];
	"error"?: string;
	"error_description"?: string;
}

export const buildCoreEventFields = (sub: string, state: string, jwt: string): IPVCoreEvent => {
	return {
		sub,
		state,
		"https://vocab.account.gov.uk/v1/credentialJWT": [jwt],
	};
};
