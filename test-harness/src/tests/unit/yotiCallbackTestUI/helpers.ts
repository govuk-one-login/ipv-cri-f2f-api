import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { Express } from "express";
import { vi } from "vitest";

// The controllers call these; each test sets what they return
// The test files' vi.mock factories call these lazily, so plain vi.fn()s are enough (no vi.hoisted)
export const mocks = {
	listSessions: vi.fn(),
	triggerCallbacks: vi.fn(),
};

export const SESSION = {
	sessionId: "11111111-2222-3333-4444-555555555555",
	authSessionState: "F2F_YOTI_SESSION_CREATED",
	createdDate: 1700000000, // 2023-11-14 22:13:20 UTC
	yotiSessionId: "eb26c8e0-397b-4f5e-b7a5-62cd0c6e510b",
};

export const listSessionsResponds = (
	sessions: object[],
	extra: { nextToken?: string; truncated?: boolean } = {},
) =>
	mocks.listSessions.mockResolvedValue({
		statusCode: 200,
		body: { sessions, nextToken: extra.nextToken, truncated: extra.truncated ?? false },
	});

// Sends one real HTTP request to the app on an ephemeral port (no supertest dependency).
// Redirects are returned as-is rather than followed.
export const send = async (
	app: Express,
	method: "GET" | "POST",
	path: string,
	query: Record<string, string> = {},
) => {
	const server = await new Promise<Server>((resolve) => {
		const listening: Server = app.listen(0, () => resolve(listening));
	});
	try {
		const { port } = server.address() as AddressInfo;
		const url = new URL(path, `http://127.0.0.1:${port}`);
		Object.entries(query).forEach(([key, value]) => url.searchParams.set(key, value));

		const response = await fetch(url, { method, redirect: "manual" });
		return {
			status: response.status,
			headers: Object.fromEntries(response.headers.entries()),
			text: await response.text(),
		};
	} finally {
		server.closeAllConnections();
		server.close();
	}
};
