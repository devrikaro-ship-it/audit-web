// Raportul de migrare (WooCommerce -> Shopify). Spec: docs/MIGRARE-SPEC.md.
// Paleta + fonturile vin din lib/theme.ts (sursa unica) — nu hardcoda hex aici.
//
// Ordinea sectiunilor e deliberata: intai DOVEZILE masurate la ei, abia apoi cifra de
// castig. Un raport care deschide cu "castigi 100.000 lei" citeste ca reclama; unul care
// deschide cu "serverul tau raspunde in 1503 ms" citeste ca diagnostic.

import { C, sora, inter } from "@/lib/theme";
import type { PlatformEvidence, PlatformFinding, EvidenceVerdict } from "@/lib/platform-audit";
import type { ShopifyCase, Lever, Scenario } from "@/lib/shopify-case";
import { symOf } from "@/lib/currency";

const VERDICT_STYLE: Record<EvidenceVerdict, { bg: string; fg: string; label: string }> = {
  ok: { bg: C.greenBg, fg: C.green, label: "OK" },
  atentie: { bg: C.yellowBg, fg: C.yellow, label: "DE REGLAT" },
  critic: { bg: C.redBg, fg: C.red, label: "SLAB" },
  necunoscut: { bg: C.slate, fg: C.gray600, label: "DE VERIFICAT" },
};

const CONFIDENCE_LABEL: Record<Lever["confidence"], string> = {
  masurat: "masurat pe site-ul tau",
  partial: "partial confirmat",
  neconfirmat: "ramane de confirmat",
};

const fmt = (n: number) => n.toLocaleString("ro-RO");

function Section({ title, intro, children }: { title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 44 }}>
      <h2 style={{ fontFamily: sora, fontSize: 22, fontWeight: 800, color: C.gray800, margin: "0 0 6px" }}>{title}</h2>
      {intro && <p style={{ fontFamily: inter, fontSize: 14.5, color: C.gray600, margin: "0 0 18px", lineHeight: 1.6 }}>{intro}</p>}
      {children}
    </section>
  );
}

function FindingRow({ f }: { f: PlatformFinding }) {
  const v = VERDICT_STYLE[f.verdict];
  return (
    <div style={{
      display: "flex", gap: 16, alignItems: "flex-start", padding: "18px 20px",
      border: `1px solid ${C.border}`, borderRadius: 14, background: C.white, marginBottom: 12,
    }}>
      <span style={{
        flexShrink: 0, fontFamily: sora, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4,
        color: v.fg, background: v.bg, padding: "6px 10px", borderRadius: 999, whiteSpace: "nowrap",
      }}>{v.label}</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
          <h3 style={{ fontFamily: sora, fontSize: 15.5, fontWeight: 700, color: C.gray800, margin: 0 }}>{f.label}</h3>
          {/* Marcajul care tine raportul onest: ce dispare prin mutare vs ce se repara pe loc. */}
          {f.structural && (
            <span style={{ fontFamily: inter, fontSize: 11, fontWeight: 700, color: C.indigo, background: "#EEF0FF", padding: "3px 8px", borderRadius: 999 }}>
              tine de platforma
            </span>
          )}
        </div>
        <p style={{ fontFamily: inter, fontSize: 14, color: C.gray800, margin: "6px 0 4px", fontWeight: 600 }}>{f.measured}</p>
        <p style={{ fontFamily: inter, fontSize: 13.5, color: C.gray600, margin: 0, lineHeight: 1.6 }}>{f.detail}</p>
      </div>
    </div>
  );
}

function LeverCard({ l }: { l: Lever }) {
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 14, background: C.white, padding: 20, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <h3 style={{ fontFamily: sora, fontSize: 15.5, fontWeight: 700, color: C.gray800, margin: 0 }}>{l.label}</h3>
        <span style={{ fontFamily: sora, fontSize: 17, fontWeight: 800, color: C.cyan, whiteSpace: "nowrap" }}>
          +{(l.upliftPct * 100).toFixed(1)}%
        </span>
      </div>
      <p style={{ fontFamily: inter, fontSize: 13.5, color: C.gray800, margin: "10px 0 0", lineHeight: 1.6 }}>
        <strong>Ce am masurat:</strong> {l.evidence}
      </p>
      <p style={{ fontFamily: inter, fontSize: 13.5, color: C.gray600, margin: "6px 0 0", lineHeight: 1.6 }}>
        <strong>Pe Shopify:</strong> {l.mechanism}
      </p>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${C.border}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontFamily: inter, fontSize: 11.5, fontWeight: 700, color: C.gray600, background: C.slate, padding: "4px 9px", borderRadius: 999 }}>
          {CONFIDENCE_LABEL[l.confidence]}
        </span>
        {l.source && <span style={{ fontFamily: inter, fontSize: 11.5, color: C.gray500, lineHeight: 1.5 }}>{l.source}</span>}
      </div>
    </div>
  );
}

function ScenarioCard({ s, currency, highlight }: { s: Scenario; currency: string; highlight: boolean }) {
  return (
    <div style={{
      flex: "1 1 200px", padding: 20, borderRadius: 14,
      border: `${highlight ? 2 : 1}px solid ${highlight ? C.cyan : C.border}`,
      background: highlight ? "#F2FDFE" : C.white,
    }}>
      <div style={{ fontFamily: inter, fontSize: 12, fontWeight: 700, color: highlight ? C.cyan : C.gray500, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {s.id}
      </div>
      <div style={{ fontFamily: sora, fontSize: 26, fontWeight: 800, color: C.gray800, margin: "8px 0 2px" }}>
        {s.convPct}%
      </div>
      <div style={{ fontFamily: inter, fontSize: 12.5, color: C.gray600 }}>rata de conversie</div>
      {s.extraMonth > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: sora, fontSize: 18, fontWeight: 800, color: C.green }}>
            +{fmt(s.extraMonth)} {symOf(currency)}
          </div>
          <div style={{ fontFamily: inter, fontSize: 12, color: C.gray600 }}>pe luna · +{fmt(s.extraYear)} pe an</div>
        </div>
      )}
      <p style={{ fontFamily: inter, fontSize: 12, color: C.gray500, margin: "12px 0 0", lineHeight: 1.5 }}>{s.label}</p>
    </div>
  );
}

export function MigrareReportRenderer({ domain, evidence, shopifyCase }: {
  domain: string;
  evidence: PlatformEvidence;
  shopifyCase: ShopifyCase;
}) {
  const c = shopifyCase;
  const sym = symOf(c.currency);
  const probabil = c.scenarios[1];
  const stack = evidence.stack;
  const platformName = [stack.ecomEngine?.name ?? stack.platform, stack.ecomEngine?.version].filter(Boolean).join(" ");

  const verdictColor = c.verdict === "recomandat" ? C.green : c.verdict === "de discutat" ? C.yellow : C.gray600;
  const structuralCount = evidence.findings.filter((f) => f.structural && f.verdict !== "ok").length;

  return (
    <div style={{ background: C.slate, minHeight: "100vh", paddingBottom: 60 }}>
      {/* Hero — deschide cu diagnosticul, nu cu suma */}
      <header style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.navyMid})`, color: C.white, padding: "52px 24px 60px" }}>
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <div style={{ fontFamily: inter, fontSize: 13, color: C.gray400, letterSpacing: 0.5 }}>
            RAPORT DE PLATFORMA · {domain}
          </div>
          <h1 style={{ fontFamily: sora, fontSize: 34, fontWeight: 800, margin: "12px 0 10px", lineHeight: 1.2 }}>
            Cat te costa platforma pe care stai
          </h1>
          <p style={{ fontFamily: inter, fontSize: 16, color: "#C9D4E8", margin: 0, lineHeight: 1.6, maxWidth: 620 }}>
            Magazinul tau ruleaza pe {platformName || "o platforma gazduita de tine"}. Am masurat ce simt vizitatorii
            si am separat ce tine de platforma de ce se poate repara oricum.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 26 }}>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 18px", minWidth: 150 }}>
              <div style={{ fontFamily: sora, fontSize: 24, fontWeight: 800, color: C.cyan }}>{structuralCount}</div>
              <div style={{ fontFamily: inter, fontSize: 12.5, color: "#C9D4E8" }}>probleme care tin de platforma</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 18px", minWidth: 150 }}>
              <div style={{ fontFamily: sora, fontSize: 24, fontWeight: 800, color: C.cyan }}>+{c.totalUpliftPct}%</div>
              <div style={{ fontFamily: inter, fontSize: 12.5, color: "#C9D4E8" }}>crestere estimata a conversiei</div>
            </div>
            {probabil.extraYear > 0 && (
              <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 18px", minWidth: 150 }}>
                <div style={{ fontFamily: sora, fontSize: 24, fontWeight: 800, color: C.cyan }}>+{fmt(probabil.extraYear)} {sym}</div>
                <div style={{ fontFamily: inter, fontSize: 12.5, color: "#C9D4E8" }}>pe an, scenariul probabil</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: "-28px auto 0", padding: "0 24px" }}>
        {/* Verdict */}
        <div style={{ background: C.white, borderRadius: 16, padding: 24, border: `1px solid ${C.border}`, marginBottom: 40, boxShadow: "0 10px 30px rgba(19,22,58,0.07)" }}>
          <div style={{ fontFamily: inter, fontSize: 12, fontWeight: 700, color: C.gray500, letterSpacing: 0.5, textTransform: "uppercase" }}>Verdict</div>
          <div style={{ fontFamily: sora, fontSize: 24, fontWeight: 800, color: verdictColor, margin: "6px 0 8px", textTransform: "capitalize" }}>
            {c.verdict}
          </div>
          <p style={{ fontFamily: inter, fontSize: 14.5, color: C.gray600, margin: 0, lineHeight: 1.6 }}>{c.verdictReason}</p>
        </div>

        <Section
          title="Ce am masurat pe magazinul tau"
          intro="Cifrele de mai jos vin de la utilizatori reali (Google, ultimele 28 de zile) si din codul paginii. Nu sunt pareri."
        >
          {evidence.findings.map((f) => <FindingRow key={f.id} f={f} />)}
        </Section>

        {c.levers.length > 0 && (
          <Section
            title="De unde ar veni cresterea"
            intro="Fiecare punct porneste de la o masuratoare pe site-ul tau. Procentele nu se aduna simplu — actioneaza pe acelasi vizitator, deci le-am compus si plafonat."
          >
            {c.levers.map((l) => <LeverCard key={l.id} l={l} />)}
          </Section>
        )}

        <Section
          title="Cat ar insemna in cifre"
          intro={c.monthlyOrders == null
            ? "Fara numarul de vizite lunare putem arata doar procentele. Spune-ne traficul si calculam si sumele."
            : `Calculat la ${fmt(c.monthlyOrders)} comenzi pe luna, pornind de la o rata de conversie de ${c.convNowPct}%.`}
        >
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {c.scenarios.map((s, i) => <ScenarioCard key={s.id} s={s} currency={c.currency} highlight={i === 1} />)}
          </div>
        </Section>

        <Section title="Cat costa, cat se recupereaza">
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
              <div style={{ flex: "1 1 140px" }}>
                <div style={{ fontFamily: inter, fontSize: 12.5, color: C.gray600 }}>Platesti acum</div>
                <div style={{ fontFamily: sora, fontSize: 20, fontWeight: 800, color: C.gray800 }}>{fmt(c.tco.currentMonth)} {sym}/luna</div>
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <div style={{ fontFamily: inter, fontSize: 12.5, color: C.gray600 }}>Pe Shopify</div>
                <div style={{ fontFamily: sora, fontSize: 20, fontWeight: 800, color: C.gray800 }}>{fmt(c.tco.shopifyMonth)} {sym}/luna</div>
              </div>
              <div style={{ flex: "1 1 140px" }}>
                <div style={{ fontFamily: inter, fontSize: 12.5, color: C.gray600 }}>Migrarea, o singura data</div>
                <div style={{ fontFamily: sora, fontSize: 20, fontWeight: 800, color: C.gray800 }}>{fmt(c.tco.migrationOneOff)} {sym}</div>
              </div>
              {c.tco.paybackMonths != null && (
                <div style={{ flex: "1 1 140px" }}>
                  <div style={{ fontFamily: inter, fontSize: 12.5, color: C.gray600 }}>Se acopera in</div>
                  <div style={{ fontFamily: sora, fontSize: 20, fontWeight: 800, color: C.green }}>{c.tco.paybackMonths} luni</div>
                </div>
              )}
            </div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {c.tco.notes.map((n, i) => (
                <li key={i} style={{ fontFamily: inter, fontSize: 12.5, color: C.gray600, lineHeight: 1.7 }}>{n}</li>
              ))}
            </ul>
          </div>
        </Section>

        {/* Sectiunea care face raportul credibil. NU o scoate. */}
        <Section
          title="Ce pierzi daca treci pe Shopify"
          intro="Nu exista mutare fara compromisuri. Le punem pe masa de la inceput, ca sa decizi cu ele in fata."
        >
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {c.tradeoffs.map((t, i) => (
                <li key={i} style={{ fontFamily: inter, fontSize: 13.5, color: C.gray800, lineHeight: 1.8 }}>{t}</li>
              ))}
            </ul>
          </div>
        </Section>

        <Section title="Cum am calculat">
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 14, padding: 22 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {c.assumptions.map((a, i) => (
                <li key={i} style={{ fontFamily: inter, fontSize: 12.5, color: C.gray600, lineHeight: 1.8 }}>{a}</li>
              ))}
            </ul>
          </div>
        </Section>

        <div style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, borderRadius: 16, padding: 32, textAlign: "center", color: C.white }}>
          <h2 style={{ fontFamily: sora, fontSize: 22, fontWeight: 800, margin: "0 0 8px" }}>Vrei cifrele exacte, nu estimari?</h2>
          <p style={{ fontFamily: inter, fontSize: 14.5, margin: "0 0 18px", lineHeight: 1.6, opacity: 0.95 }}>
            Cu acces la Google Analytics calculam pe datele tale reale, nu pe medii de piata.
          </p>
          <div style={{ fontFamily: sora, fontSize: 15, fontWeight: 700 }}>
            hello@devrika.ro · Razvan 0742 374 325 · Vlad 0756 281 176
          </div>
        </div>
      </main>
    </div>
  );
}
