import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizePublicResponse } from "@/app/public-output-goldens";

const state = vi.hoisted(() => ({
  demo: false,
  missing: [] as string[],
  exchangeFails: false,
}));

vi.mock("node:crypto", async (original) => ({
  ...(await original<Record<string, unknown>>()),
  randomBytes: () => Buffer.from("fixed-state-value"),
}));
vi.mock("@/lib/gads-demo", () => ({ demoOn: () => state.demo, DEMO_REFRESH_TOKEN: "demo-token" }));
vi.mock("@/lib/gads-oauth", () => ({
  missingConfig: () => state.missing,
  authUrl: (oauthState: string) => `https://accounts.google.test/authorize?state=${oauthState}`,
  exchangeCode: async () => {
    if (state.exchangeFails) throw new Error("exchange failed");
    return { refreshToken: "refresh-token" };
  },
}));
vi.mock("@/lib/gads-session", () => ({
  SESSION_COOKIE: "gads_session",
  seal: () => "signed-session",
  cookieOptions: () => ({ httpOnly: true, sameSite: "lax" as const, secure: true, path: "/" }),
}));

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`https://audit.example${path}`, cookie ? { headers: { cookie } } : undefined);
}

describe("public Google Ads OAuth handlers", () => {
  beforeEach(() => {
    state.demo = false;
    state.missing = [];
    state.exchangeFails = false;
  });

  it("executes every closed OAuth start branch", async () => {
    const { GET } = await import("./start/route");
    state.demo = true;
    expect(await normalizePublicResponse(await GET(request("/api/google-ads/start")))).toMatchSnapshot("api-start:demo");

    state.demo = false;
    state.missing = ["clientId", "developerToken"];
    expect(await normalizePublicResponse(await GET(request("/api/google-ads/start")))).toMatchSnapshot("api-start:config-error");

    state.missing = [];
    expect(await normalizePublicResponse(await GET(request("/api/google-ads/start")))).toMatchSnapshot("api-start:success");
  });

  it("executes every closed OAuth callback branch", async () => {
    const { GET } = await import("./callback/route");
    const cases = [
      ["access-denied", "/api/google-ads/callback?error=access_denied", undefined],
      ["provider-error", "/api/google-ads/callback?error=server_error", undefined],
      ["state-error", "/api/google-ads/callback?code=code&state=wrong", "gads_state=expected"],
      ["missing-code", "/api/google-ads/callback?state=expected", "gads_state=expected"],
    ] as const;
    for (const [id, path, cookie] of cases) {
      expect(await normalizePublicResponse(await GET(request(path, cookie)))).toMatchSnapshot(`api-callback:${id}`);
    }

    state.exchangeFails = true;
    expect(await normalizePublicResponse(await GET(request("/api/google-ads/callback?code=code&state=expected", "gads_state=expected")))).toMatchSnapshot("api-callback:exchange-error");

    state.exchangeFails = false;
    expect(await normalizePublicResponse(await GET(request("/api/google-ads/callback?code=code&state=expected", "gads_state=expected")))).toMatchSnapshot("api-callback:success");
  });
});
