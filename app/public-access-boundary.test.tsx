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

function staticStrings(node: ts.Expression, seen = new Set<ts.Node>()): string[] | null {
  if (seen.has(node)) return null;
  seen.add(node);
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (ts.isIdentifier(node)) {
    const symbol = finalSymbol(sourceChecker.getSymbolAtLocation(node));
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) return staticStrings(declaration.initializer, seen);
  }
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isAwaitExpression(node)) return staticStrings(node.expression, seen);
  if (ts.isConditionalExpression(node)) {
    const whenTrue = staticStrings(node.whenTrue, new Set(seen));
    const whenFalse = staticStrings(node.whenFalse, new Set(seen));
    return whenTrue && whenFalse ? [...new Set([...whenTrue, ...whenFalse])] : null;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticStrings(node.left, new Set(seen));
    const right = staticStrings(node.right, new Set(seen));
    return left && right ? left.flatMap((leftValue) => right.map((rightValue) => leftValue + rightValue)) : null;
  }
  if (ts.isTemplateExpression(node)) {
    let values = [node.head.text];
    for (const span of node.templateSpans) {
      const expressions = staticStrings(span.expression, new Set(seen));
      if (!expressions) return null;
      values = values.flatMap((value) => expressions.map((expression) => value + expression + span.literal.text));
    }
    return values;
  }
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    const key = ts.isPropertyAccessExpression(node) ? node.name.text : node.argumentExpression && staticString(node.argumentExpression);
    const owner = resolveExpression(node.expression, seen);
    if (key && owner && ts.isObjectLiteralExpression(owner)) {
      const property = owner.properties.find((candidate) => ts.isPropertyAssignment(candidate) && propertyName(candidate.name, owner.getSourceFile()) === key);
      if (property && ts.isPropertyAssignment(property)) return staticStrings(property.initializer, seen);
    }
  }
  if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "join") {
    const owner = finalSymbol(sourceChecker.getSymbolAtLocation(node.expression.expression));
    if (owner?.name === "path") {
      const parts = node.arguments.map((argument) => staticStrings(argument, new Set(seen)));
      if (parts.every((part): part is string[] => part !== null)) return parts.reduce<string[]>((values, part) => values.flatMap((value) => part.map((item) => path.posix.join(value, item))), [""]);
    }
  }
  return null;
}

function staticString(node: ts.Expression): string | null {
  const values = staticStrings(node);
  return values?.length === 1 ? values[0] : null;
}

function moduleSpecifiers(sourceFile: ts.SourceFile): string[] {
  const specifiers: string[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isExpression(node.moduleSpecifier)) {
      const values = staticStrings(node.moduleSpecifier);
      if (!values) throw new Error(`Unresolved module specifier: ${sourceFile.fileName}:${node.getStart(sourceFile)}`);
      specifiers.push(...values);
    } else if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
      const values = node.arguments[0] && staticStrings(node.arguments[0]);
      if (!values) throw new Error(`Unresolved dynamic module specifier: ${sourceFile.fileName}:${node.getStart(sourceFile)}`);
      specifiers.push(...values);
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

function propertyName(name: ts.PropertyName, sourceFile: ts.SourceFile): string | null {
  if (ts.isComputedPropertyName(name)) return staticString(name.expression);
  return name.getText(sourceFile).replace(/["']/g, "");
}

function functionReturns(node: ts.Node): ts.Expression[] {
  if ((ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && !ts.isBlock(node.body)) return [node.body];
  const returns: ts.Expression[] = [];
  const visit = (candidate: ts.Node) => {
    if (candidate !== node && (ts.isFunctionLike(candidate) || ts.isClassLike(candidate))) return;
    if (ts.isReturnStatement(candidate) && candidate.expression) returns.push(candidate.expression);
    else ts.forEachChild(candidate, visit);
  };
  visit(node);
  return returns;
}

function resolveExpression(node: ts.Expression, seen = new Set<ts.Node>()): ts.Expression | null {
  if (seen.has(node)) return null;
  seen.add(node);
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isAwaitExpression(node)) return resolveExpression(node.expression, seen);
  if (ts.isIdentifier(node)) {
    const symbol = finalSymbol(sourceChecker.getSymbolAtLocation(node));
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) return resolveExpression(declaration.initializer, seen);
    if (declaration && ts.isBindingElement(declaration)) {
      const variable = declaration.parent.parent;
      if (ts.isVariableDeclaration(variable) && variable.initializer) {
        const owner = resolveExpression(variable.initializer, seen);
        const key = declaration.propertyName ? propertyName(declaration.propertyName, declaration.getSourceFile()) : declaration.name.getText(declaration.getSourceFile());
        if (owner && key && ts.isObjectLiteralExpression(owner)) {
          const property = owner.properties.find((candidate) => ts.isPropertyAssignment(candidate) && propertyName(candidate.name, owner.getSourceFile()) === key);
          if (property && ts.isPropertyAssignment(property)) return resolveExpression(property.initializer, seen);
        }
      }
    }
    return node;
  }
  if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
    const owner = resolveExpression(node.expression, seen);
    const key = ts.isPropertyAccessExpression(node) ? node.name.text : node.argumentExpression && staticString(node.argumentExpression);
    if (owner && key && ts.isObjectLiteralExpression(owner)) {
      const property = owner.properties.find((candidate) => ts.isPropertyAssignment(candidate) && propertyName(candidate.name, owner.getSourceFile()) === key);
      if (property && ts.isPropertyAssignment(property)) return resolveExpression(property.initializer, seen);
    }
    return node;
  }
  if (ts.isCallExpression(node)) {
    if (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "resolve" && node.arguments[0]) return resolveExpression(node.arguments[0], seen);
    const callable = finalSymbol(sourceChecker.getSymbolAtLocation(node.expression));
    const declaration = callable?.valueDeclaration ?? callable?.declarations?.[0];
    if (declaration) {
      const returns = functionReturns(declaration);
      if (returns.length === 1) return resolveExpression(returns[0], seen);
    }
  }
  return node;
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

function finalObjectValues(expression: ts.Expression, key: string, seen = new Set<ts.Node>()): ts.Expression[] | null {
  if (seen.has(expression)) return null;
  seen.add(expression);
  const resolved = resolveExpression(expression, new Set(seen));
  if (resolved && resolved !== expression) return finalObjectValues(resolved, key, seen);
  if (ts.isConditionalExpression(expression)) {
    const whenTrue = finalObjectValues(expression.whenTrue, key, new Set(seen));
    const whenFalse = finalObjectValues(expression.whenFalse, key, new Set(seen));
    return whenTrue && whenFalse ? [...whenTrue, ...whenFalse] : null;
  }
  if (ts.isCallExpression(expression)) {
    const callable = finalSymbol(sourceChecker.getSymbolAtLocation(expression.expression));
    const declaration = callable?.valueDeclaration ?? callable?.declarations?.[0];
    if (!declaration) return null;
    const returns = functionReturns(declaration);
    const values = returns.map((returned) => finalObjectValues(returned, key, new Set(seen)));
    return values.every((value): value is ts.Expression[] => value !== null) ? values.flat() : null;
  }
  if (!ts.isObjectLiteralExpression(expression)) return null;
  let values: ts.Expression[] = [];
  for (const member of expression.properties) {
    if (ts.isSpreadAssignment(member)) {
      const spreadValues = finalObjectValues(member.expression, key, new Set(seen));
      if (spreadValues === null) return null;
      if (spreadValues.length) values = spreadValues;
      continue;
    }
    const name = propertyName(member.name, expression.getSourceFile());
    if (name !== key) continue;
    if (ts.isPropertyAssignment(member)) values = [member.initializer];
    else if (ts.isShorthandPropertyAssignment(member)) values = [member.name];
    else if (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) values = functionReturns(member);
    else return null;
  }
  return values;
}

function emittedMetadataValues(sourceFile: ts.SourceFile, key: "description" | "title"): ts.Expression[] {
  const values: ts.Expression[] = [];
  const moduleSymbol = sourceChecker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) return values;
  for (const exported of sourceChecker.getExportsOfModule(moduleSymbol)) {
    const symbol = finalSymbol(exported);
    if (!symbol || (exported.name !== "metadata" && exported.name !== "generateMetadata")) continue;
    const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
    if (!declaration) throw new Error(`Unresolved metadata export: ${sourceFile.fileName}:${exported.name}`);
    const outputs = ts.isVariableDeclaration(declaration) && declaration.initializer
      ? [declaration.initializer]
      : functionReturns(declaration);
    if (!outputs.length) throw new Error(`Metadata export has no statically reachable value: ${sourceFile.fileName}:${exported.name}`);
    for (const output of outputs) {
      const finalValues = finalObjectValues(output, key);
      if (finalValues === null) throw new Error(`Unresolved final metadata ${key}: ${sourceFile.fileName}:${exported.name}`);
      values.push(...finalValues);
    }
  }
  return values;
}

function responseBodyEmitters(sourceFile: ts.SourceFile): ts.Node[] {
  const emitters: ts.Node[] = [];
  const responseIdentity = (expression: ts.Expression, seen = new Set<ts.Expression>()): string | null => {
    if (seen.has(expression)) return null;
    seen.add(expression);
    const resolved = resolveExpression(expression);
    if (resolved && resolved !== expression) return responseIdentity(resolved, seen);
    const symbol = finalSymbol(sourceChecker.getSymbolAtLocation(expression));
    if (symbol?.name === "Response" || symbol?.name === "NextResponse") return symbol.name;
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) return responseIdentity(declaration.initializer, seen);
    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      const memberSymbol = finalSymbol(sourceChecker.getSymbolAtLocation(expression));
      if (memberSymbol?.name === "Response" || memberSymbol?.name === "NextResponse") return memberSymbol.name;
    }
    return null;
  };
  const responseJsonIdentity = (expression: ts.Expression): boolean => {
    if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
      const member = ts.isPropertyAccessExpression(expression) ? expression.name.text : expression.argumentExpression && staticString(expression.argumentExpression);
      return member === "json" && Boolean(responseIdentity(expression.expression));
    }
    const symbol = finalSymbol(sourceChecker.getSymbolAtLocation(expression));
    const declaration = symbol?.valueDeclaration ?? symbol?.declarations?.[0];
    if (declaration && ts.isVariableDeclaration(declaration) && declaration.initializer) return responseJsonIdentity(declaration.initializer);
    if (declaration && ts.isBindingElement(declaration)) {
      const key = declaration.propertyName ? propertyName(declaration.propertyName, declaration.getSourceFile()) : declaration.name.getText(declaration.getSourceFile());
      const variable = declaration.parent.parent;
      return key === "json" && ts.isVariableDeclaration(variable) && Boolean(variable.initializer && responseIdentity(variable.initializer));
    }
    return false;
  };
  const visit = (node: ts.Node) => {
    if (ts.isNewExpression(node) && responseIdentity(node.expression) === "Response") emitters.push(node);
    if (ts.isCallExpression(node) && responseJsonIdentity(node.expression)) emitters.push(node);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return emitters;
}

function freeBoundaryLiterals(sourceFile: ts.SourceFile): Array<{ text: string; position: number }> {
  const literals: Array<{ text: string; position: number }> = [];
  const hasProjectionProvenance = (node: ts.Node) => {
    let current: ts.Node | undefined = node;
    while (current && current !== sourceFile) {
      if (ts.isCallExpression(current)) {
        const symbol = finalSymbol(sourceChecker.getSymbolAtLocation(current.expression));
        if (symbol?.declarations?.some((declaration) => path.relative(process.cwd(), declaration.getSourceFile().fileName) === "lib/gads-public-oauth-contract.ts")) return true;
      }
      current = current.parent;
    }
    return false;
  };
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) || ts.isImportTypeNode(node)) return;
    const text = ts.isJsxText(node) ? node.text : ts.isStringLiteralLike(node) ? node.text : null;
    if (text !== null && !hasProjectionProvenance(node) && (/\boauth\b/i.test(text) || /\badwords\b/i.test(text) || /\bpermission\b/i.test(text))) {
      literals.push({ text, position: node.getStart(sourceFile) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return literals;
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

  it("requires every dynamic module target to resolve to a finite source set", () => {
    const finite = ts.createSourceFile("finite.ts", "void import(flag ? './first' : './second');", ts.ScriptTarget.Latest, true);
    expect(moduleSpecifiers(finite).sort()).toEqual(["./first", "./second"]);
    const unresolved = ts.createSourceFile("unresolved.ts", "void import('./copy/' + runtimeName);", ts.ScriptTarget.Latest, true);
    expect(() => moduleSpecifiers(unresolved)).toThrow("Unresolved dynamic module specifier");
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
        for (const description of emittedMetadataValues(sourceFile, "description")) {
          expect(expressionUsesProjection(description), `${reachable}:${description.getStart(sourceFile)}`).toBe(true);
        }
        for (const title of emittedMetadataValues(sourceFile, "title")) {
          expect(staticStrings(title) ?? (expressionUsesProjection(title) ? ["projected"] : null), `${reachable}:${title.getStart(sourceFile)}`).not.toBeNull();
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
    for (const source of [...pageRoots, "lib/gads-localized-copy.ts"]) {
      const sourceFile = sourceProgram.getSourceFile(path.join(process.cwd(), source));
      if (!sourceFile) throw new Error(`Source is outside the TypeScript program: ${source}`);
      expect(freeBoundaryLiterals(sourceFile), source).toEqual([]);
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
