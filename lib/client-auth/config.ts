import "server-only";

import path from "node:path";

const MINIMUM_SECRET_BYTES = 32;
const MAXIMUM_SECRET_BYTES = 4_096;

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

function required(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new ClientAuthConfigurationError();
  return value;
}

function sessionSecret(environment: NodeJS.ProcessEnv): string {
  const value = environment.CLIENT_SESSION_SECRET;
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

export function loadClientAuthConfig(environment: NodeJS.ProcessEnv = process.env): ClientAuthConfig {
  const config: ClientAuthConfig = {
    databasePath: required(environment, "CLIENT_IDENTITY_DB_PATH"),
    appOrigin: appOrigin(required(environment, "CLIENT_APP_ORIGIN")),
    sessionSecret: sessionSecret(environment),
    secureCookies: environment.NODE_ENV !== "development",
  };
  assertClientAuthConfig(config);
  return config;
}
