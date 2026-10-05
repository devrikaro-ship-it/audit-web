// The structure rules of spec 2026-10-05 §3 as pure functions over a file and its imports.
import path from "node:path";
import ts from "typescript";
import { ROUTE_TABLE, matchRoute } from "../../shared/route-table";

export type Imported = { spec: string; target: string; typeOnly: boolean };
export type Place = { kind: "app" | "routes" | "shared" | "module" | "other"; module?: string;
  layer?: "model" | "data" | "controller" | "view" | "index" | "other" };

export function placeOf(file: string): Place {
  const p = file.split(path.sep).join("/");
  if (p.startsWith("routes/")) return { kind: "routes", module: p.slice("routes/".length).replace(/\.ts$/, "") };
  if (p.startsWith("app/")) return { kind: "app" };
  if (p.startsWith("shared/")) return { kind: "shared" };
  const m = p.match(/^modules\/([^/]+)\/(.*)$/);
  if (!m) return { kind: "other" };
  const rest = m[2];
  const layer = rest === "index.ts" ? "index" : rest.startsWith("model/data/") ? "data" : rest.startsWith("model/") ? "model"
    : rest.startsWith("controller/") ? "controller" : rest.startsWith("view/") ? "view" : "other";
  return { kind: "module", module: m[1], layer };
}

function resolve(file: string, spec: string): string {
  if (spec.startsWith("@/")) return spec.slice(2);
  if (spec.startsWith(".")) return path.posix.normalize(path.posix.join(path.posix.dirname(file.split(path.sep).join("/")), spec));
  return spec;
}

export function importsOf(file: string, source: string): Imported[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const out: Imported[] = [];
  const add = (spec: string, typeOnly: boolean) => out.push({ spec, target: resolve(file, spec), typeOnly });
  const visit = (node: ts.Node) => {
    // A declaration is type-only when written "import type" or when every name it brings is a type ({ type A, type B }).
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const c = node.importClause;
      const named = c?.namedBindings && ts.isNamedImports(c.namedBindings) ? c.namedBindings.elements : null;
      add(node.moduleSpecifier.text, !!c && (c.isTypeOnly || (!c.name && !!named && named.length > 0 && named.every((e) => e.isTypeOnly))));
    }
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) add(node.moduleSpecifier.text, node.isTypeOnly);
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) add(node.arguments[0].text, false);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const PURE_SHARED = ["shared/copy", "shared/theme", "shared/route-table", "shared/public-contract"];
const VIEW_SHARED = [...PURE_SHARED, "shared/ui"];
const VIEW_PACKAGES = ["react", "react-dom", "next/link", "next/navigation", "next/image"];
const MODEL_PACKAGES = ["zod"];
const under = (target: string, roots: string[]) => roots.some((r) => target === r || target.startsWith(r + "/") || target.startsWith(r + "."));
const inModule = (target: string, module: string, sub: string) => target.startsWith(`modules/${module}/${sub}`);

function usesForbiddenGlobals(source: string): string[] {
  const found: string[] = [];
  if (/\bprocess\.env\b/.test(source)) found.push("process.env");
  if (/(^|[^.\w])fetch\s*\(/.test(source)) found.push("fetch(");
  return found;
}

// Literals that start with an address of the app: "/r/", "/dashboard", "/google-ads/..."; "/" alone is not one.
function handWrittenPaths(source: string): string[] {
  const firsts = new Set(Object.values(ROUTE_TABLE).map((r) => r.path.split("/")[1]).filter(Boolean));
  const hits: string[] = [];
  for (const m of source.matchAll(/["'`](\/[A-Za-z0-9_\-[\]]+)(?=[/"'`?$])/g)) if (firsts.has(m[1].slice(1))) hits.push(m[1]);
  return hits;
}

// The addresses bound in the binding files (routes/<module>.ts; routes/index.ts only gathers them).
export function boundRouteIds(routesSource: string | null): Set<string> {
  if (!routesSource) return new Set();
  const sf = ts.createSourceFile("routes.ts", routesSource, ts.ScriptTarget.Latest, true);
  const ids = new Set<string>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(sf) === "routes" && node.initializer) {
      const init = ts.isSatisfiesExpression(node.initializer) ? node.initializer.expression : node.initializer;
      if (ts.isObjectLiteralExpression(init)) for (const p of init.properties) if (p.name) ids.add(p.name.getText(sf));
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return ids;
}

function appRouteId(file: string): string | null {
  const p = file.split(path.sep).join("/");
  if (!/\/(page|route)\.tsx?$/.test(p)) return null;
  const url = "/" + p.replace(/^app\//, "").split("/").slice(0, -1).filter((s) => !/^\(.*\)$/.test(s)).join("/");
  return matchRoute(url === "/" ? "/" : url.replace(/\/$/, ""));
}

export function checkFile(file: string, source: string, bound: Set<string>): string[] {
  const where = placeOf(file);
  const imports = importsOf(file, source);
  const v: string[] = [];
  const say = (rule: number, what: string) => v.push(`rule ${rule}: ${file}: ${what}`);

  // Rule 4: another module only through its index.
  if (where.kind === "module" || where.kind === "routes" || where.kind === "app") {
    for (const i of imports) {
      const m = i.target.match(/^modules\/([^/]+)(\/.*)?$/);
      if (m && (where.kind !== "module" || m[1] !== where.module) && m[2] && m[2] !== "/index" && m[2] !== "/index.ts") say(4, `imports ${i.spec} past the index of ${m[1]}`);
    }
  }
  // Rule 5: shared depends on no module and not on routes.ts.
  if (where.kind === "shared") for (const i of imports) if (i.target.startsWith("modules/") || i.target === "routes" || i.target.startsWith("routes/")) say(5, `imports ${i.spec}`);
  // Rule 3: the model touches no network, disk, environment or React.
  if (where.kind === "module" && where.layer === "model") {
    for (const i of imports) {
      if (i.typeOnly) continue;
      const ok = (inModule(i.target, where.module!, "model/") && !inModule(i.target, where.module!, "model/data/"))
        || under(i.target, PURE_SHARED) || MODEL_PACKAGES.includes(i.target);
      if (!ok) say(3, `imports ${i.spec}`);
    }
    for (const g of usesForbiddenGlobals(source)) say(3, `uses ${g}`);
  }
  // Rule 2: the view reads no data itself.
  if (where.kind === "module" && where.layer === "view") {
    for (const i of imports) {
      if (i.typeOnly || i.target.endsWith(".css")) continue;
      const ok = inModule(i.target, where.module!, "view/") || inModule(i.target, where.module!, "controller/")
        || (inModule(i.target, where.module!, "model/") && !inModule(i.target, where.module!, "model/data/"))
        || under(i.target, VIEW_SHARED) || VIEW_PACKAGES.includes(i.target);
      if (!ok) say(2, `imports ${i.spec}`);
    }
  }
  // Rule 1: a bound address file calls routes.ts and Next only.
  const id = where.kind === "app" ? appRouteId(file) : null;
  // ...and only its own module's binding file, so a page loads its own module only.
  if (id && bound.has(id)) {
    const own = `routes/${ROUTE_TABLE[id as keyof typeof ROUTE_TABLE].module}`;
    for (const i of imports) if (!i.typeOnly && i.target !== own && i.target !== "next" && !i.target.startsWith("next/")) say(1, `imports ${i.spec}`);
  }
  // Rule 7: no hand-written address in a module or a bound address file.
  if (where.kind === "module" || (id && bound.has(id))) for (const h of handWrittenPaths(source)) say(7, `writes the address ${h} by hand`);
  return v;
}
