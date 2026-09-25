import { describe, expect, it } from "vitest";
import { buildRows, dashboardKpis, DEFAULT_STATUS } from "./dashboard-rows";
import type { StoredAudit } from "./leads-store";
import type { ManagerAccount } from "./gads-manager";

const audit = (id: string, createdAt: number, extra: Partial<StoredAudit> = {}): StoredAudit =>
  ({ id, url: `https://${id}.ro`, domain: `${id}.ro`, scor: 72, createdAt, data: {} as StoredAudit["data"], ...extra });
const account = (id: string, generatedAt: string): ManagerAccount => ({
  id, customerId: "123", name: `Shop ${id}`, website: `${id}.ro`, contact: { name: "Ana", email: "ana@x.ro", phone: "0700" },
  reporting: "Active", reportCount: 2, available: true, generatedAt, period: null, currency: "RON", roas: 3.2, minimumRoas: 2.5, cpa: null, maximumCpa: null,
});

describe("buildRows", () => {
  const audits = [audit("a", 3000, { nume: "Ion", email: "i@a.ro", probleme: ["Nu apar organic in Google"] }), audit("b", 1000)];
  const accounts = [account("acc1", new Date(2000).toISOString())];

  it("puts website audits and Google Ads reports in one list, newest first", () => {
    expect(buildRows(audits, accounts, {}).map((r) => r.key)).toEqual(["site:a", "gads:acc1", "site:b"]);
  });

  it("fills the CRM-style fields: prospect, channel, contact, score, concern and report link", () => {
    const [a] = buildRows(audits, [], {});
    expect(a).toMatchObject({ tip: "Prospect", status: DEFAULT_STATUS, canal: "Audit site", site: "a.ro", nume: "Ion", email: "i@a.ro" });
    expect(a.observatii).toEqual({ rezultat: "Scor 72/100", preocupare: "Nu apar organic in Google", raport: "/r/a" });
    const [g] = buildRows([], accounts, {});
    expect(g).toMatchObject({ canal: "Audit Google Ads", site: "acc1.ro", telefon: "0700" });
    expect(g.observatii.rezultat).toBe("ROAS 3.20x (minim 2.50x) · 2 rapoarte");
    expect(g.observatii.raport).toBe("/dashboard/google-ads/reports/acc1");
  });

  it("shows the kind of site and who decided it", () => {
    const withKind = (by: "scan" | "visitor") => audit("k", 1, { data: { siteKind: { type: "leads", by, confidence: "high", evidence: null } } as StoredAudit["data"] });
    expect(buildRows([withKind("scan")], [], {})[0].observatii.rezultat).toBe("Scor 72/100 · Site de servicii, dedus din site");
    expect(buildRows([withKind("visitor")], [], {})[0].observatii.rezultat).toBe("Scor 72/100 · Site de servicii, ales de vizitator");
  });

  it("marks a website audit left without contact", () => {
    const [b] = buildRows([audit("b", 1)], [], {});
    expect(b.observatii.preocupare).toBe("Nu a lasat date de contact");
  });

  it("uses the saved status and falls back to the first stage for unknown values", () => {
    const rows = buildRows(audits, [], { "site:a": "Oferta trimisa", "site:b": "made up" });
    expect(rows.map((r) => r.status)).toEqual(["Oferta trimisa", DEFAULT_STATUS]);
  });

  it("filters by channel", () => {
    expect(buildRows(audits, accounts, {}, "site").every((r) => r.canal === "Audit site")).toBe(true);
    expect(buildRows(audits, accounts, {}, "gads").map((r) => r.key)).toEqual(["gads:acc1"]);
  });
});

describe("dashboardKpis", () => {
  it("counts totals, reachable leads, last 7 days and reachable leads still to contact", () => {
    const day = 24 * 3600 * 1000, now = 100 * day;
    const rows = buildRows([audit("new", now - day, { email: "x@y.ro" }), audit("old", now - 30 * day)], [], { "site:new": "De contactat" });
    expect(dashboardKpis(rows, now).map((k) => k.n)).toEqual([2, 1, 1, 1]);
  });
});
