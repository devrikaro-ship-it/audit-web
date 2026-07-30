// Rulare LIVE a raportului de migrare pe un domeniu real, prin motorul de audit existent.
// Nu e un test de regresie: atinge reteaua (crawl ~50 pagini + PageSpeed + BrightData),
// deci e SARIT implicit. Pornire:
//
//   LIVE_AUDIT=1 SITE=robinetulmeu.ro npx vitest run lib/migrare-live.test.ts --testTimeout=600000
//
// Optional, cifrele de business (altfel raportul da doar procente, fara sume):
//   CONV=1.2 AOV=450 VISITS=20000

import { describe, it, expect } from "vitest";
import { runAudit } from "./audit-engine";
import { collectPlatformEvidence } from "./platform-audit";
import { buildShopifyCase } from "./shopify-case";
import { detectCurrency } from "./site-signals";
import { fetchPage } from "./net";

const num = (v: string | undefined): number | null =>
  v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v);

describe.skipIf(!process.env.LIVE_AUDIT)("migrare — rulare live", () => {
  it("ruleaza auditul complet + cazul de migrare", { timeout: 600000 }, async () => {
    const site = process.env.SITE ?? "robinetulmeu.ro";
    const url = site.startsWith("http") ? site : `https://${site}`;

    console.log(`\n=== AUDIT COMPLET (motorul existent) pe ${url} ===`);
    const t0 = Date.now();
    const audit = await runAudit(url);
    console.log(`Pagini analizate: ${audit.pagesAnalyzed} | Scor global: ${audit.scor}/100 | ${Math.round((Date.now() - t0) / 1000)}s`);
    if (audit.avertisment) console.log(`Avertisment: ${audit.avertisment}`);
    if (audit.ux) {
      console.log(`UX/UI: ${audit.ux.scor}/100`);
      for (const f of audit.ux.fields) console.log(`   - ${f.label}: ${f.status} (${f.scor})`);
    }
    if (audit.conversie) console.log(`Tracking/PPC: ${audit.conversie.scorPpc}/100 | ruleaza reclame: ${audit.conversie.ruleazaReclame}`);
    if (audit.googleAds) console.log(`Google Ads / CSS: ${JSON.stringify(audit.googleAds).slice(0, 300)}`);

    console.log(`\n=== AMPRENTA DE PLATFORMA ===`);
    const home = await fetchPage(url);
    const ev = await collectPlatformEvidence(url, home.html);
    console.log(`Platforma: ${ev.stack.platform} | CMS: ${ev.stack.cms?.name} ${ev.stack.cms?.version ?? ""} | Magazin: ${ev.stack.ecomEngine?.name} ${ev.stack.ecomEngine?.version ?? ""}`);
    console.log(`Extensii vizibile: ${ev.stack.pluginCount} (${ev.stack.plugins.join(", ")})`);
    console.log(`Scripturi: ${ev.stack.scriptCount} | Greutate: ${ev.lab?.weightKb} KB | Scor perf mobil: ${ev.lab?.perfScore}`);
    console.log(`CrUX (useri reali): TTFB ${ev.field?.ttfbMs} ms | LCP ${ev.field?.lcpMs} ms | INP ${ev.field?.inpMs} ms | ${ev.field?.overall}`);
    console.log(`Plati detectate: ${ev.checkout.paymentsSeen.join(", ") || "—"} | Wallets: ${ev.checkout.walletsSeen.join(", ") || "neconfirmate"}`);
    console.log(`Candidat de migrare: ${ev.migrationCandidate}`);
    for (const f of ev.findings) {
      console.log(`   [${f.verdict.toUpperCase()}]${f.structural ? " [PLATFORMA]" : ""} ${f.label}: ${f.measured}`);
    }

    console.log(`\n=== CAZUL SHOPIFY ===`);
    const currency = detectCurrency(home.html, url) ?? "RON";
    const shopCase = buildShopifyCase(audit, ev, {
      convRatePct: num(process.env.CONV),
      aov: num(process.env.AOV) ?? 0,
      monthlyVisits: num(process.env.VISITS),
      currency,
    });
    console.log(`Verdict: ${shopCase.verdict.toUpperCase()} — ${shopCase.verdictReason}`);
    console.log(`Conversie acum: ${shopCase.convNowPct}% | Crestere estimata: +${shopCase.totalUpliftPct}%`);
    console.log(`\nLeviere:`);
    for (const l of shopCase.levers) {
      console.log(`   [${l.confidence}] ${l.label}: +${(l.upliftPct * 100).toFixed(1)}%`);
      console.log(`      dovada: ${l.evidence}`);
      console.log(`      pe Shopify: ${l.mechanism}`);
      if (l.source) console.log(`      sursa: ${l.source}`);
    }
    console.log(`\nScenarii:`);
    for (const s of shopCase.scenarios) {
      console.log(`   ${s.label}: conversie ${s.convPct}% | +${s.extraMonth} ${currency}/luna | +${s.extraYear} ${currency}/an`);
    }
    console.log(`\nCost: acum ${shopCase.tco.currentMonth} vs Shopify ${shopCase.tco.shopifyMonth} ${currency}/luna (diferenta ${shopCase.tco.deltaMonth}) | migrare ${shopCase.tco.migrationOneOff} | payback: ${shopCase.tco.paybackMonths ?? "n/a"} luni`);
    console.log(`\nCe pierde:`);
    for (const t of shopCase.tradeoffs) console.log(`   - ${t}`);

    expect(audit.pagesAnalyzed).toBeGreaterThan(0);
    expect(shopCase.scenarios).toHaveLength(3);
  });
});
