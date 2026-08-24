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
  publicOAuthInfrastructureRegistry,
  publicOAuthAttributes,
  publicOAuthContract,
  publicOAuthProjection,
  publicOAuthStatement,
  publicOAuthSurfaceRegistry,
  projectPublicOAuth,
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

  it("refuses a false canonical capability before localized projection", () => {
    expect(() => projectPublicOAuth({ ...publicOAuthContract, permissionCapability: "read-only" } as never))
      .toThrow("Unsupported public OAuth permission capability");
  });

  it("registers every public Google Ads route and shared legal surface with the canonical contract", () => {
    const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".next/server/app-paths-manifest.json"), "utf8")) as Record<string, string>;
    const discoveredRoutes = Object.keys(manifest)
      .filter((route) => route.endsWith("/page") && (route.startsWith("/google-ads/") || ["/hub/page", "/confidentialitate/page", "/termeni/page"].includes(route)))
      .map((route) => route.replace(/\/\([^/]+\)/g, "").replace(/\/page$/, ""))
      .sort();
    const registeredRoutes = Object.values(publicOAuthSurfaceRegistry)
      .map(({ route }) => route)
      .sort();
    expect(registeredRoutes).toEqual(discoveredRoutes);

    for (const [surface, registration] of Object.entries(publicOAuthSurfaceRegistry)) {
      const manifestKey = `${registration.route}/page`;
      const source = manifest[manifestKey].replace(/\.js$/, ".tsx");
      const sourceText = fs.readFileSync(path.join(process.cwd(), source), "utf8");
      expect(sourceText, source).toMatch(new RegExp(`publicOAuthAttributes\\("${surface}|registeredPublicOAuthAttributes\\.${surface}`));
    }

    const apiSources = Object.values(manifest)
      .filter((source) => source.startsWith("app/api/google-ads/") && source.endsWith("/route.js"))
      .map((source) => source.replace(/\.js$/, ".ts"))
      .sort();
    const registeredApiSources = Object.values(publicOAuthInfrastructureRegistry)
      .filter(({ kind }) => kind === "redirect-emitter")
      .map(({ source }) => source)
      .sort();
    expect(registeredApiSources).toEqual(apiSources);

    const rewriteSource = fs.readFileSync(path.join(process.cwd(), publicOAuthInfrastructureRegistry.rootRewrite.source), "utf8");
    expect(rewriteSource).toContain(`destination: "${publicOAuthInfrastructureRegistry.rootRewrite.destination}"`);

    const discoveredLayouts = ["app/layout.tsx", ...fs.readdirSync(path.join(process.cwd(), "app/google-ads"), { recursive: true })
      .filter((entry) => String(entry).endsWith("layout.tsx"))
      .map((entry) => `app/google-ads/${String(entry)}`)]
      .sort();
    const registeredLayouts = Object.values(publicOAuthInfrastructureRegistry)
      .filter(({ kind }) => kind === "layout")
      .map(({ source }) => source)
      .sort();
    expect(registeredLayouts).toEqual(discoveredLayouts);
  });

  it("requires public metadata and API errors to stay on governed projection paths", () => {
    for (const registration of Object.values(publicOAuthSurfaceRegistry)) {
      const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), ".next/server/app-paths-manifest.json"), "utf8")) as Record<string, string>;
      const source = manifest[`${registration.route}/page`].replace(/\.js$/, ".tsx");
      const sourceText = fs.readFileSync(path.join(process.cwd(), source), "utf8");
      const descriptions = sourceText.split("\n").filter((line) => line.includes("description:"));
      expect(descriptions.every((line) => line.includes("publicOAuthProjection.")), source).toBe(true);
    }

    for (const registration of Object.values(publicOAuthInfrastructureRegistry).filter(({ kind }) => kind === "redirect-emitter")) {
      const sourceText = fs.readFileSync(path.join(process.cwd(), registration.source), "utf8");
      expect(sourceText).not.toMatch(/NextResponse\.json|new Response\s*\(/);
    }
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
    const expectedVisibleProjection = {
      landing: publicOAuthProjection.googleAdsPermission,
      hub: publicOAuthProjection.applicationReadsData,
      privacy: publicOAuthProjection.permissionCapability,
      terms: publicOAuthProjection.termsNoMutations,
    }[surface];
    expect(html).toContain(expectedVisibleProjection);
    expect(html).toContain(publicOAuthProjection.surfaceDisclosure);
  });

  it("renders normal and recoverable connect states through the canonical contract", async () => {
    const prior = { ...process.env };
    try {
      process.env.GADS_OAUTH_CLIENT_ID = "client";
      process.env.GADS_OAUTH_CLIENT_SECRET = "secret";
      process.env.GADS_DEVELOPER_TOKEN = "developer";
      const normal = renderToStaticMarkup(await ConnectPage({ searchParams: Promise.resolve({}) }));
      const error = renderToStaticMarkup(await ConnectPage({ searchParams: Promise.resolve({ eroare: "google" }) }));
      expect(normal).toContain('data-public-oauth-surface="connect:normal"');
      expect(error).toContain('data-public-oauth-surface="connect:error"');
      expect(normal).toContain(publicOAuthProjection.connectNoMutations);
      expect(normal).toContain(publicOAuthProjection.surfaceDisclosure);
      expect(error).toContain(publicOAuthProjection.surfaceDisclosure);
    } finally {
      process.env = prior;
    }
  });
});
