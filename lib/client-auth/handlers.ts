import "server-only";

import { NextRequest, NextResponse } from "next/server";
import {
  authenticateGoogle,
  authenticatePassword,
  requestEmailOtp,
  setPasswordCredential,
  verifyEmailOtp,
} from "./service";
import {
  ClientAuthConfigurationError,
  loadClientAuthConfig,
  loadClientAuthenticationConfig,
  type ClientAuthConfig,
} from "./config";
import {
  acceptedResponse,
  authFlowToken,
  authenticationResponse,
  bootstrapResponse,
  clearAuthenticationResponse,
  csrfHeader,
  exactRequestOrigin,
  readBoundedJson,
  rejectedFlowResponse,
  rejectedResponse,
  requestSourceIp,
  sessionToken,
  unavailableResponse,
} from "./http";
import { openClientDatabase } from "../client-identity/database";
import {
  authenticateSession,
  consumeAuthFlow,
  createAuthFlow,
  revokeSession,
  verifyAuthFlow,
  verifySessionCsrf,
  type AuthFlowProof,
} from "../client-session";

type RequestFrame = Readonly<{
  origin: string;
  sourceIp: string;
}>;

function boundedText(value: unknown, maximum: number): string | null {
  return typeof value === "string" && value.length > 0 && value.length <= maximum
    ? value
    : null;
}

function requestFrame(
  request: NextRequest,
  config: ClientAuthConfig,
  environment: NodeJS.ProcessEnv,
): RequestFrame | null {
  const origin = exactRequestOrigin(request, config);
  const sourceIp = requestSourceIp(request, config, environment);
  return origin && sourceIp ? { origin, sourceIp } : null;
}

function flowProof(request: NextRequest, frame: RequestFrame): AuthFlowProof {
  return {
    token: authFlowToken(request),
    csrfToken: csrfHeader(request),
    origin: frame.origin,
    sourceIp: frame.sourceIp,
  };
}

function verifyFlow(
  request: NextRequest,
  config: ClientAuthConfig,
  frame: RequestFrame,
): boolean {
  const database = openClientDatabase(config);
  try {
    return verifyAuthFlow(database, config, flowProof(request, frame));
  } finally {
    database.close();
  }
}

function consumeFlow(
  request: NextRequest,
  config: ClientAuthConfig,
  frame: RequestFrame,
): boolean {
  const database = openClientDatabase(config);
  try {
    return consumeAuthFlow(database, config, flowProof(request, frame));
  } finally {
    database.close();
  }
}

export async function bootstrapHandler(
  request: NextRequest,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<NextResponse> {
  try {
    const config = loadClientAuthConfig(environment);
    const frame = requestFrame(request, config, environment);
    if (!frame) return rejectedResponse();
    const database = openClientDatabase(config);
    try {
      const flow = createAuthFlow(database, config, frame);
      return bootstrapResponse(config, flow);
    } finally {
      database.close();
    }
  } catch (error) {
    if (error instanceof ClientAuthConfigurationError) return unavailableResponse();
    return rejectedResponse();
  }
}

export async function requestOtpHandler(
  request: NextRequest,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<NextResponse> {
  try {
    const config = loadClientAuthenticationConfig(environment);
    const frame = requestFrame(request, config, environment);
    if (!frame) return rejectedResponse();
    if (!verifyFlow(request, config, frame)) return rejectedFlowResponse(config);

    let body: Record<string, unknown>;
    try {
      body = await readBoundedJson(request);
    } catch {
      return rejectedResponse();
    }
    const email = boundedText(body.email, 320);
    if (email) {
      await requestEmailOtp({ email, sourceIp: frame.sourceIp }, environment);
    }
    return acceptedResponse();
  } catch (error) {
    if (error instanceof ClientAuthConfigurationError) return unavailableResponse();
    return acceptedResponse();
  }
}

async function consumedLoginFlow(
  request: NextRequest,
  environment: NodeJS.ProcessEnv,
): Promise<{ config: ClientAuthConfig; frame: RequestFrame } | NextResponse> {
  const config = loadClientAuthenticationConfig(environment);
  const frame = requestFrame(request, config, environment);
  if (!frame || !consumeFlow(request, config, frame)) return rejectedFlowResponse(config);
  return { config, frame };
}

export async function verifyOtpHandler(
  request: NextRequest,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<NextResponse> {
  let config: ClientAuthConfig | undefined;
  try {
    const consumed = await consumedLoginFlow(request, environment);
    if (consumed instanceof NextResponse) return consumed;
    ({ config } = consumed);
    const body = await readBoundedJson(request);
    const email = boundedText(body.email, 320);
    const code = boundedText(body.code, 6);
    if (!email || !code) return rejectedFlowResponse(config);
    const result = verifyEmailOtp(
      { email, code, sourceIp: consumed.frame.sourceIp },
      environment,
    );
    return result
      ? authenticationResponse(config, result.session)
      : rejectedFlowResponse(config);
  } catch (error) {
    if (error instanceof ClientAuthConfigurationError) return unavailableResponse();
    return config ? rejectedFlowResponse(config) : rejectedResponse();
  }
}

export async function passwordLoginHandler(
  request: NextRequest,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<NextResponse> {
  let config: ClientAuthConfig | undefined;
  try {
    const consumed = await consumedLoginFlow(request, environment);
    if (consumed instanceof NextResponse) return consumed;
    ({ config } = consumed);
    const body = await readBoundedJson(request);
    const email = boundedText(body.email, 320);
    const password = boundedText(body.password, 128);
    if (!email || !password) return rejectedFlowResponse(config);
    const result = await authenticatePassword({ email, password }, environment);
    return result
      ? authenticationResponse(config, result.session)
      : rejectedFlowResponse(config);
  } catch (error) {
    if (error instanceof ClientAuthConfigurationError) return unavailableResponse();
    return config ? rejectedFlowResponse(config) : rejectedResponse();
  }
}

export async function googleLoginHandler(
  request: NextRequest,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<NextResponse> {
  let config: ClientAuthConfig | undefined;
  try {
    const consumed = await consumedLoginFlow(request, environment);
    if (consumed instanceof NextResponse) return consumed;
    ({ config } = consumed);
    const body = await readBoundedJson(request);
    const credential = boundedText(body.credential, 8_192);
    if (!credential) return rejectedFlowResponse(config);
    const result = await authenticateGoogle({ credential }, environment);
    return result
      ? authenticationResponse(config, result.session)
      : rejectedFlowResponse(config);
  } catch (error) {
    if (error instanceof ClientAuthConfigurationError) return unavailableResponse();
    return config ? rejectedFlowResponse(config) : rejectedResponse();
  }
}

export async function passwordEnrollHandler(
  request: NextRequest,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<NextResponse> {
  try {
    const config = loadClientAuthenticationConfig(environment);
    if (!requestSourceIp(request, config, environment)) return rejectedResponse();
    if (!exactRequestOrigin(request, config)) return rejectedResponse();

    const token = sessionToken(request);
    const database = openClientDatabase(config);
    let clientId: string | null = null;
    try {
      const session = authenticateSession(database, config, token);
      if (session && verifySessionCsrf(database, config, session.id, csrfHeader(request))) {
        clientId = session.clientId;
      }
    } finally {
      database.close();
    }
    if (!clientId) return rejectedResponse();

    const body = await readBoundedJson(request);
    const password = boundedText(body.password, 128);
    if (!password) return rejectedResponse();
    const issued = await setPasswordCredential({ clientId, password }, environment);
    return authenticationResponse(config, issued);
  } catch (error) {
    if (error instanceof ClientAuthConfigurationError) return unavailableResponse();
    return rejectedResponse();
  }
}

export async function logoutHandler(
  request: NextRequest,
  environment: NodeJS.ProcessEnv = process.env,
): Promise<NextResponse> {
  try {
    const config = loadClientAuthConfig(environment);
    if (!requestSourceIp(request, config, environment)) return rejectedResponse();
    if (!exactRequestOrigin(request, config)) return rejectedResponse();

    const token = sessionToken(request);
    const database = openClientDatabase(config);
    try {
      const session = authenticateSession(database, config, token);
      if (!session || !verifySessionCsrf(database, config, session.id, csrfHeader(request))) {
        return rejectedResponse();
      }
      if (!revokeSession(database, config, token)) return rejectedResponse();
    } finally {
      database.close();
    }
    return clearAuthenticationResponse(config);
  } catch (error) {
    if (error instanceof ClientAuthConfigurationError) return unavailableResponse();
    return rejectedResponse();
  }
}
