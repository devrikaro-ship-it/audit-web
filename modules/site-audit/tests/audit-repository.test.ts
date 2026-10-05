import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuditData } from "@/modules/site-audit/model/types";

async function repositoryOn(file: string) {
  vi.resetModules();
  vi.stubEnv("LEADS_FILE", file);
  globalThis.__leadsCache = undefined;
  return import("@/modules/site-audit/model/data/audit-repository");
}
const audit = (id: string) => ({ id, url: "https://x.ro", domain: "x.ro", scor: 50, createdAt: Date.now(), data: {} as AuditData });

afterEach(() => { vi.unstubAllEnvs(); globalThis.__leadsCache = undefined; });

describe("audit repository", () => {
  it("keeps every audit when two are saved at once", async () => {
    const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "audits-")), "audits.json");
    const repo = await repositoryOn(file);
    await Promise.all([repo.saveAudit(audit("a")), repo.saveAudit(audit("b"))]);
    expect(JSON.parse(await fs.readFile(file, "utf8")).map((a: { id: string }) => a.id).sort()).toEqual(["a", "b"]);
  });

  it("refuses to save over a corrupt file instead of replacing every stored audit", async () => {
    const file = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "audits-")), "audits.json");
    await fs.writeFile(file, "[{\"id\":\"old\",");
    const repo = await repositoryOn(file);
    await expect(repo.saveAudit(audit("new"))).rejects.toThrow("not valid JSON");
    expect(await fs.readFile(file, "utf8")).toBe("[{\"id\":\"old\",");
  });
});
