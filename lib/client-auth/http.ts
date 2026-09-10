import "server-only";

import { isIP } from "node:net";
import { NextRequest, NextResponse } from "next/server";
import {
  ClientAuthConfigurationError,
  type ClientAuthConfig,
} from "./config";
import {
  authFlowCookieOptions,
  CLIENT_AUTH_FLOW_COOKIE,
  CLIENT_CSRF_COOKIE,
  CLIENT_SESSION_COOKIE,
  csrfCookieOptions,
  sessionCookieOptions,
  type IssuedSession,
} from "../client-session";

const MAXIMUM_BODY_BYTES = 16 * 1024;
const MAXIMUM_FORWARDED_BYTES = 1_024;
const MAXIMUM_FORWARDED_ENTRIES = 16;
const JSON_CONTENT_TYPE = /^application\/json(?:[ \t]*;[ \t]*charset[ \t]*=[ \t]*(?:utf-8|"utf-8"))?[ \t]*$/iu;

class ClientAuthRequestError extends Error {
  constructor() {
    super("Authentication request rejected");
    this.name = "ClientAuthRequestError";
  }
}

function loopbackSourceIp(appOrigin: string): string | null {
  const hostname = new URL(appOrigin).hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return "127.0.0.1";
  if (hostname === "[::1]") return "::1";
  return null;
}

export function trustedProxyHops(
  config: ClientAuthConfig,
  environment: NodeJS.ProcessEnv = process.env,
): number {
  const configured = environment.CLIENT_TRUSTED_PROXY_HOPS;
  if (configured === "0") {
    if (environment.NODE_ENV === "development" && loopbackSourceIp(config.appOrigin)) return 0;
    throw new ClientAuthConfigurationError();
  }
  if (!configured || !/^[1-8]$/u.test(configured)) {
    throw new ClientAuthConfigurationError();
  }
  return Number(configured);
}

function canonicalForwardedIp(value: string): string | null {
  const version = isIP(value);
  if (version === 4) return value;
  if (version !== 6) return null;
  try {
    const hostname = new URL(`http://[${value}]/`).hostname;
    return hostname.slice(1, -1);
  } catch {
    return null;
  }
}

export function requestSourceIp(
  request: NextRequest,
  config: ClientAuthConfig,
  environment: NodeJS.ProcessEnv = process.env,
): string | null {
  const hops = trustedProxyHops(config, environment);
  if (hops === 0) return loopbackSourceIp(config.appOrigin);

  const forwarded = request.headers.get("x-forwarded-for");
  if (
    !forwarded
    || Buffer.byteLength(forwarded, "utf8") > MAXIMUM_FORWARDED_BYTES
  ) {
    return null;
  }
  const entries = forwarded.split(",");
  if (entries.length > MAXIMUM_FORWARDED_ENTRIES) return null;
  const chain: string[] = [];
  for (const entry of entries) {
    const trimmed = entry.replace(/^[ \t]+|[ \t]+$/gu, "");
    if (!trimmed) return null;
    const canonical = canonicalForwardedIp(trimmed);
    if (!canonical) return null;
    chain.push(canonical);
  }
  const clientIndex = chain.length - hops;
  return clientIndex >= 0 ? chain[clientIndex] : null;
}

export function exactRequestOrigin(
  request: NextRequest,
  config: ClientAuthConfig,
): string | null {
  const supplied = request.headers.get("origin");
  if (!supplied) return null;
  try {
    const parsed = new URL(supplied);
    return supplied === parsed.origin && parsed.origin === config.appOrigin
      ? parsed.origin
      : null;
  } catch {
    return null;
  }
}

function declaredBodyLength(request: NextRequest): void {
  const supplied = request.headers.get("content-length");
  if (supplied === null) return;
  if (!/^\d+$/u.test(supplied)) throw new ClientAuthRequestError();
  if (BigInt(supplied) > BigInt(MAXIMUM_BODY_BYTES)) throw new ClientAuthRequestError();
}

async function boundedBody(request: NextRequest): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAXIMUM_BODY_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // Cancellation is best effort after the byte limit has already rejected the body.
        }
        throw new ClientAuthRequestError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function readBoundedJson(request: NextRequest): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type");
  if (!contentType || !JSON_CONTENT_TYPE.test(contentType)) throw new ClientAuthRequestError();
  declaredBodyLength(request);
  const bytes = await boundedBody(request);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ClientAuthRequestError();
  }

  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    throw new ClientAuthRequestError();
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ClientAuthRequestError();
  }
  return value as Record<string, unknown>;
}

export function authFlowToken(request: NextRequest): string | undefined {
  return request.cookies.get(CLIENT_AUTH_FLOW_COOKIE)?.value;
}

export function sessionToken(request: NextRequest): string | undefined {
  return request.cookies.get(CLIENT_SESSION_COOKIE)?.value;
}

export function csrfHeader(request: NextRequest): string | undefined {
  return request.headers.get("x-csrf-token") ?? undefined;
}

function jsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function expireCookie(
  response: NextResponse,
  name: string,
  options: ReturnType<typeof sessionCookieOptions>,
): void {
  response.cookies.set(name, "", {
    ...options,
    expires: new Date(0),
    maxAge: 0,
  });
}

export function bootstrapResponse(
  config: ClientAuthConfig,
  flow: { token: string; csrfToken: string },
): NextResponse {
  const response = jsonResponse({ csrfToken: flow.csrfToken });
  response.cookies.set(CLIENT_AUTH_FLOW_COOKIE, flow.token, authFlowCookieOptions(config));
  return response;
}

export function acceptedResponse(): NextResponse {
  return jsonResponse({ accepted: true });
}

export function authenticationResponse(
  config: ClientAuthConfig,
  session: IssuedSession,
): NextResponse {
  const response = jsonResponse({ authenticated: true });
  response.cookies.set(CLIENT_SESSION_COOKIE, session.token, sessionCookieOptions(config));
  response.cookies.set(CLIENT_CSRF_COOKIE, session.csrfToken, csrfCookieOptions(config));
  expireCookie(response, CLIENT_AUTH_FLOW_COOKIE, authFlowCookieOptions(config));
  return response;
}

export function rejectedFlowResponse(config: ClientAuthConfig): NextResponse {
  const response = rejectedResponse();
  expireCookie(response, CLIENT_AUTH_FLOW_COOKIE, authFlowCookieOptions(config));
  return response;
}

export function clearAuthenticationResponse(config: ClientAuthConfig): NextResponse {
  const response = jsonResponse({ authenticated: false });
  expireCookie(response, CLIENT_SESSION_COOKIE, sessionCookieOptions(config));
  expireCookie(response, CLIENT_CSRF_COOKIE, csrfCookieOptions(config));
  expireCookie(response, CLIENT_AUTH_FLOW_COOKIE, authFlowCookieOptions(config));
  return response;
}

export function unavailableResponse(): NextResponse {
  return jsonResponse({ error: "Client authentication is unavailable" }, 503);
}

export function rejectedResponse(): NextResponse {
  return jsonResponse({ authenticated: false }, 401);
}
