/**
 * Enum for TDS's available resources (endpoints).
 */
export enum ResourcesEnum {
	SESSIONS = "/sessions",
    SESSIONS_ID = "/sessions/{sessionId}",
	SESSIONS_CONFIGURATION= "/sessions/{sessionId}/configuration",
    INSTRUCTIONS= "/sessions/{sessionId}/instructions",
    INSTRUCTIONS_PDF= "/sessions/{sessionId}/instructions/pdf",
	MEDIA_CONTENT = "/sessions/{sessionId}/media/{mediaId}/content"
}
