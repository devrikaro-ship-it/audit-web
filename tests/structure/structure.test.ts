import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROUTE_TABLE, matchRoute } from "../../shared/route-table";
import { boundRouteIds, checkFile } from "./rules";

const none = new Set<string>();
const ok = (file: string, source: string, bound = none) => expect(checkFile(file, source, bound)).toEqual([]);
const bad = (file: string, source: string, rule: number, bound = none) =>
  expect(checkFile(file, source, bound).some((v) => v.startsWith(`rule ${rule}:`))).toBe(true);

describe("structure rules on fixtures", () => {
  it("rule 1: a bound address file calls routes.ts and Next only", () => {
    const bound = new Set(["siteReport"]);
    ok("app/(site-audit)/r/[id]/page.tsx", `import { routes } from "@/routes";\nexport default routes.siteReport;`, bound);
    bad("app/(site-audit)/r/[id]/page.tsx", `import { getAudit } from "@/lib/leads-store";`, 1, bound);
    ok("app/(site-audit)/r/[id]/page.tsx", `import { getAudit } from "@/lib/leads-store";`);   // not bound yet
  });
  it("rule 2: a view reads no data", () => {
    ok("modules/site-audit/view/deck.tsx", `import { useState } from "react";\nimport { show } from "../controller/show";`);
    bad("modules/site-audit/view/deck.tsx", `import { load } from "../model/data/audit-repository";`, 2);
    bad("modules/site-audit/view/deck.tsx", `import { jsonStore } from "@/shared/storage/json-file";`, 2);
  });
  it("rule 3: the model touches no network, disk, environment or React", () => {
    ok("modules/site-audit/model/score.ts", `import { WORD } from "@/shared/copy";\nimport type { X } from "./data/x";`);
    bad("modules/site-audit/model/score.ts", `import { promises } from "node:fs";`, 3);
    bad("modules/site-audit/model/score.ts", `const k = process.env.KEY;`, 3);
    bad("modules/site-audit/model/score.ts", `await fetch("https://x");`, 3);
    ok("modules/site-audit/model/data/repo.ts", `import { promises } from "node:fs";\nconst k = process.env.KEY;`);
  });
  it("rule 4: another module only through its index", () => {
    ok("modules/dashboard/controller/list.ts", `import { siteAudit } from "@/modules/site-audit";`);
    bad("modules/dashboard/controller/list.ts", `import { load } from "@/modules/site-audit/model/data/repo";`, 4);
  });
  it("rule 5: shared depends on no module", () => {
    bad("shared/ui/button.tsx", `import { x } from "@/modules/site-audit";`, 5);
    bad("shared/auth/session.ts", `import { routes } from "@/routes";`, 5);
  });
  it("rule 7: no hand-written address", () => {
    bad("modules/site-audit/view/deck.tsx", "const a = `/r/${id}`;", 7);
    bad("modules/dashboard/view/nav.tsx", `<a href="/dashboard">`, 7);
    ok("modules/site-audit/view/deck.tsx", `const a = "/fonts/sora.woff2"; const b = "/";`);
  });
  it("reads the bound addresses from routes.ts", () => {
    expect([...boundRouteIds(`export const routes = { siteReport: a.b, siteFunnel: c } satisfies Record<RouteId, C>;`)]).toEqual(["siteReport", "siteFunnel"]);
    expect(boundRouteIds(null).size).toBe(0);
  });
});

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "node_modules" ? [] : walk(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe("structure rules on the repository", () => {
  const root = process.cwd();
  const rel = (p: string) => path.relative(root, p);
  const routesFile = path.join(root, "routes.ts");
  const bound = boundRouteIds(fs.existsSync(routesFile) ? fs.readFileSync(routesFile, "utf8") : null);
  const files = [...walk(path.join(root, "modules")), ...walk(path.join(root, "shared")), ...walk(path.join(root, "app")),
    ...(fs.existsSync(routesFile) ? [routesFile] : [])];

  it("rules 1-5 and 7 hold in every file", () => {
    expect(files.flatMap((f) => checkFile(rel(f), fs.readFileSync(f, "utf8"), bound))).toEqual([]);
  });

  it("rule 6: every address file has one table entry and every entry has its file", () => {
    const urls = walk(path.join(root, "app")).map(rel).filter((f) => /\/(page|route)\.tsx?$/.test(f))
      .map((f) => "/" + f.replace(/^app\//, "").split("/").slice(0, -1).filter((s) => !/^\(.*\)$/.test(s)).join("/"))
      .map((u) => (u === "/" ? "/" : u.replace(/\/$/, "")));
    const patterns = urls.map((u) => u.replace(/\[[^\]]+\]/g, "x1"));
    const ids = patterns.map((u) => matchRoute(u));
    expect(ids.filter((id) => id === null), "address files with no entry").toEqual([]);
    expect(new Set(ids).size, "two files on one entry").toBe(ids.length);
    expect(Object.keys(ROUTE_TABLE).filter((id) => !ids.includes(id as never)), "entries with no file").toEqual([]);
  });
});
