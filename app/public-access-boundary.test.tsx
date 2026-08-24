import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HubPage from "@/app/hub/page";
import PrivacyPage from "@/app/confidentialitate/page";
import TermsPage from "@/app/termeni/page";
import LandingPage from "@/app/google-ads/page";
import ConnectPage from "@/app/google-ads/connect/page";
import {
  publicLocalizedBranchRegistry,
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

const decodeOracle = (codes: number[]) => String.fromCharCode(...codes);
const localizedClauseOracle = Object.freeze({
  "provider-scope-adwords": decodeOracle([67, 117, 32, 97, 99, 111, 114, 100, 117, 108, 32, 116, 97, 117, 32, 101, 120, 112, 108, 105, 99, 105, 116, 44, 32, 97, 112, 108, 105, 99, 97, 116, 105, 97, 32, 99, 101, 114, 101, 32, 111, 32, 115, 105, 110, 103, 117, 114, 97, 32, 112, 101, 114, 109, 105, 115, 105, 117, 110, 101, 32, 71, 111, 111, 103, 108, 101, 32, 40, 97, 100, 119, 111, 114, 100, 115, 41, 46]),
  "oauth-permission-not-read-only": decodeOracle([80, 101, 114, 109, 105, 115, 105, 117, 110, 101, 97, 32, 79, 65, 117, 116, 104, 32, 71, 111, 111, 103, 108, 101, 32, 65, 100, 115, 32, 110, 117, 32, 101, 115, 116, 101, 32, 101, 120, 99, 108, 117, 115, 105, 118, 32, 100, 101, 32, 99, 105, 116, 105, 114, 101, 46]),
  "application-read-operations-only": decodeOracle([65, 112, 108, 105, 99, 97, 116, 105, 97, 32, 99, 105, 116, 101, 115, 116, 101, 32, 100, 97, 116, 101, 108, 101, 44, 32, 108, 101, 32, 99, 111, 109, 112, 97, 114, 97, 32, 99, 117, 32, 112, 114, 97, 103, 117, 114, 105, 108, 101, 32, 97, 102, 97, 99, 101, 114, 105, 105, 32, 116, 97, 108, 101, 32, 115, 105, 32, 105, 116, 105, 32, 97, 114, 97, 116, 97, 32, 114, 101, 122, 117, 108, 116, 97, 116, 117, 108, 32, 112, 101, 32, 108, 111, 99, 46]),
  "mutation-none": decodeOracle([78, 117, 32, 109, 111, 100, 105, 102, 105, 99, 97, 109, 32, 110, 105, 109, 105, 99, 32, 105, 110, 32, 99, 111, 110, 116, 117, 108, 32, 116, 97, 117, 46]),
});
function normalizeNextRoute(source: string): string {
  const route: string[] = [];
  const segments = source.replace(/^app\//, "").split("/");
  for (const segment of segments) {
    if (/^(page|route)\.(ts|tsx)$/.test(segment)) continue;
    if (segment.startsWith("@") || /^\([^.)][^)]*\)$/.test(segment)) continue;
    const intercepted = segment.match(/^(\(\.\)|(?:\(\.\.\))+|\(\.\.\.\))(.*)$/);
    if (!intercepted) {
      route.push(segment);
      continue;
    }
    const [, operator, target] = intercepted;
    if (operator === "(...)") route.length = 0;
    else if (operator !== "(.)") route.splice(Math.max(0, route.length - (operator.match(/\(\.\.\)/g)?.length ?? 0)));
    if (target) route.push(target);
  }
  return `/${route.join("/")}`;
}

const parsedConfig = ts.parseJsonConfigFileContent(
  ts.readConfigFile(path.join(process.cwd(), "tsconfig.json"), ts.sys.readFile).config,
  ts.sys,
  process.cwd(),
);
const sourceProgram = ts.createProgram(parsedConfig.fileNames, parsedConfig.options);
const sourceChecker = sourceProgram.getTypeChecker();

function staticString(node: ts.Expression): string | null {
  if (ts.isStringLiteralLike(node)) return node.text;
  if (ts.isIdentifier(node)) {
    const symbol = finalSymbol(sourceChecker.getSymbolAtLocation(node));
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) return staticString(declaration.initializer);
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node)) return staticString(node.expression);
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticString(node.left);
    const right = staticString(node.right);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      const expression = staticString(span.expression);
      if (expression === null) return null;
      value += expression + span.literal.text;
    }
    return value;
  }
  return null;
}

function moduleSpecifiers(sourceFile: ts.SourceFile): string[] {
  const specifiers: string[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isExpression(node.moduleSpecifier)) {
      const value = staticString(node.moduleSpecifier);
      if (value !== null) specifiers.push(value);
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      const value = node.arguments[0] && staticString(node.arguments[0]);
      if (value !== null) specifiers.push(value);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

function resolveModule(fromSource: string, specifier: string): string | null {
  const resolved = ts.resolveModuleName(specifier, path.join(process.cwd(), fromSource), parsedConfig.options, ts.sys).resolvedModule?.resolvedFileName;
  if (!resolved || resolved.includes("/node_modules/")) return null;
  return path.relative(process.cwd(), resolved.replace(/\.d\.ts$/, ".ts"));
}

function reachableSourceGraph(roots: string[]): string[] {
  const visited = new Set<string>();
  const pending = [...roots];
  while (pending.length) {
    const source = pending.pop()!;
    if (visited.has(source)) continue;
    visited.add(source);
    if (source.endsWith(".json")) continue;
    const sourceFile = sourceProgram.getSourceFile(path.join(process.cwd(), source));
    if (!sourceFile) throw new Error(`Source is outside the TypeScript program: ${source}`);
    for (const specifier of moduleSpecifiers(sourceFile)) {
      const resolved = resolveModule(source, specifier);
      if (resolved) pending.push(resolved);
    }
  }
  return [...visited];
}

function finalSymbol(symbol: ts.Symbol | undefined): ts.Symbol | undefined {
  let current = symbol;
  const seen = new Set<ts.Symbol>();
  while (current && (current.flags & ts.SymbolFlags.Alias) && !seen.has(current)) {
    seen.add(current);
    current = sourceChecker.getAliasedSymbol(current);
  }
  return current;
}

function expressionUsesProjection(node: ts.Node): boolean {
  let found = false;
  const visit = (candidate: ts.Node) => {
    if (ts.isIdentifier(candidate) && candidate.text === "publicOAuthProjection") {
      const symbol = finalSymbol(sourceChecker.getSymbolAtLocation(candidate));
      found = Boolean(symbol?.declarations?.some((declaration) => path.relative(process.cwd(), declaration.getSourceFile().fileName) === "lib/gads-public-oauth-contract.ts"));
    }
    if (!found) ts.forEachChild(candidate, visit);
  };
  visit(node);
  return found;
}

function descriptionExpressions(sourceFile: ts.SourceFile): ts.Expression[] {
  const expressions: ts.Expression[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isPropertyAssignment(node)) {
      const name = ts.isComputedPropertyName(node.name) ? staticString(node.name.expression) : node.name.getText(sourceFile).replace(/["']/g, "");
      if (name === "description") expressions.push(node.initializer);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return expressions;
}

function responseBodyEmitters(sourceFile: ts.SourceFile): ts.Node[] {
  const emitters: ts.Node[] = [];
  const responseIdentity = (expression: ts.Expression): string | null => {
    const symbol = finalSymbol(sourceChecker.getSymbolAtLocation(expression));
    if (symbol?.name === "Response" || symbol?.name === "NextResponse") return symbol.name;
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) return responseIdentity(declaration.initializer);
    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      const memberSymbol = finalSymbol(sourceChecker.getSymbolAtLocation(expression));
      if (memberSymbol?.name === "Response" || memberSymbol?.name === "NextResponse") return memberSymbol.name;
    }
    return null;
  };
  const visit = (node: ts.Node) => {
    if (ts.isNewExpression(node) && responseIdentity(node.expression) === "Response") emitters.push(node);
    if (ts.isCallExpression(node) && (ts.isPropertyAccessExpression(node.expression) || ts.isElementAccessExpression(node.expression))) {
      const member = ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : node.expression.argumentExpression && staticString(node.expression.argumentExpression);
      if (member === "json" && responseIdentity(node.expression.expression)) emitters.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return emitters;
}

describe("public Google Ads access boundary", () => {
  it("normalizes Next route groups, parallel slots, and interception segments by filesystem segment", () => {
    expect(normalizeNextRoute("app/(public)/google-ads/nou/page.tsx")).toBe("/google-ads/nou");
    expect(normalizeNextRoute("app/(public)/(campaign)/google-ads/(details)/nou/page.tsx")).toBe("/google-ads/nou");
    expect(normalizeNextRoute("app/google-ads/@modal/(.)nou/page.tsx")).toBe("/google-ads/nou");
    expect(normalizeNextRoute("app/google-ads/current/(..)nou/page.tsx")).toBe("/google-ads/nou");
    expect(normalizeNextRoute("app/google-ads/a/b/(..)(..)nou/page.tsx")).toBe("/google-ads/nou");
    expect(normalizeNextRoute("app/google-ads/(...)nou/page.tsx")).toBe("/nou");
  });
  it("exposes the one closed executable OAuth contract", () => {
    expect(publicOAuthContract).toEqual({
      providerScope: "adwords",
      permissionCapability: "broad",
      applicationBehavior: "read-operations-only",
      mutationBehavior: "none",
    });
    expect(SCOPE.endsWith(`/${publicOAuthContract.providerScope}`)).toBe(true);
    expect(publicOAuthClauseFacts["oauth-permission-not-read-only"]).toEqual({ property: "permissionCapability", value: "broad" });
    expect(publicOAuthClauseFacts["application-read-operations-only"]).toEqual({ property: "applicationBehavior", value: "read-operations-only" });
    expect(publicOAuthClauseFacts["mutation-none"]).toEqual({ property: "mutationBehavior", value: "none" });
  });

  it("renders each semantic fact through independently fixed localized grammar", () => {
    for (const clauseId of Object.keys(localizedClauseOracle) as Array<keyof typeof localizedClauseOracle>) {
      expect(projectOAuthClauses(clauseId)).toBe(localizedClauseOracle[clauseId]);
    }
    const contractSource = sourceProgram.getSourceFile(path.join(process.cwd(), "lib/gads-public-oauth-contract.ts"))!;
    const fullClauseMappings: ts.PropertyAssignment[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isPropertyAssignment(node)) {
        const name = ts.isComputedPropertyName(node.name) ? staticString(node.name.expression) : node.name.getText(contractSource).replace(/["']/g, "");
        if (name && name in localizedClauseOracle && ts.isStringLiteralLike(node.initializer)) fullClauseMappings.push(node);
      }
      ts.forEachChild(node, visit);
    };
    visit(contractSource);
    expect(fullClauseMappings).toEqual([]);
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
      .filter((source) => source.endsWith("/route.ts") && normalizeNextRoute(source).startsWith("/api/google-ads/"))
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

    const discoveredLayouts = sourceTree
      .filter((source) => source.endsWith("/layout.tsx") || source === "app/layout.tsx")
      .filter((source) => {
        const route = normalizeNextRoute(source.replace(/\/layout\.tsx$/, "/page.tsx"));
        return route === "/" || route.startsWith("/google-ads");
      })
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
      for (const reachable of reachableSourceGraph([source])) {
        if (reachable.endsWith(".json")) throw new Error(`Unregistered public JSON emitter: ${reachable}`);
        const sourceFile = sourceProgram.getSourceFile(path.join(process.cwd(), reachable));
        if (!sourceFile) throw new Error(`Source is outside the TypeScript program: ${reachable}`);
        for (const description of descriptionExpressions(sourceFile)) {
          expect(expressionUsesProjection(description), `${reachable}:${description.getStart(sourceFile)}`).toBe(true);
        }
      }
    }

    const apiRoots = Object.values(publicOAuthInfrastructureRegistry)
      .filter(({ kind }) => kind === "redirect-emitter")
      .map(({ source }) => source);
    for (const source of reachableSourceGraph(apiRoots)) {
      if (source.endsWith(".json")) throw new Error(`Unregistered public JSON emitter: ${source}`);
      const sourceFile = sourceProgram.getSourceFile(path.join(process.cwd(), source));
      if (!sourceFile) throw new Error(`Source is outside the TypeScript program: ${source}`);
      expect(responseBodyEmitters(sourceFile), source).toEqual([]);
    }
    expect(reachableSourceGraph(pageRoots).filter((source) => source.endsWith(".json"))).toEqual([]);
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
    expect(Object.values(GADS_LOCALIZED_COPY).every((value) => value.trim().length > 0)).toBe(true);
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
