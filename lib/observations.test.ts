import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { appendObservation, readObservations, summarizeByPlatform, type Observation } from "./observations";

const obs = (platform: string, extra: Partial<Observation> = {}): Observation => ({
  at: 1, domain: "s.ro", platform, sitemap: "", urls: { product: 10, category: 5, other: 1 }, fetched: 60, ok: 60, refused: 0,
  usedBrowser: false, blocked: false, products: 35, categories: 15, failedChecks: [], durationMs: 1000, ...extra,
});

describe("observations", () => {
  it("appends one line per audit and reads them back", async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "obs-")), "observations.jsonl");
    await appendObservation(obs("Shopify"), file);
    await appendObservation(obs("GoMag"), file);
    expect((await readObservations(file)).map((o) => o.platform)).toEqual(["Shopify", "GoMag"]);
  });

  it("summarizes per platform and keeps blocked domains out of the averages", () => {
    const s = summarizeByPlatform([
      obs("MerchantPro", { ok: 60, products: 40, usedBrowser: true, failedChecks: ["schema_rating"] }),
      obs("MerchantPro", { ok: 0, products: 0, blocked: true }),
      obs("Shopify", { failedChecks: ["schema_rating", "lcp"] }),
    ]);
    expect(s[0]).toEqual({ platform: "MerchantPro", audits: 2, avgPages: 60, avgProducts: 40, browserPct: 50, blockedPct: 50, topFailed: ["schema_rating"] });
    expect(s[1].platform).toBe("Shopify");
  });
});
