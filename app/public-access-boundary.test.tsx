import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HubPage from "@/app/hub/page";
import PrivacyPage from "@/app/confidentialitate/page";
import TermsPage from "@/app/termeni/page";
import LandingPage from "@/app/google-ads/page";
import ConnectPage from "@/app/google-ads/connect/page";
import {
  publicLocalizedBranchRegistry,
  publicOAuthAttributes,
  publicOAuthContract,
  publicOAuthStatement,
  publicOAuthSurfaceRegistry,
} from "@/lib/gads-public-oauth-contract";
import { GADS_LOCALIZED_COPY } from "@/lib/gads-localized-copy";

describe("public Google Ads access boundary", () => {
  it("exposes the one closed executable OAuth contract", () => {
    expect(publicOAuthContract).toEqual({
      providerScope: "adwords",
      permissionCapability: "broad",
      applicationBehavior: "read-operations-only",
      mutationBehavior: "none",
    });
  });

  it("accepts canonical truth and refuses free-form permission semantics", () => {
    expect(publicOAuthStatement("oauth-is-not-read-only")).toBeTruthy();
    expect(() => publicOAuthStatement("exclusive-for-consultation" as never)).toThrow("Unknown public OAuth statement");
  });

  it("registers every public Google Ads route and shared legal surface with the canonical contract", () => {
    const expected = new Map([
      ["app/google-ads/page.tsx", "landing"],
      ["app/google-ads/connect/page.tsx", "connect"],
      ["app/google-ads/conturi/page.tsx", "account-picker"],
      ["app/google-ads/marja/page.tsx", "margin"],
      ["app/google-ads/raport/page.tsx", "report"],
      ["app/google-ads/impreuna/page.tsx", "simulator"],
      ["app/hub/page.tsx", "hub"],
      ["app/confidentialitate/page.tsx", "privacy"],
      ["app/termeni/page.tsx", "terms"],
    ]);

    for (const [file, surface] of expected) {
      const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
      expect(source, file).toMatch(new RegExp(`publicOAuthAttributes\\("${surface}|registeredPublicOAuthAttributes\\.${surface}`));
    }

    const discoveredRoutes = fs.readdirSync(path.join(process.cwd(), "app/google-ads"), { recursive: true })
      .filter((entry) => String(entry).endsWith("page.tsx"))
      .map((entry) => `/google-ads/${String(entry).replace(/\/page\.tsx$/, "").replace(/^page\.tsx$/, "")}`.replace(/\/$/, ""))
      .sort();
    const registeredRoutes = Object.values(publicOAuthSurfaceRegistry)
      .map(({ route }) => route)
      .filter((route) => route.startsWith("/google-ads"))
      .sort();
    expect(registeredRoutes).toEqual(discoveredRoutes);
  });

  it("seals every registered state with the canonical capability attributes", () => {
    for (const [surface, registration] of Object.entries(publicOAuthSurfaceRegistry)) {
      for (const state of registration.states) {
        expect(publicOAuthAttributes(surface as keyof typeof publicOAuthSurfaceRegistry, state)).toMatchObject({
          "data-provider-scope": "adwords",
          "data-permission-capability": "broad",
          "data-application-behavior": "read-operations-only",
          "data-mutation-behavior": "none",
          "data-public-oauth-surface": `${surface}:${state}`,
        });
      }
    }
  });

  it("registers every dynamic localized copy branch", () => {
    expect(Object.keys(publicLocalizedBranchRegistry).sort()).toEqual(Object.keys(GADS_LOCALIZED_COPY).sort());
    for (const branch of Object.values(publicLocalizedBranchRegistry)) {
      expect(publicOAuthAttributes(branch.surface, branch.state)["data-public-oauth-surface"])
        .toBe(`${branch.surface}:${branch.state}`);
    }
  });

  it.each([
    ["landing", <LandingPage key="landing" />],
    ["hub", <HubPage key="hub" />],
    ["privacy", <PrivacyPage key="privacy" />],
    ["terms", <TermsPage key="terms" />],
  ])("renders the canonical contract on the %s surface", (surface, page) => {
    const html = renderToStaticMarkup(page);
    expect(html).toContain(`data-public-oauth-surface="${surface}:normal"`);
    expect(html).toContain('data-permission-capability="broad"');
    expect(html).toContain('data-application-behavior="read-operations-only"');
  });

  it("renders normal and recoverable connect states through the canonical contract", async () => {
    const normal = renderToStaticMarkup(await ConnectPage({ searchParams: Promise.resolve({}) }));
    const error = renderToStaticMarkup(await ConnectPage({ searchParams: Promise.resolve({ eroare: "google" }) }));
    expect(normal).toContain('data-public-oauth-surface="connect:normal"');
    expect(error).toContain('data-public-oauth-surface="connect:error"');
  });
});
