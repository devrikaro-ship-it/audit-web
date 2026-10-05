# MVC Rewrite — Plan 1: the Skeleton

> **Execution:** inline in the primary session with superpowers:executing-plans (subagents are disabled by
> `~/AGENTS.md`). Order inside each task follows the operator's rule: implementation first, then the tests, then each
> new test is seen failing with the defect put back (negative control). Steps use checkbox (`- [ ]`) syntax.

**Goal:** lay down the shared skeleton of the modular MVC structure — test config, route groups, the address table,
shared storage, host routing and access read from the table, and the structure tests — without changing any behaviour.

**Architecture:** spec `docs/superpowers/specs/2026-10-05-mvc-modular-rewrite-design.md` (b45d86e). Plans 2–4 move
site-audit, google-ads and dashboard into `modules/` and bind them in `routes.ts`; this plan creates what they stand on.

**Tech Stack:** Next 16.2.4 (App Router, `proxy.ts`), TypeScript 5 strict, Vitest 4, Node 20+, the `typescript`
compiler API for the structure tests.

## Global Constraints

1. Branch `rewrite/mvc-modules`, worktree `~/seo-audit-mvc`; nothing is deployed until all four plans are done.
2. Behaviour does not change: the same 30 addresses, reports, stored files, env variables and HTTP answers. The only
   intended changes are listed in this plan, each with its reason.
3. Every file written is English (code, comments, test names, commit messages).
4. Read `node_modules/next/dist/docs/` before any Next-specific code (`AGENTS.md` of the repo).
5. Stage files by name, never `git add -A`; every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
6. `skill/mistakes.md` is never committed (it holds a client's sales figures).

## File map

| File | Responsibility |
|---|---|
| `vitest.config.ts`, `vitest.public-output.config.ts` | include tests under `modules/`, `shared/`, `tests/` |
| `app/(public)/`, `app/(site-audit)/`, `app/(google-ads)/`, `app/(dashboard)/` | the existing route files, moved into route groups (URLs unchanged) |
| `shared/route-table.ts` | the 30 addresses as data; `href`, `matchRoute`, `accessFor` |
| `shared/storage/json-file.ts` | `readJson`, `writeJsonAtomic`, `withFileLock`, `jsonStore` |
| `shared/host-routing.ts` | moved from `lib/host-routing.ts`; site-host addresses read from the table |
| `proxy.ts` | access read from the table |
| `tests/structure/rules.ts` | the structure rules as pure functions over (file, imports) |
| `tests/structure/structure.test.ts` | rules on fixtures + the whole repository |

---

### Task 1: Test configuration covers the new folders

**Files:**
- Modify: `vitest.config.ts`
- Modify: `vitest.public-output.config.ts`
- Modify: `lib/no-build-time-fonts.test.ts:15`, `lib/gads-api.test.ts:141` (the folder lists they scan)

**Interfaces:** Produces: tests in `modules/**`, `shared/**`, `tests/**` are collected by `npm test`.

- [ ] **Step 1: Widen the include lists**

In both vitest configs replace the `include` value with:

```ts
include: ["lib/**/*.test.ts", "app/**/*.test.tsx", "modules/**/*.test.{ts,tsx}", "shared/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
```

- [ ] **Step 2: Widen the two scanning tests**

`lib/no-build-time-fonts.test.ts:15`: `["app", "components", "lib"]` → `["app", "components", "lib", "modules", "shared"]`.
`lib/gads-api.test.ts:141`: `[...rada("lib"), ...rada("app")]` → `[...rada("lib"), ...rada("app"), ...rada("modules"), ...rada("shared")]`,
and make `rada` return `[]` for a missing folder (`if (!existsSync(dir)) return [];` as its first line, importing
`existsSync` from `node:fs`) so the test passes before the folders exist.

- [ ] **Step 3: Prove a test in a new folder is collected**

```bash
mkdir -p tests && printf 'import { it, expect } from "vitest";\nit("collected", () => expect(1).toBe(2));\n' > tests/probe.test.ts
npx vitest run tests/probe.test.ts   # Expected: 1 failed
rm tests/probe.test.ts
npx vitest run lib/no-build-time-fonts.test.ts lib/gads-api.test.ts   # Expected: all pass
```

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts vitest.public-output.config.ts lib/no-build-time-fonts.test.ts lib/gads-api.test.ts
git commit -m "Collect tests from modules/, shared/ and tests/, and scan the new folders in the source-wide tests"
```

---

### Task 2: Route files move into route groups, URLs unchanged

**Files:** every route file and its colocated tests and CSS move; `app/layout.tsx`, `app/globals.css`, `app/fonts.css`,
`app/dvk.css`, `app/favicon.ico`, `app/public-*` stay at `app/`.

| Group | Folders moved into it |
|---|---|
| `app/(public)/` | `page.tsx` (with its tests), `audituri/`, `hub/`, `termeni/`, `confidentialitate/` |
| `app/(site-audit)/` | `audit-seo/`, `audit/`, `start/`, `processing/`, `r/`, `api/scan/`, `api/audit/` |
| `app/(google-ads)/` | `google-ads/`, `api/google-ads/` |
| `app/(dashboard)/` | `dashboard/` |

**Interfaces:** Produces: the folder layout plans 2–4 bind; path strings below updated.

- [ ] **Step 1: Record the route list before the move**

```bash
npx next build 2>&1 | grep -oE "[├└┌] [ƒ○●] /[^ ]*" | awk '{print $3}' | sort > /tmp/routes-before.txt
wc -l /tmp/routes-before.txt   # Expected: 30 addresses plus /_not-found and static entries; keep the file
```

- [ ] **Step 2: Move with git**

```bash
mkdir -p "app/(public)" "app/(site-audit)/api" "app/(google-ads)/api" "app/(dashboard)"
git mv app/page.tsx "app/(public)/page.tsx"
for f in app/page.test.tsx; do [ -f "$f" ] && git mv "$f" "app/(public)/"; done
for d in audituri hub termeni confidentialitate; do git mv "app/$d" "app/(public)/$d"; done
for d in audit-seo audit start processing r; do git mv "app/$d" "app/(site-audit)/$d"; done
git mv app/api/scan "app/(site-audit)/api/scan"; git mv app/api/audit "app/(site-audit)/api/audit"
git mv app/google-ads "app/(google-ads)/google-ads"; git mv app/api/google-ads "app/(google-ads)/api/google-ads"
git mv app/dashboard "app/(dashboard)/dashboard"
ls app/api   # Expected: empty or missing; remove the empty folder
```

- [ ] **Step 3: Update the path strings that name moved files**

| File:line | From | To |
|---|---|---|
| `app/public-access-boundary.test.tsx:556` | `"app/api/google-ads/"` | `"app/(google-ads)/api/google-ads/"` |
| `app/public-access-boundary.test.tsx:713`, `:746` | `"app/google-ads/page.tsx"` | `"app/(google-ads)/google-ads/page.tsx"` |
| `lib/gads-api.test.ts:127` | `join("app", "google-ads", "conturi", "actions.ts")` | `join("app", "(google-ads)", "google-ads", "conturi", "actions.ts")` |
| `lib/gads-public-oauth-contract.ts:32-34` | `app/api/google-ads/…` | `app/(google-ads)/api/google-ads/…` |
| `lib/phone-print.test.ts:7` | `"app/r/report-deck.css"` | `"app/(site-audit)/r/report-deck.css"` |
| `lib/report-client-imports.test.ts:34` | `"app/r/[id]/page.tsx"` | `"app/(site-audit)/r/[id]/page.tsx"` |

Then search for any other: `git grep -n -E "[\"'\`]app/(api|r|google-ads|dashboard|start|processing|audit|audit-seo|hub|termeni|confidentialitate|audituri)/" -- '*.ts' '*.tsx'`
Expected: no match outside the `normalizeNextRoute` fixtures of `app/public-access-boundary.test.tsx:381-387`.

- [ ] **Step 4: Regenerate the public-output manifest and check it changed only by path**

```bash
UPDATE_PUBLIC_OUTPUT_REACHABLE_FILES=1 npx vitest run app/public-access-boundary.test.tsx
git diff app/public-output-reachable-files.json | grep -E "^[-+] " | sed -E 's#\((public|site-audit|google-ads|dashboard)\)/##' | sort | uniq -u
```
Expected: empty output — every removed line comes back with only its route group added.

- [ ] **Step 5: Prove the URLs did not change**

```bash
npx next build 2>&1 | grep -oE "[├└┌] [ƒ○●] /[^ ]*" | awk '{print $3}' | sort > /tmp/routes-after.txt
diff /tmp/routes-before.txt /tmp/routes-after.txt && echo IDENTICAL
npm test   # Expected: every test passes (818 at the start of the branch)
```

- [ ] **Step 6: Commit**

```bash
git add -u app lib && git add "app/(public)" "app/(site-audit)" "app/(google-ads)" "app/(dashboard)"
git commit -m "Group the route files by module in Next route groups; the build lists the same addresses"
```

---

### Task 3: The address table

**Files:**
- Create: `shared/route-table.ts`
- Test: `shared/route-table.test.ts`

**Interfaces:** Produces:
```ts
export type Access = "public" | "agency" | "gads-session";
export type ModuleName = "public" | "site-audit" | "google-ads" | "dashboard";
export type RouteDef = { path: string; module: ModuleName; access: Access; onSiteHost: boolean };
export const ROUTE_TABLE: { readonly [id: string]: RouteDef };   // exactly the 30 entries below
export type RouteId = keyof typeof ROUTE_TABLE;
export function href(id: RouteId, params?: Record<string, string>): string;
export function matchRoute(pathname: string): RouteId | null;
export function accessFor(pathname: string): Access;   // "public" for an unknown path
```

- [ ] **Step 1: Write the table**

```ts
// The single address register (spec 2026-10-05 §4): every address of the app as plain data. It imports nothing, so
// proxy.ts and the host routing can read it without loading the modules. routes.ts binds each entry to a controller.
export type Access = "public" | "agency" | "gads-session";
export type ModuleName = "public" | "site-audit" | "google-ads" | "dashboard";
export type RouteDef = { path: string; module: ModuleName; access: Access; onSiteHost: boolean };

const route = (path: string, module: ModuleName, access: Access, onSiteHost: boolean): RouteDef => ({ path, module, access, onSiteHost });

export const ROUTE_TABLE = {
  home: route("/", "public", "public", false),
  audits: route("/audituri", "public", "public", true),
  hub: route("/hub", "public", "public", false),
  terms: route("/termeni", "public", "public", false),
  privacy: route("/confidentialitate", "public", "public", false),

  siteLanding: route("/audit-seo", "site-audit", "public", true),
  siteAuditAlias: route("/audit", "site-audit", "public", true),
  siteFunnel: route("/start", "site-audit", "public", true),
  siteProcessing: route("/processing/[id]", "site-audit", "public", true),
  siteReport: route("/r/[id]", "site-audit", "public", true),
  siteReportPdf: route("/r/[id]/pdf", "site-audit", "public", true),
  siteReportPreview: route("/r/preview", "site-audit", "public", true),
  siteScanApi: route("/api/scan", "site-audit", "public", true),
  siteAuditApi: route("/api/audit", "site-audit", "public", true),

  gadsLanding: route("/google-ads", "google-ads", "public", false),
  gadsConnect: route("/google-ads/connect", "google-ads", "public", false),
  gadsAccounts: route("/google-ads/conturi", "google-ads", "gads-session", false),
  gadsTogether: route("/google-ads/impreuna", "google-ads", "gads-session", false),
  gadsMargin: route("/google-ads/marja", "google-ads", "gads-session", false),
  gadsPortal: route("/google-ads/portal/[token]", "google-ads", "public", false),
  gadsReport: route("/google-ads/raport", "google-ads", "gads-session", false),
  gadsStartApi: route("/api/google-ads/start", "google-ads", "public", false),
  gadsCallbackApi: route("/api/google-ads/callback", "google-ads", "public", false),
  gadsReportDownloadApi: route("/api/google-ads/reports/[id]", "google-ads", "public", false),

  dashboardHome: route("/dashboard", "dashboard", "agency", true),
  dashboardGads: route("/dashboard/google-ads", "dashboard", "agency", true),
  dashboardGadsReport: route("/dashboard/google-ads/reports/[id]", "dashboard", "agency", true),
  dashboardLogin: route("/dashboard/login", "dashboard", "public", true),
  dashboardLoginSubmit: route("/dashboard/login/submit", "dashboard", "public", true),
  dashboardLogout: route("/dashboard/logout", "dashboard", "agency", true),
} as const satisfies Record<string, RouteDef>;

export type RouteId = keyof typeof ROUTE_TABLE;

const segments = (p: string) => p.split("/").filter(Boolean);
const isParam = (s: string) => /^\[[^\]]+\]$/.test(s);

export function href(id: RouteId, params: Record<string, string> = {}): string {
  const parts = segments(ROUTE_TABLE[id].path).map((s) => {
    if (!isParam(s)) return s;
    const value = params[s.slice(1, -1)];
    if (!value) throw new Error(`href(${id}): missing parameter ${s}`);
    return encodeURIComponent(value);
  });
  return "/" + parts.join("/");
}

// A static segment beats a parameter: /r/preview is siteReportPreview, not siteReport.
export function matchRoute(pathname: string): RouteId | null {
  const asked = segments(pathname);
  let best: { id: RouteId; params: number } | null = null;
  for (const id of Object.keys(ROUTE_TABLE) as RouteId[]) {
    const pattern = segments(ROUTE_TABLE[id].path);
    if (pattern.length !== asked.length) continue;
    if (!pattern.every((s, i) => isParam(s) || s === asked[i])) continue;
    const params = pattern.filter(isParam).length;
    if (!best || params < best.params) best = { id, params };
  }
  return best?.id ?? null;
}

export function accessFor(pathname: string): Access {
  const id = matchRoute(pathname);
  return id ? ROUTE_TABLE[id].access : "public";
}
```

The `access` values copy today's behaviour: `proxy.ts` gates every `/dashboard` path except `/dashboard/login` and
`/dashboard/login/submit`; the Google Ads pages marked `gads-session` check the visitor session themselves today and
keep doing so until plan 3 (only `agency` is enforced in `proxy.ts`).

- [ ] **Step 2: Write the tests**

```ts
import { describe, expect, it } from "vitest";
import { ROUTE_TABLE, accessFor, href, matchRoute, type RouteId } from "./route-table";

describe("route table", () => {
  it("holds the 30 addresses of the app, each once", () => {
    const paths = Object.values(ROUTE_TABLE).map((r) => r.path);
    expect(paths).toHaveLength(30);
    expect(new Set(paths).size).toBe(30);
  });

  it("builds a link with its parameters encoded", () => {
    expect(href("siteReport", { id: "3f2a9c1e" })).toBe("/r/3f2a9c1e");
    expect(href("gadsPortal", { token: "a b/c" })).toBe("/google-ads/portal/a%20b%2Fc");
    expect(href("home")).toBe("/");
  });

  it("refuses a link with a missing parameter", () => {
    expect(() => href("siteReport")).toThrow("missing parameter [id]");
  });

  it("matches a concrete path, the static segment first", () => {
    const cases: [string, RouteId | null][] = [
      ["/r/3f2a9c1e", "siteReport"], ["/r/preview", "siteReportPreview"], ["/r/3f2a9c1e/pdf", "siteReportPdf"],
      ["/dashboard", "dashboardHome"], ["/dashboard/google-ads/reports/9", "dashboardGadsReport"], ["/", "home"],
      ["/nu-exista", null], ["/r", null],
    ];
    for (const [path, id] of cases) expect(matchRoute(path), path).toBe(id);
  });

  it("gives the dashboard pages agency access, except login and its submit", () => {
    expect(accessFor("/dashboard")).toBe("agency");
    expect(accessFor("/dashboard/logout")).toBe("agency");
    expect(accessFor("/dashboard/login")).toBe("public");
    expect(accessFor("/dashboard/login/submit")).toBe("public");
    expect(accessFor("/r/abc")).toBe("public");
    expect(accessFor("/nu-exista")).toBe("public");
  });
});
```

- [ ] **Step 3: Run, then see each test fail with its defect put back**

```bash
npx vitest run shared/route-table.test.ts   # Expected: 5 passed
```
Negative controls, one at a time, each reverted after the run:
1. in `matchRoute`, replace `params < best.params` with `false` (the first match wins, and `siteReport` comes before `siteReportPreview` in the table) — Expected: "matches a concrete path" FAILS on `/r/preview`.
2. remove `encodeURIComponent(` … `)` → "builds a link" FAILS.
3. change `dashboardLogout` access to `"public"` → "gives the dashboard pages agency access" FAILS.

- [ ] **Step 4: Commit**

```bash
git add shared/route-table.ts shared/route-table.test.ts
git commit -m "Add the address table: the 30 addresses as data, with href, matchRoute and accessFor"
```

---

### Task 4: Host routing and dashboard access read the table

**Files:**
- Move: `lib/host-routing.ts` → `shared/host-routing.ts` (and its test, if any: `lib/host-routing.test.ts` → `shared/host-routing.test.ts`)
- Modify: `proxy.ts:2-13`
- Test: `shared/host-routing.test.ts` (equivalence test added)

**Interfaces:** Consumes `ROUTE_TABLE`, `matchRoute`, `accessFor` (Task 3). Produces `routeForHost` with the same
signature as today: `routeForHost(requestHost: string | null, path: string, search: string, env?: Env): HostDecision`.

- [ ] **Step 1: Move and change the site-host list**

```bash
git mv lib/host-routing.ts shared/host-routing.ts
[ -f lib/host-routing.test.ts ] && git mv lib/host-routing.test.ts shared/host-routing.test.ts
git grep -l "lib/host-routing" -- '*.ts' '*.tsx' | xargs sed -i '' 's#@/lib/host-routing#@/shared/host-routing#g; s#\./host-routing#@/shared/host-routing#g'
```

In `shared/host-routing.ts` replace the `SITE_AUDIT_PATHS` constant and its use:

```ts
import { ROUTE_TABLE, matchRoute } from "./route-table";

// Static files the site-host pages load; they are not addresses of the app, so they are not in the route table.
const STATIC_ASSETS = [/^\/_next\//, /^\/fonts\//, /^\/devrika-logo\.svg$/, /^\/logo-devrika\.png$/, /^\/favicon\.ico$/];

function servedOnSiteHost(path: string): boolean {
  if (STATIC_ASSETS.some((re) => re.test(path))) return true;
  const id = matchRoute(path);
  return id !== null && ROUTE_TABLE[id].onSiteHost;
}
```
and in `routeForHost`: `if (SITE_AUDIT_PATHS.some((re) => re.test(path)))` → `if (servedOnSiteHost(path))`.

Intended difference, stated in the commit: a path that is not an address of the app (for example `/dashboard/nu-exista`)
on audit.devrika.ro used to stay there and answer 404; it now redirects to audit.devrika.io and answers 404 there.

- [ ] **Step 2: Read dashboard access from the table in `proxy.ts`**

```ts
import { accessFor } from "@/shared/route-table";
```
Replace

```ts
  if (!request.nextUrl.pathname.startsWith("/dashboard")) return NextResponse.next();

  if (request.nextUrl.pathname === "/dashboard/login" || request.nextUrl.pathname === "/dashboard/login/submit") return NextResponse.next();
```
with

```ts
  if (accessFor(request.nextUrl.pathname) !== "agency") return NextResponse.next();
```
Intended difference: an unknown `/dashboard/…` path now answers 404 without asking for the login first.

- [ ] **Step 3: Add the equivalence test against today's behaviour**

Append to `shared/host-routing.test.ts` (create it with the imports if it did not exist):

```ts
import { describe, expect, it } from "vitest";
import { routeForHost } from "./host-routing";
import { ROUTE_TABLE } from "./route-table";

// Today's list, copied from lib/host-routing.ts at af360b9: the oracle the table-driven routing must match on every
// address of the app.
const LEGACY = [/^\/audituri(\/|$)/, /^\/audit-seo(\/|$)/, /^\/audit(\/|$)/, /^\/start(\/|$)/, /^\/processing\//, /^\/r\//,
  /^\/api\/scan(\/|$)/, /^\/api\/audit(\/|$)/, /^\/dashboard(\/|$)/,
  /^\/_next\//, /^\/fonts\//, /^\/devrika-logo\.svg$/, /^\/logo-devrika\.png$/, /^\/favicon\.ico$/];
const env = { SITE_AUDIT_ORIGIN: "https://audit.devrika.ro", PUBLIC_URL: "https://audit.devrika.io" };
function legacy(host: string, path: string, search: string) {
  if (host !== "audit.devrika.ro") return { kind: "next" };
  if (path === "/") return { kind: "rewrite", path: "/audituri" };
  if (LEGACY.some((re) => re.test(path))) return { kind: "next" };
  return { kind: "redirect", location: `https://audit.devrika.io${path}${search}` };
}

describe("host routing from the route table", () => {
  const concrete = Object.values(ROUTE_TABLE).map((r) => r.path.replace(/\[[^\]]+\]/g, "x1"));
  const assets = ["/_next/static/a.js", "/fonts/sora.woff2", "/devrika-logo.svg", "/logo-devrika.png", "/favicon.ico"];
  it("decides every address and asset exactly as before, on both hosts", () => {
    for (const host of ["audit.devrika.ro", "audit.devrika.io"]) {
      for (const path of [...concrete, ...assets]) {
        expect(routeForHost(host, path, "?a=1", env), `${host}${path}`).toEqual(legacy(host, path, "?a=1"));
      }
    }
  });
});
```

- [ ] **Step 4: Run, negative control, and the existing proxy and dashboard tests**

```bash
npx vitest run shared/ lib/dash-auth.test.ts lib/dashboard-login.test.ts
```
Expected: all pass. Negative control: set `siteReportPdf` `onSiteHost` to `false` → the equivalence test FAILS on
`audit.devrika.ro/r/x1/pdf`; revert.

- [ ] **Step 5: Commit**

```bash
git add shared/host-routing.ts shared/host-routing.test.ts proxy.ts $(git grep -l "@/shared/host-routing" -- '*.ts' '*.tsx')
git commit -m "Read the site-host addresses and the dashboard access from the route table

Every address and asset is routed as before on both hosts (equivalence test against the old list).
Intended: an unknown path on audit.devrika.ro now redirects to audit.devrika.io before its 404, and an unknown
/dashboard path answers 404 without the login."
```

---

### Task 5: Shared storage

**Files:**
- Create: `shared/storage/json-file.ts`
- Test: `shared/storage/json-file.test.ts`

**Interfaces:** Produces (adopted by the stores in plans 2–4):
```ts
export class StorageCorruptError extends Error { readonly file: string }
export async function readJson<T>(file: string, empty: T): Promise<T>;
export async function writeJsonAtomic(file: string, value: unknown, mode?: number): Promise<void>;
export async function withFileLock<T>(file: string, operation: () => Promise<T>, options?: { timeoutMs?: number; staleMs?: number }): Promise<T>;
export function jsonStore<T>(file: string, empty: () => T): {
  read(): Promise<T>;
  update<R>(change: (current: T) => { next: T; result: R }): Promise<R>;
};
```

- [ ] **Step 1: Write the module**

```ts
// One way to read and write the app's JSON files (spec 2026-10-05 §6), with the strongest guarantees any store had:
// a write lands whole or not at all, writers in one process are serialized, writers in two processes take a lock, and
// a file that is not valid JSON stops the write instead of being read as empty and overwritten.
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export class StorageCorruptError extends Error {
  constructor(readonly file: string, cause: unknown) {
    super(`Stored file is not valid JSON: ${file}`, { cause });
  }
}

const code = (error: unknown) => (error as NodeJS.ErrnoException).code;

export async function readJson<T>(file: string, empty: T): Promise<T> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if (code(error) === "ENOENT") return empty;
    throw error;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new StorageCorruptError(file, error);
  }
}

export async function writeJsonAtomic(file: string, value: unknown, mode = 0o600): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await fs.open(temporary, "wx", mode);
  try {
    await handle.writeFile(JSON.stringify(value, null, 2), "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(temporary, file);
}

export async function withFileLock<T>(
  file: string,
  operation: () => Promise<T>,
  { timeoutMs = 5_000, staleMs = 30_000 }: { timeoutMs?: number; staleMs?: number } = {},
): Promise<T> {
  const lock = `${file}.lock`;
  await fs.mkdir(path.dirname(file), { recursive: true });
  const deadline = Date.now() + timeoutMs;
  while (true) {
    try {
      await fs.mkdir(lock, { mode: 0o700 });
      break;
    } catch (error) {
      if (code(error) !== "EEXIST") throw error;
      let stats;
      try {
        stats = await fs.stat(lock);
      } catch (inspection) {
        if (code(inspection) === "ENOENT") continue;
        throw inspection;
      }
      if (Date.now() - stats.mtimeMs > staleMs) {
        await fs.rm(lock, { recursive: true, force: true });
        continue;
      }
      if (Date.now() >= deadline) throw new Error(`Timed out acquiring the storage lock for ${file}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  try {
    return await operation();
  } finally {
    await fs.rm(lock, { recursive: true, force: true });
  }
}

export function jsonStore<T>(file: string, empty: () => T) {
  let chain: Promise<unknown> = Promise.resolve();
  return {
    read: () => readJson(file, empty()),
    update<R>(change: (current: T) => { next: T; result: R }): Promise<R> {
      const run = () => withFileLock(file, async () => {
        const { next, result } = change(await readJson(file, empty()));
        await writeJsonAtomic(file, next);
        return result;
      });
      const done = chain.then(run, run);
      chain = done.catch(() => undefined);
      return done;
    },
  };
}
```

- [ ] **Step 2: Write the tests**

```ts
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { StorageCorruptError, jsonStore, readJson, withFileLock, writeJsonAtomic } from "./json-file";

let dir: string;
beforeEach(async () => { dir = await fs.mkdtemp(path.join(os.tmpdir(), "json-file-")); });

describe("json-file storage", () => {
  it("reads a missing file as the empty value", async () => {
    expect(await readJson(path.join(dir, "none.json"), [])).toEqual([]);
  });

  it("refuses a file that is not valid JSON instead of reading it as empty", async () => {
    const file = path.join(dir, "audits.json");
    await fs.writeFile(file, "[{\"id\":");
    await expect(readJson(file, [])).rejects.toBeInstanceOf(StorageCorruptError);
    const store = jsonStore<string[]>(file, () => []);
    await expect(store.update((list) => ({ next: [...list, "x"], result: null }))).rejects.toBeInstanceOf(StorageCorruptError);
    expect(await fs.readFile(file, "utf8")).toBe("[{\"id\":");
  });

  it("writes indented JSON readable only by its owner and leaves no temporary file", async () => {
    const file = path.join(dir, "sub", "a.json");
    await writeJsonAtomic(file, { a: 1 });
    expect(await fs.readFile(file, "utf8")).toBe("{\n  \"a\": 1\n}");
    expect((await fs.stat(file)).mode & 0o777).toBe(0o600);
    expect(await fs.readdir(path.dirname(file))).toEqual(["a.json"]);
  });

  it("keeps every one of 50 concurrent updates", async () => {
    const store = jsonStore<number[]>(path.join(dir, "n.json"), () => []);
    await Promise.all(Array.from({ length: 50 }, (_, i) => store.update((list) => ({ next: [...list, i], result: null }))));
    expect((await store.read()).sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i));
  });

  it("takes over a lock left by a dead writer", async () => {
    const file = path.join(dir, "s.json");
    await fs.mkdir(`${file}.lock`);
    const old = new Date(Date.now() - 60_000);
    await fs.utimes(`${file}.lock`, old, old);
    expect(await withFileLock(file, async () => "ran")).toBe("ran");
  });

  it("gives up on a live lock after the timeout", async () => {
    const file = path.join(dir, "t.json");
    await fs.mkdir(`${file}.lock`);
    await expect(withFileLock(file, async () => "ran", { timeoutMs: 50 })).rejects.toThrow("Timed out");
  });
});
```

- [ ] **Step 3: Run and negative controls**

```bash
npx vitest run shared/storage/   # Expected: 6 passed
```
One at a time, reverted after each run:
1. in `readJson`, replace `throw new StorageCorruptError(file, error);` with `return empty;` → "refuses a file that is not valid JSON" FAILS.
2. in `jsonStore.update`, replace `chain.then(run, run)` with `run()` and remove the lock (call the body directly) → "keeps every one of 50 concurrent updates" FAILS.
3. in `withFileLock`, remove the stale branch → "takes over a lock left by a dead writer" FAILS (timeout).

- [ ] **Step 4: Commit**

```bash
git add shared/storage/json-file.ts shared/storage/json-file.test.ts
git commit -m "Add the shared JSON storage: atomic writes, serialized and locked updates, a corrupt file refused

A corrupt audits.json is read as empty today and the next save overwrites every stored audit; the shared
storage refuses it instead. The stores adopt it when their module moves (plans 2-4)."
```

---

### Task 6: The structure tests

**Files:**
- Create: `tests/structure/rules.ts`
- Test: `tests/structure/structure.test.ts`

**Interfaces:** Consumes `ROUTE_TABLE`, `matchRoute` (Task 3). Produces:
```ts
export type Imported = { spec: string; target: string; typeOnly: boolean };   // target: repo-relative path or bare package
export type Place = { kind: "app" | "routes" | "shared" | "module" | "other"; module?: string;
  layer?: "model" | "data" | "controller" | "view" | "index" | "other" };
export function placeOf(file: string): Place;
export function importsOf(file: string, source: string): Imported[];
export function checkFile(file: string, source: string, bound: Set<string>): string[];   // violations, empty when clean
export function boundRouteIds(routesSource: string | null): Set<string>;
```

- [ ] **Step 1: Write the rules**

```ts
// The structure rules of spec 2026-10-05 §3 as pure functions over a file and its imports.
import path from "node:path";
import ts from "typescript";
import { ROUTE_TABLE, matchRoute } from "../../shared/route-table";

export type Imported = { spec: string; target: string; typeOnly: boolean };
export type Place = { kind: "app" | "routes" | "shared" | "module" | "other"; module?: string;
  layer?: "model" | "data" | "controller" | "view" | "index" | "other" };

export function placeOf(file: string): Place {
  const p = file.split(path.sep).join("/");
  if (p === "routes.ts") return { kind: "routes" };
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
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) add(node.moduleSpecifier.text, !!node.importClause?.isTypeOnly);
    else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) add(node.moduleSpecifier.text, node.isTypeOnly);
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) add(node.arguments[0].text, false);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

const PURE_SHARED = ["shared/copy", "shared/theme", "shared/route-table"];
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
      if (m && m[1] !== where.module && m[2] && m[2] !== "/index" && m[2] !== "/index.ts") say(4, `imports ${i.spec} past the index of ${m[1]}`);
    }
  }
  // Rule 5: shared depends on no module and not on routes.ts.
  if (where.kind === "shared") for (const i of imports) if (i.target.startsWith("modules/") || i.target === "routes") say(5, `imports ${i.spec}`);
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
  if (id && bound.has(id)) {
    for (const i of imports) if (!i.typeOnly && i.target !== "routes" && i.target !== "next" && !i.target.startsWith("next/")) say(1, `imports ${i.spec}`);
  }
  // Rule 7: no hand-written address in a module or a bound address file.
  if (where.kind === "module" || (id && bound.has(id))) for (const h of handWrittenPaths(source)) say(7, `writes the address ${h} by hand`);
  return v;
}
```

- [ ] **Step 2: Write the tests — fixtures for each rule, then the whole repository**

```ts
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
```

- [ ] **Step 3: Run and negative controls on the real tree**

```bash
npx vitest run tests/structure/   # Expected: all pass
```
One at a time, each reverted after the run:
1. `mkdir -p modules/site-audit/model && printf 'import { promises } from "node:fs";\nexport const x = promises;\n' > modules/site-audit/model/breach.ts` → "rules 1-5 and 7 hold" FAILS with `rule 3`; `rm -r modules`.
2. `printf 'import { x } from "@/modules/a";\nexport const y = x;\n' > shared/breach.ts` → FAILS with `rule 5`; `rm shared/breach.ts`.
3. remove the `hub` entry from `ROUTE_TABLE` → "rule 6" FAILS ("address files with no entry"); revert.
4. add `ghost: route("/ghost", "public", "public", false)` → "rule 6" FAILS ("entries with no file"); revert.

- [ ] **Step 4: Commit**

```bash
git add tests/structure/rules.ts tests/structure/structure.test.ts
git commit -m "Enforce the structure rules with tests: layers, module doors, shared, the address table, hand-written links

Seen failing: a model file importing node:fs (rule 3), shared importing a module (rule 5), an address file
missing from the table and a table entry with no file (rule 6)."
```

---

### Task 7: Plan 1 closes green

- [ ] **Step 1: The whole candidate**

```bash
npx tsc --noEmit -p . && echo TSC_OK
npm run lint
npm test                      # Expected: all pass; the count is 818 plus the tests added in Tasks 3-6
npx next build >/tmp/build.txt 2>&1 && echo BUILD_OK
```

- [ ] **Step 2: Push the branch**

```bash
git push origin rewrite/mvc-modules
```

Nothing is deployed: the branch is published once, after plan 4.
