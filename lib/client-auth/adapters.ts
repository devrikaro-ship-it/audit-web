import "server-only";

import { OAuth2Client } from "google-auth-library";
import {
  assertClientAuthenticationConfig,
  type ClientAuthenticationConfig,
} from "./config";

const MAXIMUM_GOOGLE_CREDENTIAL_LENGTH = 8_192;
const MAXIMUM_GOOGLE_SUBJECT_LENGTH = 255;
const MAXIMUM_EMAIL_LENGTH = 320;
const EMAIL_DELIVERY_TIMEOUT_MS = 5_000;

export type VerifiedGoogleIdentity = Readonly<{
  subject: string;
  email: string;
}>;

type GoogleClaims = Readonly<{
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
}>;

export type TestGoogleCredentialInput = Readonly<{
  subject: string;
  email: string;
  emailVerified: boolean;
  issuer?: string;
  audience?: string;
  expiresAt?: number;
}>;

function authenticationFailure(): Error {
  return new Error("Authentication failed");
}

function bounded(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function assertGoogleTestBoundary(
  config: ClientAuthenticationConfig,
  environment: NodeJS.ProcessEnv,
): void {
  if (
    config.google.mode !== "test"
    || environment.NODE_ENV !== "test"
    || environment.CLIENT_AUTH_TEST_GOOGLE_ADAPTER !== "1"
  ) {
    throw authenticationFailure();
  }
}

function assertEmailTestBoundary(
  config: ClientAuthenticationConfig,
  environment: NodeJS.ProcessEnv,
): void {
  if (
    config.email.mode !== "test"
    || environment.NODE_ENV !== "test"
    || environment.CLIENT_AUTH_TEST_EMAIL_ADAPTER !== "1"
  ) {
    throw authenticationFailure();
  }
}

function verifiedGoogleClaims(
  config: ClientAuthenticationConfig,
  claims: GoogleClaims | undefined,
  now: number,
): VerifiedGoogleIdentity {
  const issuerValid = claims?.iss === "accounts.google.com"
    || claims?.iss === "https://accounts.google.com";
  if (
    !issuerValid
    || claims?.aud !== config.google.clientId
    || typeof claims.exp !== "number"
    || !Number.isSafeInteger(claims.exp)
    || claims.exp * 1_000 <= now
    || !bounded(claims.sub, MAXIMUM_GOOGLE_SUBJECT_LENGTH)
    || !bounded(claims.email, MAXIMUM_EMAIL_LENGTH)
    || claims.email_verified !== true
  ) {
    throw authenticationFailure();
  }
  return { subject: claims.sub, email: claims.email };
}

export async function verifyGoogleCredential(
  config: ClientAuthenticationConfig,
  credential: string,
  now = Date.now(),
  environment: NodeJS.ProcessEnv = process.env,
): Promise<VerifiedGoogleIdentity> {
  assertClientAuthenticationConfig(config);
  if (
    !bounded(credential, MAXIMUM_GOOGLE_CREDENTIAL_LENGTH)
    || !Number.isSafeInteger(now)
    || now < 0
  ) {
    throw authenticationFailure();
  }

  if (config.google.mode === "test") {
    assertGoogleTestBoundary(config, environment);
    try {
      const claims = JSON.parse(
        Buffer.from(credential, "base64url").toString("utf8"),
      ) as GoogleClaims;
      return verifiedGoogleClaims(config, claims, now);
    } catch {
      throw authenticationFailure();
    }
  }

  const client = new OAuth2Client(config.google.clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: config.google.clientId,
  });
  return verifiedGoogleClaims(config, ticket.getPayload(), now);
}

export function createTestGoogleCredential(
  input: TestGoogleCredentialInput,
  environment: NodeJS.ProcessEnv = process.env,
  now = Date.now(),
): string {
  if (
    environment.NODE_ENV !== "test"
    || environment.CLIENT_AUTH_TEST_GOOGLE_ADAPTER !== "1"
  ) {
    throw new Error("Test adapter is unavailable");
  }
  const audience = environment.CLIENT_GOOGLE_CLIENT_ID?.trim();
  if (!audience || audience.length > 512) throw new Error("Test adapter is unavailable");
  return Buffer.from(JSON.stringify({
    iss: input.issuer ?? "https://accounts.google.com",
    aud: input.audience ?? audience,
    exp: input.expiresAt ?? Math.floor(now / 1_000) + 300,
    sub: input.subject,
    email: input.email,
    email_verified: input.emailVerified,
  })).toString("base64url");
}

export async function deliverOtp(
  config: ClientAuthenticationConfig,
  email: string,
  code: string,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  assertClientAuthenticationConfig(config);
  if (
    !bounded(email, MAXIMUM_EMAIL_LENGTH)
    || /[\r\n]/u.test(email)
    || !/^\d{6}$/.test(code)
  ) {
    throw authenticationFailure();
  }
  if (config.email.mode === "test") {
    assertEmailTestBoundary(config, environment);
    if (code !== config.email.otpCode) throw authenticationFailure();
    return;
  }

  const response = await fetch(config.email.endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.email.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: config.email.from,
      to: email,
      template: "client-login-otp",
      variables: { code },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(EMAIL_DELIVERY_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Email delivery failed");
}
