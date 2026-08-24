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
  localizedOAuthClauses,
  publicOAuthClauseFacts,
  publicOAuthInfrastructureRegistry,
  publicOAuthAttributes,
  publicOAuthContract,
  publicOAuthProjection,
  projectOAuthClauses,
  publicOAuthStatement,
  publicOAuthSurfaceRegistry,
  projectPublicOAuth,
} from "@/lib/gads-public-oauth-contract";
import { GADS_LOCALIZED_COPY } from "@/lib/gads-localized-copy";
import { SCOPE } from "@/lib/gads-oauth";
import nextConfig from "@/next.config";

function walkSource(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walkSource(entryPath) : [path.relative(process.cwd(), entryPath)];
  });
}

const sourceTree = walkSource(path.join(process.cwd(), "app"));
const normalizeNextRoute = (source: string) => `/${source
  .replace(/^app\//, "")
  .replace(/\/\([^/]+\)/g, "")
  .replace(/(^|\/)(page|route)\.(ts|tsx)$/, "")}`.replace(/\/$/, "") || "/";

function resolveStaticImport(fromSource: string, specifier: string): string | null {
  if (!specifier.startsWith("@/") && !specifier.startsWith(".")) return null;
  const base = specifier.startsWith("@/")
    ? path.join(process.cwd(), specifier.slice(2))
    : path.resolve(process.cwd(), path.dirname(fromSource), specifier);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}.json`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return path.relative(process.cwd(), candidate);
  }
  return null;
}

function reachableStaticSources(roots: string[]): string[] {
  const visited = new Set<string>();
  const pending = [...roots];
  while (pending.length) {
    const source = pending.pop()!;
    if (visited.has(source)) continue;
    visited.add(source);
    if (source.endsWith(".json")) continue;
    const text = fs.readFileSync(path.join(process.cwd(), source), "utf8");
    for (const match of text.matchAll(/(?:import|export)\s+(?:[^"']+?\s+from\s+)?["']([^"']+)["']/g)) {
      const resolved = resolveStaticImport(source, match[1]);
      if (resolved) pending.push(resolved);
    }
  }
  return [...visited];
}

describe("public Google Ads access boundary", () => {
  it("exposes the one closed executable OAuth contract", () => {
    expect(publicOAuthContract).toEqual({
      providerScope: "adwords",
      permissionCapability: "broad",
      applicationBehavior: "read-operations-only",
      mutationBehavior: "none",
    });
    expect(SCOPE.endsWith(`/${publicOAuthContract.providerScope}`)).toBe(true);
    expect(Object.keys(localizedOAuthClauses).sort()).toEqual(Object.keys(publicOAuthClauseFacts).sort());
    expect(publicOAuthClauseFacts["oauth-permission-not-read-only"]).toEqual({ property: "permissionCapability", value: "broad" });
    expect(publicOAuthClauseFacts["application-read-operations-only"]).toEqual({ property: "applicationBehavior", value: "read-operations-only" });
    expect(publicOAuthClauseFacts["mutation-none"]).toEqual({ property: "mutationBehavior", value: "none" });
  });

  it("accepts canonical truth and refuses free-form permission semantics", () => {
    expect(publicOAuthStatement("oauth-is-not-read-only")).toBeTruthy();
    expect(() => publicOAuthStatement("exclusive-for-consultation" as never)).toThrow("Unknown public OAuth statement");
  });

  it("refuses a false canonical capability before localized projection", () => {
    expect(() => projectPublicOAuth({ ...publicOAuthContract, permissionCapability: "read-only" } as never))
      .toThrow("Unsupported public OAuth permission capability");
    expect("surfaceDisclosure" in publicOAuthProjection).toBe(false);
  });

  it("registers every public Google Ads route and shared legal surface with the canonical contract", async () => {
    const pageEntries = sourceTree
      .filter((source) => source.endsWith("/page.tsx"))
      .map((source) => ({ source, route: normalizeNextRoute(source) }));
    const discoveredRoutes = pageEntries
      .filter(({ route }) => route.startsWith("/google-ads") || ["/hub", "/confidentialitate", "/termeni"].includes(route))
      .map(({ route }) => route)
      .sort();
    const registeredRoutes = Object.values(publicOAuthSurfaceRegistry)
      .map(({ route }) => route)
      .sort();
    expect(registeredRoutes).toEqual(discoveredRoutes);

    for (const [surface, registration] of Object.entries(publicOAuthSurfaceRegistry)) {
      const source = pageEntries.find((entry) => entry.route === registration.route)?.source ?? "";
      const sourceText = fs.readFileSync(path.join(process.cwd(), source), "utf8");
      expect(sourceText, source).toMatch(new RegExp(`publicOAuthAttributes\\("${surface}|registeredPublicOAuthAttributes\\.${surface}`));
    }

    const apiSources = sourceTree
      .filter((source) => source.startsWith("app/api/google-ads/") && source.endsWith("/route.ts"))
      .sort();
    const registeredApiSources = Object.values(publicOAuthInfrastructureRegistry)
      .filter(({ kind }) => kind === "redirect-emitter")
      .map(({ source }) => source)
      .sort();
    expect(registeredApiSources).toEqual(apiSources);

    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const rewrites = await nextConfig.rewrites?.();
    process.env.NODE_ENV = previousNodeEnv;
    expect(rewrites && !Array.isArray(rewrites) ? rewrites.beforeFiles : []).toContainEqual({ source: "/", destination: publicOAuthInfrastructureRegistry.rootRewrite.destination });

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
    const pageRoots: string[] = [];
    for (const registration of Object.values(publicOAuthSurfaceRegistry)) {
      const source = sourceTree.find((entry) => entry.endsWith("/page.tsx") && normalizeNextRoute(entry) === registration.route) ?? "";
      pageRoots.push(source);
    }

    const publicMetadataSources = sourceTree.filter((source) => {
      if (!/(?:page|layout)\.tsx$/.test(source)) return false;
      const route = normalizeNextRoute(source.replace(/\/layout\.tsx$/, "/page.tsx"));
      return route.startsWith("/google-ads") || ["/", "/hub", "/confidentialitate", "/termeni"].includes(route);
    });
    for (const source of publicMetadataSources) {
      const sourceText = fs.readFileSync(path.join(process.cwd(), source), "utf8");
      const descriptions = sourceText.split("\n").filter((line) => line.includes("description:"));
      expect(descriptions.every((line) => line.includes("publicOAuthProjection.")), source).toBe(true);
      if (sourceText.includes("generateMetadata")) expect(sourceText, source).toMatch(/generateMetadata[\s\S]*publicOAuthProjection\./);
    }

    const apiRoots = Object.values(publicOAuthInfrastructureRegistry)
      .filter(({ kind }) => kind === "redirect-emitter")
      .map(({ source }) => source);
    for (const source of reachableStaticSources(apiRoots)) {
      if (source.endsWith(".json")) throw new Error(`Unregistered public JSON emitter: ${source}`);
      const sourceText = fs.readFileSync(path.join(process.cwd(), source), "utf8");
      expect(sourceText, source).not.toMatch(/NextResponse\.json|new Response\s*\(/);
    }
    expect(reachableStaticSources(pageRoots).filter((source) => source.endsWith(".json"))).toEqual([]);
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
      hub: publicOAuthStatement("application-performs-no-mutations"),
      privacy: publicOAuthStatement("oauth-is-not-read-only"),
      terms: publicOAuthStatement("application-performs-no-mutations"),
    }[surface];
    expect(html).toContain(expectedVisibleProjection);
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
      expect(normal).toContain(projectOAuthClauses("oauth-permission-not-read-only"));
      expect(normal).toContain(projectOAuthClauses("mutation-none"));
    } finally {
      process.env = prior;
    }
  });
});
