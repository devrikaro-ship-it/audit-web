#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [realAppRoot, skillRoot] = process.argv.slice(2);
if (!realAppRoot || !skillRoot) throw new Error("Usage: test_public_google_ads_reads_gate.mjs <app-root> <skill-root>");
const gate = path.join(skillRoot, "scripts/check_public_google_ads_reads.mjs");
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gads-read-gate-"));
fs.mkdirSync(path.join(fixtureRoot, "app/google-ads"), { recursive: true });
fs.mkdirSync(path.join(fixtureRoot, "lib"), { recursive: true });
fs.symlinkSync(path.join(realAppRoot, "node_modules"), path.join(fixtureRoot, "node_modules"), "dir");
fs.writeFileSync(path.join(fixtureRoot, "package.json"), JSON.stringify({ private: true }));
fs.writeFileSync(path.join(fixtureRoot, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", moduleResolution: "Bundler", module: "ESNext", baseUrl: ".", paths: { "@/*": ["./*"] } } }));
fs.writeFileSync(path.join(fixtureRoot, "lib/net.ts"), `export function googleAdsSearch(_customerId: string, _query: string) { return Promise.resolve([]); }\n`);
fs.writeFileSync(path.join(fixtureRoot, "lib/gads-source.ts"), `import { googleAdsSearch } from "./net";\nexport function fetchKnown() { return googleAdsSearch("1", "SELECT customer.id FROM customer"); }\n`);
fs.writeFileSync(path.join(fixtureRoot, "lib/gads-other.ts"), `import { googleAdsSearch } from "./net";\nexport function fetchOther() { return googleAdsSearch("1", "SELECT customer.time_zone FROM customer"); }\n`);
fs.writeFileSync(path.join(fixtureRoot, "lib/gads-read-disclosure.ts"), `
export const googleAdsReadRegistry = {
  fetchKnown: { module: "@/lib/gads-source", operation: "fetchKnown", readCategories: ["account"] },
} as const;
export function runGoogleAdsRead<T>(id: keyof typeof googleAdsReadRegistry, operation: () => T): T {
  void googleAdsReadRegistry[id];
  return operation();
}
`);

const cases = {
  valid: {
    pass: true,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { return runGoogleAdsRead("fetchKnown", () => fetchKnown()); }`,
  },
  mixedConditionalSibling: {
    pass: false,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; function mixed(flag: boolean) { const valid = runGoogleAdsRead("fetchKnown", () => fetchKnown()); if (flag) return fetchKnown(); return valid; } export default function Page() { return mixed(false); }`,
  },
  nestedEarlyReturn: {
    pass: false,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; function mixed(stop: boolean) { const nested = () => fetchKnown(); if (stop) return nested(); return runGoogleAdsRead("fetchKnown", () => fetchKnown()); } export default function Page() { return mixed(false); }`,
  },
  localGovernorLookalike: {
    pass: false,
    source: `import { fetchKnown } from "@/lib/gads-source"; function runGoogleAdsRead<T>(_id: string, operation: () => T) { return operation(); } export default function Page() { return runGoogleAdsRead("fetchKnown", () => fetchKnown()); }`,
  },
  importedAliasMismatchedOwner: {
    pass: false,
    helper: `import { runGoogleAdsRead as govern } from "./gads-read-disclosure"; import { fetchOther } from "./gads-other"; export function importedHelper() { return govern("fetchKnown", () => fetchOther()); }`,
    source: `import { importedHelper } from "@/lib/imported-helper"; export default function Page() { return importedHelper(); }`,
  },
  wrongAndUnusedId: {
    pass: false,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead as govern } from "@/lib/gads-read-disclosure"; export default function Page() { return govern("missing" as never, () => fetchKnown()); }`,
  },
  reexportAliasValid: {
    pass: true,
    reexport: `export { runGoogleAdsRead as govern } from "./gads-read-disclosure";`,
    helper: `import { govern } from "./governor-reexport"; import { fetchKnown } from "./gads-source"; export function importedHelper() { return govern("fetchKnown", () => fetchKnown()); }`,
    source: `import { importedHelper } from "@/lib/imported-helper"; export default function Page() { return importedHelper(); }`,
  },
  reexportAliasMismatchedOwner: {
    pass: false,
    reexport: `export { runGoogleAdsRead as govern } from "./gads-read-disclosure";`,
    helper: `import { govern } from "./governor-reexport"; import { fetchOther } from "./gads-other"; export function importedHelper() { return govern("fetchKnown", () => fetchOther()); }`,
    source: `import { importedHelper } from "@/lib/imported-helper"; export default function Page() { return importedHelper(); }`,
  },
  objectPropertyAliasUngoverned: {
    pass: false,
    failureIncludes: "reachable Google Ads read is unregistered",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = { undisclosed: fetchKnown }; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return operations.undisclosed(); }`,
  },
  shorthandAliasUngoverned: {
    pass: false,
    failureIncludes: "reachable Google Ads read is unregistered",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = { fetchKnown }; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return operations.fetchKnown(); }`,
  },
  computedElementAliasUngoverned: {
    pass: false,
    failureIncludes: "reachable Google Ads read is unregistered",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const key = "known"; const operations = { [key]: fetchKnown }; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return operations[key](); }`,
  },
  destructuredAliasUngoverned: {
    pass: false,
    failureIncludes: "reachable Google Ads read is unregistered",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = { undisclosed: fetchKnown }; const { undisclosed } = operations; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return undisclosed(); }`,
  },
  objectPropertyAliasGoverned: {
    pass: true,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = { known: fetchKnown }; return runGoogleAdsRead("fetchKnown", () => operations.known()); }`,
  },
  computedElementAliasGoverned: {
    pass: true,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const key = "known"; const operations = { [key]: fetchKnown }; return runGoogleAdsRead("fetchKnown", () => operations[key]()); }`,
  },
  destructuredAliasGoverned: {
    pass: true,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = { known: fetchKnown }; const { known } = operations; return runGoogleAdsRead("fetchKnown", () => known()); }`,
  },
  unresolvedContainerCallable: {
    pass: false,
    failureIncludes: "reachable local callable value cannot be resolved",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page({ key }: { key: string }) { const operations = { known: fetchKnown }; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return operations[key as keyof typeof operations](); }`,
  },
  localContainerAliasUngoverned: {
    pass: false,
    failureIncludes: "reachable Google Ads read is unregistered",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = { known: fetchKnown }; const alias = operations; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return alias.known(); }`,
  },
  localContainerAliasGoverned: {
    pass: true,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = { known: fetchKnown }; const alias = operations; return runGoogleAdsRead("fetchKnown", () => alias.known()); }`,
  },
  tupleElementUngoverned: {
    pass: false,
    failureIncludes: "reachable Google Ads read is unregistered",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown] as const; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return operations[0](); }`,
  },
  tupleElementGoverned: {
    pass: true,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown] as const; return runGoogleAdsRead("fetchKnown", () => operations[0]()); }`,
  },
  aliasedTupleUngoverned: {
    pass: false,
    failureIncludes: "reachable Google Ads read is unregistered",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown] as const; const alias = operations; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return alias[0](); }`,
  },
  aliasedTupleGoverned: {
    pass: true,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown] as const; const alias = operations; return runGoogleAdsRead("fetchKnown", () => alias[0]()); }`,
  },
  arrayDestructuringUngoverned: {
    pass: false,
    failureIncludes: "reachable Google Ads read is unregistered",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown] as const; const [known] = operations; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return known(); }`,
  },
  arrayDestructuringGoverned: {
    pass: true,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown] as const; const [known] = operations; return runGoogleAdsRead("fetchKnown", () => known()); }`,
  },
  dynamicTupleIndex: {
    pass: false,
    failureIncludes: "reachable local callable value cannot be resolved",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page({ index }: { index: number }) { const operations = [fetchKnown] as const; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return operations[index](); }`,
  },
  atZeroUngoverned: {
    pass: false,
    failureIncludes: "reachable Google Ads read is unregistered",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown] as const; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return operations.at(0)!(); }`,
  },
  atZeroGoverned: {
    pass: true,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown] as const; return runGoogleAdsRead("fetchKnown", () => operations.at(0)!()); }`,
  },
  atNegativeUngoverned: {
    pass: false,
    failureIncludes: "reachable Google Ads read is unregistered",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown] as const; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return operations.at(-1)!(); }`,
  },
  atNegativeGoverned: {
    pass: true,
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown] as const; return runGoogleAdsRead("fetchKnown", () => operations.at(-1)!()); }`,
  },
  atDynamicIndex: {
    pass: false,
    failureIncludes: "reachable local callable selector cannot be resolved",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page({ index }: { index: number }) { const operations = [fetchKnown] as const; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return operations.at(index)!(); }`,
  },
  unprovenArraySelectorResult: {
    pass: false,
    failureIncludes: "reachable local callable selector cannot be resolved",
    source: `import { fetchKnown } from "@/lib/gads-source"; import { runGoogleAdsRead } from "@/lib/gads-read-disclosure"; export default function Page() { const operations = [fetchKnown]; runGoogleAdsRead("fetchKnown", () => fetchKnown()); return operations.find(() => true)!(); }`,
  },
};

try {
  for (const [name, testCase] of Object.entries(cases)) {
    const helperPath = path.join(fixtureRoot, "lib/imported-helper.ts");
    const reexportPath = path.join(fixtureRoot, "lib/governor-reexport.ts");
    if (testCase.helper) fs.writeFileSync(helperPath, testCase.helper); else fs.rmSync(helperPath, { force: true });
    if (testCase.reexport) fs.writeFileSync(reexportPath, testCase.reexport); else fs.rmSync(reexportPath, { force: true });
    fs.writeFileSync(path.join(fixtureRoot, "app/google-ads/page.ts"), testCase.source);
    const result = spawnSync(process.execPath, [gate, fixtureRoot], { encoding: "utf8" });
    if ((result.status === 0) !== testCase.pass) {
      throw new Error(`${name} produced unexpected gate result:\n${result.stdout}\n${result.stderr}`);
    }
    if (testCase.failureIncludes && !result.stdout.includes(testCase.failureIncludes)) {
      throw new Error(`${name} did not fail for the expected reason:\n${result.stdout}\n${result.stderr}`);
    }
  }
  console.log(`PASS: ${Object.keys(cases).length} per-call governance fixtures`);
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
