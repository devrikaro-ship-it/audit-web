import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import * as bootstrapRoute from "../../app/client/api/auth/bootstrap/route";
import * as googleRoute from "../../app/client/api/auth/google/route";
import * as logoutRoute from "../../app/client/api/auth/logout/route";
import * as otpRequestRoute from "../../app/client/api/auth/otp/request/route";
import * as otpVerifyRoute from "../../app/client/api/auth/otp/verify/route";
import * as passwordEnrollRoute from "../../app/client/api/auth/password/enroll/route";
import * as passwordLoginRoute from "../../app/client/api/auth/password/login/route";
import { createTestGoogleCredential } from "../../lib/client-auth/adapters";
import { loadClientAuthenticationConfig } from "../../lib/client-auth/config";
import {
  bootstrapHandler,
  requestOtpHandler,
} from "../../lib/client-auth/handlers";
import { keyedHash } from "../../lib/client-auth/crypto";
import {
  openClientAuthenticationDatabase,
  type ClientDatabase,
} from "../../lib/client-identity/database";
import {
  authenticateSession,
  CLIENT_AUTH_FLOW_COOKIE,
  CLIENT_CSRF_COOKIE,
  CLIENT_SESSION_COOKIE,
} from "../../lib/client-session";

const APP_ORIGIN = "https://client-http.test";
const CLIENT_IP = "198.51.100.24";
const PROXY_IP = "203.0.113.8";
const FORWARDED_CHAIN = `${CLIENT_IP}, ${PROXY_IP}`;
const GOOGLE_CLIENT_ID = "client-http-test.apps.googleusercontent.com";
const OTP_CODE = "617204";
const OTP_SECRET = "http-otp-secret-with-at-least-thirty-two-bytes";
const SESSION_SECRET = "http-session-secret-with-at-least-thirty-two-bytes";
const PASSWORD = "correct horse battery staple";
const ENVIRONMENT_KEYS = [
  "NODE_ENV",
  "CLIENT_AUTH_TEST_GOOGLE_ADAPTER",
  "CLIENT_AUTH_TEST_EMAIL_ADAPTER",
  "CLIENT_AUTH_TEST_OTP_CODE",
  "CLIENT_GOOGLE_CLIENT_ID",
  "CLIENT_IDENTITY_DB_PATH",
  "CLIENT_APP_ORIGIN",
  "CLIENT_OTP_SECRET",
  "CLIENT_SESSION_SECRET",
  "CLIENT_TRUSTED_PROXY_HOPS",
] as const;

type RoutePost = (request: NextRequest) => Promise<NextResponse>;
type RequestOptions = Readonly<{
  body?: unknown;
  rawBody?: BodyInit;
  contentLength?: string;
  contentType?: string;
  cookies?: Readonly<Record<string, string>>;
  csrfToken?: string;
  forwardedFor?: string | null;
  method?: string;
  origin?: string | null;
}>;

let temporaryRoot: string;
let savedEnvironment: Map<string, string | undefined>;

function testEnvironment(databasePath: string): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    CLIENT_AUTH_TEST_GOOGLE_ADAPTER: "1",
    CLIENT_AUTH_TEST_EMAIL_ADAPTER: "1",
    CLIENT_AUTH_TEST_OTP_CODE: OTP_CODE,
    CLIENT_GOOGLE_CLIENT_ID: GOOGLE_CLIENT_ID,
    CLIENT_IDENTITY_DB_PATH: databasePath,
    CLIENT_APP_ORIGIN: APP_ORIGIN,
    CLIENT_OTP_SECRET: OTP_SECRET,
    CLIENT_SESSION_SECRET: SESSION_SECRET,
    CLIENT_TRUSTED_PROXY_HOPS: "2",
  };
}

function installEnvironment(environment: NodeJS.ProcessEnv): void {
  for (const key of ENVIRONMENT_KEYS) {
    const value = environment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function request(pathname: string, options: RequestOptions = {}): NextRequest {
  const headers = new Headers();
  const origin = options.origin === undefined ? APP_ORIGIN : options.origin;
  const forwardedFor = options.forwardedFor === undefined
    ? FORWARDED_CHAIN
    : options.forwardedFor;
  if (origin !== null) headers.set("origin", origin);
  if (forwardedFor !== null) headers.set("x-forwarded-for", forwardedFor);
  if (options.csrfToken !== undefined) headers.set("x-csrf-token", options.csrfToken);
  if (options.cookies) {
    headers.set(
      "cookie",
      Object.entries(options.cookies).map(([name, value]) => `${name}=${value}`).join("; "),
    );
  }

  const body = options.rawBody !== undefined
    ? options.rawBody
    : options.body !== undefined
      ? JSON.stringify(options.body)
      : undefined;
  if (body !== undefined) {
    headers.set("content-type", options.contentType ?? "application/json; charset=UTF-8");
  }
  if (options.contentLength !== undefined) headers.set("content-length", options.contentLength);
  return new NextRequest(`${APP_ORIGIN}${pathname}`, {
    method: options.method ?? "POST",
    headers,
    body,
  });
}

function cookieNames(response: NextResponse): string[] {
  return response.cookies.getAll().map((cookie) => cookie.name).sort();
}

async function expectJsonResponse(
  response: NextResponse,
  status: number,
  body: unknown,
  cookies: readonly string[],
): Promise<void> {
  expect(response.status).toBe(status);
  expect(await response.clone().json()).toEqual(body);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(cookieNames(response)).toEqual([...cookies].sort());
}

function cookieValue(response: NextResponse, name: string): string {
  const cookie = response.cookies.get(name);
  expect(cookie).toBeDefined();
  return cookie!.value;
}

async function bootstrap(
  options: RequestOptions = {},
): Promise<{ response: NextResponse; flowToken: string; csrfToken: string }> {
  const response = await bootstrapRoute.POST(request("/client/api/auth/bootstrap", options));
  expect(response.status).toBe(200);
  const body = await response.clone().json() as { csrfToken: string };
  return {
    response,
    flowToken: cookieValue(response, CLIENT_AUTH_FLOW_COOKIE),
    csrfToken: body.csrfToken,
  };
}

async function otpLogin(email: string): Promise<{
  response: NextResponse;
  sessionToken: string;
  csrfToken: string;
}> {
  const flow = await bootstrap();
  const proof = {
    cookies: { [CLIENT_AUTH_FLOW_COOKIE]: flow.flowToken },
    csrfToken: flow.csrfToken,
  };
  const requested = await otpRequestRoute.POST(request(
    "/client/api/auth/otp/request",
    { ...proof, body: { email } },
  ));
  await expectJsonResponse(requested, 200, { accepted: true }, []);
  const verified = await otpVerifyRoute.POST(request(
    "/client/api/auth/otp/verify",
    { ...proof, body: { email, code: OTP_CODE } },
  ));
  await expectJsonResponse(
    verified,
    200,
    { authenticated: true },
    [CLIENT_AUTH_FLOW_COOKIE, CLIENT_CSRF_COOKIE, CLIENT_SESSION_COOKIE],
  );
  return {
    response: verified,
    sessionToken: cookieValue(verified, CLIENT_SESSION_COOKIE),
    csrfToken: cookieValue(verified, CLIENT_CSRF_COOKIE),
  };
}

function openDatabase(): ClientDatabase {
  return openClientAuthenticationDatabase(loadClientAuthenticationConfig(process.env));
}

function rowCount(table: string, where = "", parameters: unknown[] = []): number {
  const database = openDatabase();
  try {
    return (database.prepare(`SELECT COUNT(*) AS count FROM ${table} ${where}`)
      .get(...parameters) as { count: number }).count;
  } finally {
    database.close();
  }
}

function databaseState(): string {
  const database = openDatabase();
  const tables = [
    "client_identities",
    "client_identity_verifications",
    "client_external_identities",
    "client_password_credentials",
    "client_otp_challenges",
    "client_otp_send_events",
    "client_auth_flows",
    "client_sessions",
    "client_security_audit_events",
  ];
  try {
    return JSON.stringify(Object.fromEntries(tables.map((table) => [
      table,
      database.prepare(`SELECT * FROM ${table} ORDER BY rowid`).all(),
    ])));
  } finally {
    database.close();
  }
}

function activeClientId(token: string): string | null {
  const config = loadClientAuthenticationConfig(process.env);
  const database = openDatabase();
  try {
    return authenticateSession(database, config, token)?.clientId ?? null;
  } finally {
    database.close();
  }
}

function flowWasConsumed(token: string): boolean {
  const database = openDatabase();
  try {
    const row = database.prepare(
      "SELECT consumed_at FROM client_auth_flows WHERE token_hash = ?",
    ).get(keyedHash(SESSION_SECRET, token)) as { consumed_at: number | null } | undefined;
    return row?.consumed_at !== null && row?.consumed_at !== undefined;
  } finally {
    database.close();
  }
}

beforeEach(() => {
  temporaryRoot = mkdtempSync(path.join(tmpdir(), "client-auth-http-"));
  savedEnvironment = new Map(ENVIRONMENT_KEYS.map((key) => [key, process.env[key]]));
  installEnvironment(testEnvironment(path.join(temporaryRoot, "identity.sqlite")));
});

afterEach(() => {
  for (const [key, value] of savedEnvironment) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(temporaryRoot, { recursive: true, force: true });
});

describe("client authentication route surface", () => {
  it("exports only POST with the required Node.js dynamic route configuration", () => {
    const routes = [
      bootstrapRoute,
      googleRoute,
      logoutRoute,
      otpRequestRoute,
      otpVerifyRoute,
      passwordEnrollRoute,
      passwordLoginRoute,
    ];
    for (const route of routes) {
      expect(Object.keys(route).sort()).toEqual(["POST", "dynamic", "runtime"]);
      expect(route.runtime).toBe("nodejs");
      expect(route.dynamic).toBe("force-dynamic");
      expect((route as Record<string, unknown>).GET).toBeUndefined();
    }
  });

  it("completes OTP, Google, enrollment, password login, and logout for one identity", async () => {
    const otp = await otpLogin("Shared.User@example.com");
    const otpClientId = activeClientId(otp.sessionToken);
    expect(otpClientId).not.toBeNull();

    const googleFlow = await bootstrap();
    const credential = createTestGoogleCredential(
      {
        subject: "google-subject-1",
        email: "shared.user@example.com",
        emailVerified: true,
      },
      process.env,
    );
    const google = await googleRoute.POST(request("/client/api/auth/google", {
      body: { credential },
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: googleFlow.flowToken },
      csrfToken: googleFlow.csrfToken,
    }));
    await expectJsonResponse(
      google,
      200,
      { authenticated: true },
      [CLIENT_AUTH_FLOW_COOKIE, CLIENT_CSRF_COOKIE, CLIENT_SESSION_COOKIE],
    );
    const googleSession = cookieValue(google, CLIENT_SESSION_COOKIE);
    const googleCsrf = cookieValue(google, CLIENT_CSRF_COOKIE);
    expect(activeClientId(googleSession)).toBe(otpClientId);

    const enrolled = await passwordEnrollRoute.POST(request("/client/api/auth/password/enroll", {
      body: { password: PASSWORD },
      cookies: { [CLIENT_SESSION_COOKIE]: googleSession },
      csrfToken: googleCsrf,
    }));
    await expectJsonResponse(
      enrolled,
      200,
      { authenticated: true },
      [CLIENT_AUTH_FLOW_COOKIE, CLIENT_CSRF_COOKIE, CLIENT_SESSION_COOKIE],
    );
    const replacementSession = cookieValue(enrolled, CLIENT_SESSION_COOKIE);
    expect(replacementSession).not.toBe(googleSession);
    expect(activeClientId(otp.sessionToken)).toBeNull();
    expect(activeClientId(googleSession)).toBeNull();
    expect(activeClientId(replacementSession)).toBe(otpClientId);

    const passwordFlow = await bootstrap();
    const password = await passwordLoginRoute.POST(request("/client/api/auth/password/login", {
      body: { email: "SHARED.USER@example.com", password: PASSWORD },
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: passwordFlow.flowToken },
      csrfToken: passwordFlow.csrfToken,
    }));
    await expectJsonResponse(
      password,
      200,
      { authenticated: true },
      [CLIENT_AUTH_FLOW_COOKIE, CLIENT_CSRF_COOKIE, CLIENT_SESSION_COOKIE],
    );
    const passwordSession = cookieValue(password, CLIENT_SESSION_COOKIE);
    const passwordCsrf = cookieValue(password, CLIENT_CSRF_COOKIE);
    expect(activeClientId(passwordSession)).toBe(otpClientId);

    const loggedOut = await logoutRoute.POST(request("/client/api/auth/logout", {
      cookies: { [CLIENT_SESSION_COOKIE]: passwordSession },
      csrfToken: passwordCsrf,
    }));
    await expectJsonResponse(
      loggedOut,
      200,
      { authenticated: false },
      [CLIENT_AUTH_FLOW_COOKIE, CLIENT_CSRF_COOKIE, CLIENT_SESSION_COOKIE],
    );
    expect(activeClientId(passwordSession)).toBeNull();
    expect(activeClientId(replacementSession)).toBe(otpClientId);
    expect(rowCount("client_identities")).toBe(1);
    expect(rowCount("client_external_identities")).toBe(1);
    expect(rowCount("client_password_credentials")).toBe(1);

    expect(otp.response.cookies.get(CLIENT_SESSION_COOKIE)).toMatchObject({
      httpOnly: true,
      maxAge: 86_400,
      path: "/client",
      sameSite: "lax",
      secure: true,
    });
    expect(otp.response.cookies.get(CLIENT_CSRF_COOKIE)).toMatchObject({
      httpOnly: false,
      maxAge: 86_400,
      path: "/client",
      sameSite: "lax",
      secure: true,
    });
    expect(otp.response.cookies.get(CLIENT_AUTH_FLOW_COOKIE)).toMatchObject({
      httpOnly: true,
      maxAge: 0,
      path: "/client",
      sameSite: "lax",
      secure: true,
      value: "",
    });
  });

  it("issues a ten-minute HttpOnly bootstrap flow and no other cookie", async () => {
    const flow = await bootstrap();
    await expectJsonResponse(flow.response, 200, { csrfToken: flow.csrfToken }, [CLIENT_AUTH_FLOW_COOKIE]);
    expect(flow.response.cookies.get(CLIENT_AUTH_FLOW_COOKIE)).toMatchObject({
      httpOnly: true,
      maxAge: 600,
      path: "/client",
      sameSite: "lax",
      secure: true,
    });
    expect(flow.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(flow.flowToken).toMatch(/^[A-Za-z0-9_-]{43}$/u);
  });
});

describe("request framing and trusted proxy boundary", () => {
  it("rejects cross-origin requests without mutation and accepts no origin substitute", async () => {
    const before = databaseState();
    for (const options of [
      { origin: "https://attacker.test" },
      { origin: null },
      { origin: `${APP_ORIGIN}/` },
    ] as const) {
      const response = await bootstrapRoute.POST(request("/client/api/auth/bootstrap", options));
      await expectJsonResponse(response, 401, { authenticated: false }, []);
    }
    expect(databaseState()).toBe(before);
  });

  it("selects the configured trusted suffix so an attacker prefix cannot choose the binding", async () => {
    const firstPrefix = "192.0.2.40";
    const secondPrefix = "192.0.2.99";
    const trustedChain = `${CLIENT_IP}, ${PROXY_IP}`;
    const flow = await bootstrap({ forwardedFor: `${firstPrefix}, ${trustedChain}` });

    const accepted = await otpRequestRoute.POST(request("/client/api/auth/otp/request", {
      body: { email: "prefix-safe@example.com" },
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: flow.flowToken },
      csrfToken: flow.csrfToken,
      forwardedFor: `${secondPrefix}, ${trustedChain}`,
    }));
    await expectJsonResponse(accepted, 200, { accepted: true }, []);

    const rejected = await otpRequestRoute.POST(request("/client/api/auth/otp/request", {
      body: { email: "prefix-safe@example.com" },
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: flow.flowToken },
      csrfToken: flow.csrfToken,
      forwardedFor: `${secondPrefix}, 198.51.100.77, ${PROXY_IP}`,
    }));
    await expectJsonResponse(rejected, 401, { authenticated: false }, [CLIENT_AUTH_FLOW_COOKIE]);
    expect(rowCount("client_otp_send_events")).toBe(1);
  });

  it("rejects malformed, oversized, empty, and too-short forwarding chains", async () => {
    const invalidChains = [
      null,
      CLIENT_IP,
      `${CLIENT_IP}, unknown`,
      `${CLIENT_IP},`,
      `${CLIENT_IP}:443, ${PROXY_IP}`,
      `${Array.from({ length: 17 }, (_, index) => `192.0.2.${index + 1}`).join(",")}`,
      `${"1".repeat(1_025)}, ${PROXY_IP}`,
    ];
    const before = databaseState();
    for (const forwardedFor of invalidChains) {
      const response = await bootstrapRoute.POST(request(
        "/client/api/auth/bootstrap",
        { forwardedFor },
      ));
      await expectJsonResponse(response, 401, { authenticated: false }, []);
    }
    expect(databaseState()).toBe(before);
  });

  it("canonicalizes equivalent bare IPv6 forms before binding the flow", async () => {
    process.env.CLIENT_TRUSTED_PROXY_HOPS = "1";
    const flow = await bootstrap({ forwardedFor: "2001:db8::1" });
    const accepted = await otpRequestRoute.POST(request("/client/api/auth/otp/request", {
      body: { email: "ipv6@example.com" },
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: flow.flowToken },
      csrfToken: flow.csrfToken,
      forwardedFor: "2001:0db8:0:0:0:0:0:1",
    }));
    await expectJsonResponse(accepted, 200, { accepted: true }, []);
  });

  it("allows proxy hop zero only for a loopback development origin", async () => {
    const developmentDatabase = path.join(temporaryRoot, "development.sqlite");
    const development = {
      NODE_ENV: "development",
      CLIENT_IDENTITY_DB_PATH: developmentDatabase,
      CLIENT_APP_ORIGIN: "http://localhost:3000",
      CLIENT_SESSION_SECRET: SESSION_SECRET,
      CLIENT_TRUSTED_PROXY_HOPS: "0",
    };
    const accepted = await bootstrapHandler(
      new NextRequest("http://localhost:3000/client/api/auth/bootstrap", {
        method: "POST",
        headers: { origin: "http://localhost:3000" },
      }),
      development,
    );
    expect(accepted.status).toBe(200);
    expect(accepted.cookies.get(CLIENT_AUTH_FLOW_COOKIE)?.secure).toBe(false);

    for (const configured of [undefined, "0", "+1", "01", " 1", "1.0", "1e0", "9"]) {
      const invalid = { ...testEnvironment(path.join(temporaryRoot, `invalid-${String(configured)}.sqlite`)) };
      if (configured === undefined) delete invalid.CLIENT_TRUSTED_PROXY_HOPS;
      else invalid.CLIENT_TRUSTED_PROXY_HOPS = configured;
      const response = await bootstrapHandler(
        request("/client/api/auth/bootstrap"),
        invalid,
      );
      await expectJsonResponse(
        response,
        503,
        { error: "Client authentication is unavailable" },
        [],
      );
    }
  });
});

describe("bounded JSON and single-use login flows", () => {
  it("does not consume or clear an OTP flow when JSON framing is malformed", async () => {
    const flow = await bootstrap();
    const proof = {
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: flow.flowToken },
      csrfToken: flow.csrfToken,
    };
    const malformed = await otpRequestRoute.POST(request("/client/api/auth/otp/request", {
      ...proof,
      rawBody: "{",
    }));
    await expectJsonResponse(malformed, 401, { authenticated: false }, []);
    expect(flowWasConsumed(flow.flowToken)).toBe(false);

    const accepted = await otpRequestRoute.POST(request("/client/api/auth/otp/request", {
      ...proof,
      body: { email: "framed@example.com" },
    }));
    await expectJsonResponse(accepted, 200, { accepted: true }, []);
    expect(flowWasConsumed(flow.flowToken)).toBe(false);
  });

  it("burns a login flow before malformed, declared-oversized, and actual-oversized JSON", async () => {
    const cases: RequestOptions[] = [
      { rawBody: "{" },
      { body: { email: "person@example.com", password: PASSWORD }, contentLength: "16385" },
      { rawBody: JSON.stringify({ value: "x".repeat(17_000) }), contentLength: "1" },
      { body: [], contentType: "application/json" },
      { body: { email: "person@example.com", password: PASSWORD }, contentType: "text/plain" },
    ];
    for (const framedBody of cases) {
      const flow = await bootstrap();
      const proof = {
        cookies: { [CLIENT_AUTH_FLOW_COOKIE]: flow.flowToken },
        csrfToken: flow.csrfToken,
      };
      const rejected = await passwordLoginRoute.POST(request(
        "/client/api/auth/password/login",
        { ...proof, ...framedBody },
      ));
      await expectJsonResponse(rejected, 401, { authenticated: false }, [CLIENT_AUTH_FLOW_COOKIE]);
      expect(flowWasConsumed(flow.flowToken)).toBe(true);

      const replay = await passwordLoginRoute.POST(request("/client/api/auth/password/login", {
        ...proof,
        body: { email: "person@example.com", password: PASSWORD },
      }));
      await expectJsonResponse(replay, 401, { authenticated: false }, [CLIENT_AUTH_FLOW_COOKIE]);
    }
    expect(rowCount("client_identities")).toBe(0);
    expect(rowCount("client_sessions")).toBe(0);
  });

  it("atomically admits only one of two concurrent Google replays", async () => {
    const flow = await bootstrap();
    const credential = createTestGoogleCredential({
      subject: "atomic-google-subject",
      email: "atomic@example.com",
      emailVerified: true,
    }, process.env);
    const options = {
      body: { credential },
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: flow.flowToken },
      csrfToken: flow.csrfToken,
    };
    const responses = await Promise.all([
      googleRoute.POST(request("/client/api/auth/google", options)),
      googleRoute.POST(request("/client/api/auth/google", options)),
    ]);
    expect(responses.map((response) => response.status).sort()).toEqual([200, 401]);
    expect(rowCount("client_identities")).toBe(1);
    expect(rowCount("client_external_identities")).toBe(1);
    expect(rowCount("client_sessions")).toBe(1);
    expect(rowCount("client_auth_flows", "WHERE consumed_at IS NOT NULL")).toBe(1);
  });
});

describe("neutral refusals, session CSRF, and unavailable configuration", () => {
  it("returns indistinguishable neutral failures for wrong and unknown credentials", async () => {
    const otp = await otpLogin("credential@example.com");
    const enrolled = await passwordEnrollRoute.POST(request("/client/api/auth/password/enroll", {
      body: { password: PASSWORD },
      cookies: { [CLIENT_SESSION_COOKIE]: otp.sessionToken },
      csrfToken: otp.csrfToken,
    }));
    expect(enrolled.status).toBe(200);

    const attempts = [
      { email: "credential@example.com", password: "this password is wrong" },
      { email: "unknown@example.com", password: "this password is wrong" },
    ];
    const results: Array<{ status: number; body: unknown; cookies: string[] }> = [];
    for (const body of attempts) {
      const flow = await bootstrap();
      const response = await passwordLoginRoute.POST(request("/client/api/auth/password/login", {
        body,
        cookies: { [CLIENT_AUTH_FLOW_COOKIE]: flow.flowToken },
        csrfToken: flow.csrfToken,
      }));
      results.push({
        status: response.status,
        body: await response.clone().json(),
        cookies: cookieNames(response),
      });
    }
    expect(results).toEqual([
      { status: 401, body: { authenticated: false }, cookies: [CLIENT_AUTH_FLOW_COOKIE] },
      { status: 401, body: { authenticated: false }, cookies: [CLIENT_AUTH_FLOW_COOKIE] },
    ]);
    expect(rowCount("client_identities")).toBe(1);
  });

  it("rejects wrong OTP, invalid Google credential, and an invalid flow without identity mutation", async () => {
    const otpFlow = await bootstrap();
    const otpProof = {
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: otpFlow.flowToken },
      csrfToken: otpFlow.csrfToken,
    };
    await otpRequestRoute.POST(request("/client/api/auth/otp/request", {
      ...otpProof,
      body: { email: "wrong@example.com" },
    }));
    const wrongOtp = await otpVerifyRoute.POST(request("/client/api/auth/otp/verify", {
      ...otpProof,
      body: { email: "wrong@example.com", code: "000000" },
    }));
    await expectJsonResponse(wrongOtp, 401, { authenticated: false }, [CLIENT_AUTH_FLOW_COOKIE]);

    const googleFlow = await bootstrap();
    const wrongGoogle = await googleRoute.POST(request("/client/api/auth/google", {
      body: { credential: "not-a-google-credential" },
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: googleFlow.flowToken },
      csrfToken: googleFlow.csrfToken,
    }));
    await expectJsonResponse(wrongGoogle, 401, { authenticated: false }, [CLIENT_AUTH_FLOW_COOKIE]);

    const forgedFlow = await otpRequestRoute.POST(request("/client/api/auth/otp/request", {
      body: { email: "wrong@example.com" },
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: "A".repeat(43) },
      csrfToken: "B".repeat(43),
    }));
    await expectJsonResponse(forgedFlow, 401, { authenticated: false }, [CLIENT_AUTH_FLOW_COOKIE]);
    expect(rowCount("client_identities")).toBe(0);
    expect(rowCount("client_sessions")).toBe(0);
  });

  it("requires the stored synchronizer CSRF value for enrollment and logout", async () => {
    const authenticated = await otpLogin("csrf@example.com");
    const before = databaseState();
    const cookies = { [CLIENT_SESSION_COOKIE]: authenticated.sessionToken };

    const missing = await passwordEnrollRoute.POST(request("/client/api/auth/password/enroll", {
      body: { password: PASSWORD },
      cookies,
    }));
    await expectJsonResponse(missing, 401, { authenticated: false }, []);

    const forged = await logoutRoute.POST(request("/client/api/auth/logout", {
      cookies,
      csrfToken: "C".repeat(43),
    }));
    await expectJsonResponse(forged, 401, { authenticated: false }, []);
    expect(databaseState()).toBe(before);
    expect(activeClientId(authenticated.sessionToken)).not.toBeNull();
  });

  it("rejects password enrollment with a missing forwarding chain before mutation", async () => {
    const authenticated = await otpLogin("enroll-missing-forwarding@example.com");
    const before = databaseState();
    const clientId = activeClientId(authenticated.sessionToken);
    process.env.CLIENT_TRUSTED_PROXY_HOPS = "1";

    const response = await passwordEnrollRoute.POST(request(
      "/client/api/auth/password/enroll",
      {
        body: { password: PASSWORD },
        cookies: { [CLIENT_SESSION_COOKIE]: authenticated.sessionToken },
        csrfToken: authenticated.csrfToken,
        forwardedFor: null,
      },
    ));

    await expectJsonResponse(response, 401, { authenticated: false }, []);
    expect(databaseState()).toBe(before);
    expect(rowCount("client_password_credentials")).toBe(0);
    expect(activeClientId(authenticated.sessionToken)).toBe(clientId);
  });

  it("rejects password enrollment with a malformed forwarding chain before mutation", async () => {
    const authenticated = await otpLogin("enroll-malformed-forwarding@example.com");
    const before = databaseState();
    const clientId = activeClientId(authenticated.sessionToken);
    process.env.CLIENT_TRUSTED_PROXY_HOPS = "1";

    const response = await passwordEnrollRoute.POST(request(
      "/client/api/auth/password/enroll",
      {
        body: { password: PASSWORD },
        cookies: { [CLIENT_SESSION_COOKIE]: authenticated.sessionToken },
        csrfToken: authenticated.csrfToken,
        forwardedFor: `${CLIENT_IP}, unknown`,
      },
    ));

    await expectJsonResponse(response, 401, { authenticated: false }, []);
    expect(databaseState()).toBe(before);
    expect(rowCount("client_password_credentials")).toBe(0);
    expect(activeClientId(authenticated.sessionToken)).toBe(clientId);
  });

  it("rejects logout with a missing forwarding chain before mutation", async () => {
    const authenticated = await otpLogin("logout-missing-forwarding@example.com");
    const before = databaseState();
    const clientId = activeClientId(authenticated.sessionToken);
    process.env.CLIENT_TRUSTED_PROXY_HOPS = "1";

    const response = await logoutRoute.POST(request("/client/api/auth/logout", {
      cookies: { [CLIENT_SESSION_COOKIE]: authenticated.sessionToken },
      csrfToken: authenticated.csrfToken,
      forwardedFor: null,
    }));

    await expectJsonResponse(response, 401, { authenticated: false }, []);
    expect(databaseState()).toBe(before);
    expect(activeClientId(authenticated.sessionToken)).toBe(clientId);
  });

  it("rejects logout with a malformed forwarding chain before mutation", async () => {
    const authenticated = await otpLogin("logout-malformed-forwarding@example.com");
    const before = databaseState();
    const clientId = activeClientId(authenticated.sessionToken);
    process.env.CLIENT_TRUSTED_PROXY_HOPS = "1";

    const response = await logoutRoute.POST(request("/client/api/auth/logout", {
      cookies: { [CLIENT_SESSION_COOKIE]: authenticated.sessionToken },
      csrfToken: authenticated.csrfToken,
      forwardedFor: `${CLIENT_IP}, unknown`,
    }));

    await expectJsonResponse(response, 401, { authenticated: false }, []);
    expect(databaseState()).toBe(before);
    expect(activeClientId(authenticated.sessionToken)).toBe(clientId);
  });

  it("returns the exact unavailable response without cookies or mutation when HTTP configuration is missing", async () => {
    const before = databaseState();
    delete process.env.CLIENT_TRUSTED_PROXY_HOPS;
    const calls: Array<[RoutePost, string, RequestOptions]> = [
      [bootstrapRoute.POST, "/client/api/auth/bootstrap", {}],
      [googleRoute.POST, "/client/api/auth/google", { body: { credential: "value" } }],
      [logoutRoute.POST, "/client/api/auth/logout", {}],
      [otpRequestRoute.POST, "/client/api/auth/otp/request", { body: { email: "a@example.com" } }],
      [otpVerifyRoute.POST, "/client/api/auth/otp/verify", { body: { email: "a@example.com", code: OTP_CODE } }],
      [passwordEnrollRoute.POST, "/client/api/auth/password/enroll", { body: { password: PASSWORD } }],
      [passwordLoginRoute.POST, "/client/api/auth/password/login", { body: { email: "a@example.com", password: PASSWORD } }],
    ];
    for (const [handler, pathname, options] of calls) {
      const response = await handler(request(pathname, options));
      await expectJsonResponse(
        response,
        503,
        { error: "Client authentication is unavailable" },
        [],
      );
    }
    process.env.CLIENT_TRUSTED_PROXY_HOPS = "2";
    expect(databaseState()).toBe(before);
  });

  it("keeps invalid-email and delivery-neutral OTP requests successful with zero cookies", async () => {
    const flow = await bootstrap();
    const response = await requestOtpHandler(request("/client/api/auth/otp/request", {
      body: { email: "not-an-email" },
      cookies: { [CLIENT_AUTH_FLOW_COOKIE]: flow.flowToken },
      csrfToken: flow.csrfToken,
    }), process.env);
    await expectJsonResponse(response, 200, { accepted: true }, []);
    expect(rowCount("client_otp_send_events")).toBe(0);
    expect(flowWasConsumed(flow.flowToken)).toBe(false);
  });
});
