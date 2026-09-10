import "server-only";

import path from "node:path";

const MINIMUM_SECRET_BYTES = 32;
const MAXIMUM_SECRET_BYTES = 4_096;
const MAXIMUM_GOOGLE_CLIENT_ID_LENGTH = 512;
const MAXIMUM_EMAIL_ENDPOINT_LENGTH = 2_048;
const MAXIMUM_EMAIL_API_KEY_BYTES = 4_096;
const MAXIMUM_EMAIL_ADDRESS_LENGTH = 320;
const TEST_GOOGLE_ADAPTER_FLAG = "CLIENT_AUTH_TEST_GOOGLE_ADAPTER";
const TEST_EMAIL_ADAPTER_FLAG = "CLIENT_AUTH_TEST_EMAIL_ADAPTER";

export class ClientAuthConfigurationError extends Error {
  constructor(message = "Client authentication is unavailable") {
    super(message);
    this.name = "ClientAuthConfigurationError";
  }
}

export type ClientAuthConfig = Readonly<{
  databasePath: string;
  appOrigin: string;
  sessionSecret: string;
  secureCookies: boolean;
}>;

export type ClientGoogleConfig = Readonly<{
  clientId: string;
  mode: "production" | "test";
}>;

export type ClientEmailConfig =
  | Readonly<{
    mode: "production";
    endpoint: string;
    apiKey: string;
    from: string;
  }>
  | Readonly<{
    mode: "test";
    otpCode: string;
  }>;

export type ClientAuthenticationConfig = ClientAuthConfig & Readonly<{
  otpSecret: string;
  google: ClientGoogleConfig;
  email: ClientEmailConfig;
}>;

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new ClientAuthConfigurationError();
  return value;
}

function requiredRaw(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name];
  if (!value?.trim()) throw new ClientAuthConfigurationError();
  return value;
}

function boundedText(value: string, maximum: number): string {
  if (!value || value !== value.trim() || value.length > maximum) {
    throw new ClientAuthConfigurationError();
  }
  return value;
}

function boundedSecret(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name];
  const length = Buffer.byteLength(value ?? "", "utf8");
  if (!value?.trim() || length < MINIMUM_SECRET_BYTES || length > MAXIMUM_SECRET_BYTES) {
    throw new ClientAuthConfigurationError();
  }
  return value;
}

function appOrigin(value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ClientAuthConfigurationError();
  }

  if (
    (parsed.protocol !== "https:" && parsed.protocol !== "http:")
    || parsed.username
    || parsed.password
    || parsed.pathname !== "/"
    || parsed.search
    || parsed.hash
    || (value !== parsed.origin && value !== `${parsed.origin}/`)
  ) {
    throw new ClientAuthConfigurationError();
  }
  return parsed.origin;
}

function productionEmailEndpoint(value: string): string {
  if (value.length > MAXIMUM_EMAIL_ENDPOINT_LENGTH || value !== value.trim()) {
    throw new ClientAuthConfigurationError();
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ClientAuthConfigurationError();
  }
  if (
    parsed.protocol !== "https:"
    || parsed.username
    || parsed.password
    || parsed.hash
    || (value !== parsed.href && `${value}/` !== parsed.href)
  ) {
    throw new ClientAuthConfigurationError();
  }
  return value;
}

function emailAddress(value: string): string {
  const bounded = boundedText(value, MAXIMUM_EMAIL_ADDRESS_LENGTH);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(bounded)) {
    throw new ClientAuthConfigurationError();
  }
  return bounded;
}

function assertTestFlagBoundary(environment: NodeJS.ProcessEnv): void {
  for (const name of [TEST_GOOGLE_ADAPTER_FLAG, TEST_EMAIL_ADAPTER_FLAG]) {
    const value = environment[name];
    if (value !== undefined && value !== "1") throw new ClientAuthConfigurationError();
    if (value === "1" && environment.NODE_ENV !== "test") {
      throw new ClientAuthConfigurationError();
    }
  }
}

export function assertClientAuthConfig(config: ClientAuthConfig): void {
  if (!path.isAbsolute(config.databasePath)) throw new ClientAuthConfigurationError();
  appOrigin(config.appOrigin);
  const secretLength = Buffer.byteLength(config.sessionSecret ?? "", "utf8");
  if (
    !config.sessionSecret?.trim()
    || secretLength < MINIMUM_SECRET_BYTES
    || secretLength > MAXIMUM_SECRET_BYTES
    || typeof config.secureCookies !== "boolean"
  ) {
    throw new ClientAuthConfigurationError();
  }
}

export function assertClientAuthenticationConfig(config: ClientAuthenticationConfig): void {
  assertClientAuthConfig(config);
  const otpSecretLength = Buffer.byteLength(config.otpSecret ?? "", "utf8");
  if (
    !config.otpSecret?.trim()
    || otpSecretLength < MINIMUM_SECRET_BYTES
    || otpSecretLength > MAXIMUM_SECRET_BYTES
    || !config.google
    || !config.email
  ) {
    throw new ClientAuthConfigurationError();
  }
  boundedText(config.google.clientId, MAXIMUM_GOOGLE_CLIENT_ID_LENGTH);
  if (config.google.mode !== "production" && config.google.mode !== "test") {
    throw new ClientAuthConfigurationError();
  }
  if (config.email.mode === "test") {
    if (!/^\d{6}$/.test(config.email.otpCode)) throw new ClientAuthConfigurationError();
    return;
  }
  if (config.email.mode !== "production") throw new ClientAuthConfigurationError();
  productionEmailEndpoint(config.email.endpoint);
  const keyLength = Buffer.byteLength(config.email.apiKey ?? "", "utf8");
  if (!config.email.apiKey?.trim() || keyLength > MAXIMUM_EMAIL_API_KEY_BYTES) {
    throw new ClientAuthConfigurationError();
  }
  emailAddress(config.email.from);
}

export function loadClientAuthConfig(environment: NodeJS.ProcessEnv = process.env): ClientAuthConfig {
  assertTestFlagBoundary(environment);
  const config: ClientAuthConfig = {
    databasePath: required(environment, "CLIENT_IDENTITY_DB_PATH"),
    appOrigin: appOrigin(required(environment, "CLIENT_APP_ORIGIN")),
    sessionSecret: boundedSecret(environment, "CLIENT_SESSION_SECRET"),
    secureCookies: environment.NODE_ENV !== "development",
  };
  assertClientAuthConfig(config);
  return config;
}

export function loadClientAuthenticationConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ClientAuthenticationConfig {
  const core = loadClientAuthConfig(environment);
  const googleTestMode = environment[TEST_GOOGLE_ADAPTER_FLAG] === "1";
  const emailTestMode = environment[TEST_EMAIL_ADAPTER_FLAG] === "1";
  const google: ClientGoogleConfig = {
    clientId: boundedText(
      requiredRaw(environment, "CLIENT_GOOGLE_CLIENT_ID"),
      MAXIMUM_GOOGLE_CLIENT_ID_LENGTH,
    ),
    mode: googleTestMode ? "test" : "production",
  };
  const email: ClientEmailConfig = emailTestMode
    ? {
      mode: "test",
      otpCode: requiredRaw(environment, "CLIENT_AUTH_TEST_OTP_CODE"),
    }
    : {
      mode: "production",
      endpoint: productionEmailEndpoint(requiredRaw(environment, "CLIENT_EMAIL_ENDPOINT")),
      apiKey: requiredRaw(environment, "CLIENT_EMAIL_API_KEY"),
      from: emailAddress(requiredRaw(environment, "CLIENT_EMAIL_FROM")),
    };
  const config: ClientAuthenticationConfig = {
    ...core,
    otpSecret: boundedSecret(environment, "CLIENT_OTP_SECRET"),
    google,
    email,
  };
  assertClientAuthenticationConfig(config);
  return config;
}
