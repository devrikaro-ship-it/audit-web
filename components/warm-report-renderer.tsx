"use client";

import type { WarmReport, WarmChannel, WarmFinding, WarmStep } from "@/lib/warm-report";
import { C, sora, inter } from "@/lib/theme";
import { VERDICT_GOOD, VERDICT_MID } from "@/lib/scoring";

/* Render raport CALD (audit intern pe date reale). Port al scripts/warm_report.py.
   Paleta + fonturi din lib/theme (sursa unica, aceleasi tokenuri ca raportul RECE). */

const SEV: Record<string, { fg: string; bg: string; lab: string }> = {
  critic: { fg: C.red, bg: C.redBg, lab: "CRITIC" },
  major: { fg: C.orange, bg: C.orangeBg, lab: "MAJOR" },
  minor: { fg: C.yellow, bg: C.yellowBg, lab: "MINOR" },
};
const stateColor = (s: string) => (s === "bun" ? C.green : s === "slab" ? C.red : C.orange);
const Html = ({ html, ...rest }: { html: string } & React.HTMLAttributes<HTMLSpanElement>) =>
  <span {...rest} dangerouslySetInnerHTML={{ __html: html }} />;

function ChannelCard({ c }: { c: WarmChannel }) {
  const s = typeof c.score === "number" ? Math.round(c.score) : null;
  const sc = s == null ? C.cyan : s >= VERDICT_GOOD ? C.green : s >= VERDICT_MID ? C.orange : C.red;
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: 22, boxShadow: "0 8px 30px rgba(19,22,58,.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontFamily: sora, fontSize: 18, fontWeight: 800, color: C.navy, margin: 0 }}>{c.name}</h3>
        <span style={{ color: C.white, fontFamily: sora, fontWeight: 700, fontSize: 11, letterSpacing: ".05em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 7, background: stateColor(c.state) }}>{c.verdict}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {c.kpis.map((k, i) => (
          <div key={i} style={{ background: C.slate, borderRadius: 11, padding: 12 }}>
            <div style={{ fontFamily: sora, fontSize: 21, fontWeight: 800, color: k.color ?? C.gray800 }}>{k.v}</div>
            <div style={{ fontSize: 11.5, color: C.gray500, marginTop: 1 }}>{k.l}</div>
          </div>
        ))}
      </div>
      {s != null && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: C.gray500, marginBottom: 5 }}>
            <span>Sanatate cont</span><b style={{ fontFamily: sora, fontSize: 13, color: sc }}>{s}/100</b>
          </div>
          <div style={{ height: 7, background: C.slate, borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, width: `${s}%`, background: sc }} />
          </div>
        </div>
      )}
      {c.note && <p style={{ fontSize: 13.5, color: C.gray600, lineHeight: 1.5, marginTop: 13 }}>{c.note}</p>}
    </div>
  );
}

function FindingCard({ f, idx }: { f: WarmFinding; idx: number }) {
  const sev = SEV[f.sev ?? "major"] ?? SEV.major;
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 26px", boxShadow: "0 6px 24px rgba(19,22,58,.05)", display: "flex", gap: 18, marginBottom: 14 }}>
      <div style={{ fontFamily: sora, fontSize: 22, fontWeight: 800, color: "#C9D2E3", width: 30, flexShrink: 0 }}>{String(idx + 1).padStart(2, "0")}</div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
          <span style={{ fontFamily: sora, fontWeight: 800, fontSize: 11, letterSpacing: ".06em", padding: "3px 9px", borderRadius: 6, color: sev.fg, background: sev.bg }}>{sev.lab}</span>
          {f.meta && <span style={{ fontSize: 12, color: C.gray500, textTransform: "uppercase", letterSpacing: ".04em" }}>{f.meta}</span>}
        </div>
        <h4 style={{ fontSize: 17, fontWeight: 700, color: C.gray800, margin: "0 0 7px" }}>{f.title}</h4>
        <p style={{ fontSize: 14.5, color: C.gray600, lineHeight: 1.55, margin: "0 0 10px" }}>{f.problema}</p>
        {f.fix && <p style={{ fontSize: 13.5, color: C.gray800, lineHeight: 1.5, margin: 0 }}><b style={{ color: C.indigo }}>Ce facem:</b> {f.fix}</p>}
      </div>
    </div>
  );
}

function Section({ title, sub, items }: { title: string; sub?: string; items?: WarmFinding[] }) {
  if (!items || !items.length) return null;
  return (
    <section style={{ padding: "48px 0 0" }}>
      <h2 style={{ fontFamily: sora, fontSize: 27, fontWeight: 800, color: C.navy, margin: 0 }}>{title}</h2>
      {sub && <p style={{ color: C.gray500, fontSize: 15, margin: "6px 0 22px" }}>{sub}</p>}
      {items.map((f, i) => <FindingCard key={i} f={f} idx={i} />)}
    </section>
  );
}

export function WarmReportRenderer({ d }: { d: WarmReport }) {
  const t = d.targets ?? {};
  const gun = d.gun;
  const strike = gun?.strike ?? true;
  return (
    <div style={{ fontFamily: inter, background: C.slate, minHeight: "100vh", color: C.gray800 }}>
      <header style={{ background: `radial-gradient(120% 120% at 50% -10%, ${C.navyMid} 0%, ${C.navy} 60%)`, color: C.white, padding: "30px 0 56px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: sora, fontWeight: 800, letterSpacing: ".18em", fontSize: 15, color: C.cyan }}>DEVRIKA</span>
            <span style={{ fontSize: 13, color: C.gray400 }}>{d.date}</span>
          </div>
          <div style={{ textAlign: "center", marginTop: 38 }}>
            <span style={{ display: "inline-block", fontFamily: sora, fontWeight: 700, fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: C.cyan, background: "rgba(71,73,158,.45)", border: "1px solid rgba(10,190,207,.3)", padding: "6px 14px", borderRadius: 999 }}>Audit cont · Google + Meta</span>
            <h1 style={{ fontFamily: sora, fontSize: 44, fontWeight: 800, margin: "14px 0 6px" }}>{d.client}</h1>
            <p style={{ fontSize: 18, color: "#C7D2E8", margin: 0 }}>{d.subtitle ?? "Unde se duc banii — si unde sunt vanzarile reale"}</p>
          </div>
          <Html html={d.verdict} style={{ display: "block", maxWidth: 760, margin: "26px auto 0", background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "20px 24px", fontSize: 16, lineHeight: 1.55, color: "#EAF0FA" }} />

          {gun && (
            <div style={{ maxWidth: 780, margin: "26px auto 0", background: strike ? "rgba(192,57,43,.12)" : "rgba(10,190,207,.08)", border: strike ? "1px solid rgba(255,140,140,.3)" : "1px solid rgba(10,190,207,.22)", borderRadius: 18, padding: "22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 200, textAlign: "center" }}>
                  <div style={{ fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", color: C.gray400, marginBottom: 4 }}>{gun.left_lab ?? "Platforma raporteaza"}</div>
                  <div style={{ fontFamily: sora, fontSize: 34, fontWeight: 800, lineHeight: 1, color: strike ? "#FF9B9B" : "#FFC98A", textDecoration: strike ? "line-through" : "none", textDecorationThickness: 2 }}>{gun.left}</div>
                  {gun.left_sub && <div style={{ fontSize: 12.5, color: "#C7D2E8", marginTop: 6, lineHeight: 1.4 }}>{gun.left_sub}</div>}
                </div>
                <div style={{ fontFamily: sora, fontWeight: 700, fontSize: 12, color: C.gray400, padding: "0 6px", textTransform: "uppercase" }}>{gun.vs ?? "vs realitate"}</div>
                <div style={{ flex: 1, minWidth: 200, textAlign: "center" }}>
                  <div style={{ fontSize: 11.5, letterSpacing: ".06em", textTransform: "uppercase", color: C.gray400, marginBottom: 4 }}>{gun.right_lab ?? "GA4 — vanzari reale"}</div>
                  <div style={{ fontFamily: sora, fontSize: 34, fontWeight: 800, lineHeight: 1, color: "#5EEAD4" }}>{gun.right}</div>
                  {gun.right_sub && <div style={{ fontSize: 12.5, color: "#C7D2E8", marginTop: 6, lineHeight: 1.4 }}>{gun.right_sub}</div>}
                </div>
              </div>
              {gun.note && <Html html={gun.note} style={{ display: "block", textAlign: "center", fontSize: 13.5, color: "#EAF0FA", lineHeight: 1.5, marginTop: 16 }} />}
            </div>
          )}

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}>
            {[{ v: t.cpa ?? "—", l: "CPA target" }, { v: t.troas ?? "—", l: "tROAS target" }, { v: t.aov ?? "—", l: "AOV (GA4)" }, ...(t.business ? [{ v: t.business, l: t.business_l ?? "venit real / 90z" }] : [])].map((x, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 14, padding: "14px 24px", textAlign: "center" }}>
                <div style={{ fontFamily: sora, fontSize: 26, fontWeight: 800, color: C.cyan }}>{x.v}</div>
                <div style={{ fontSize: 12, color: C.gray400, marginTop: 2 }}>{x.l}</div>
              </div>
            ))}
          </div>
          <p style={{ maxWidth: 720, margin: "20px auto 0", textAlign: "center", fontSize: 12.5, color: C.gray400, lineHeight: 1.5 }}>
            Evaluat punct cu punct vs standardul Devrika — playbook Google Ads + Meta Ads (conversii curate · PMax Value+tROAS · Search brand · OUTCOME_SALES · ROAS real din GA4).
          </p>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: d.channels.length > 1 ? "1fr 1fr" : "1fr", gap: 18, marginTop: -32 }}>
          {d.channels.map((c, i) => <ChannelCard key={i} c={c} />)}
        </div>

        {d.opportunity && (
          <div style={{ background: "linear-gradient(135deg,rgba(10,190,207,.08),rgba(71,73,158,.08))", border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.cyan}`, borderRadius: 16, padding: "24px 26px", marginTop: 18 }}>
            <div style={{ fontFamily: sora, fontSize: 13, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: C.indigo, marginBottom: 6 }}>{d.opportunity.h ?? "Banii pe masa"}</div>
            <div style={{ fontFamily: sora, fontSize: 28, fontWeight: 800, color: C.navy, lineHeight: 1.1, marginBottom: 8 }}>{d.opportunity.v}</div>
            {d.opportunity.b && <Html html={d.opportunity.b} style={{ display: "block", fontSize: 14, color: C.gray600, lineHeight: 1.55 }} />}
          </div>
        )}

        {d.proof && d.proof.length > 0 && (
          <div style={{ marginTop: 18, background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ fontFamily: sora, fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 12 }}>{d.proof_h ?? "Rezultate cu acelasi sistem, pe alte conturi Devrika"}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
              {d.proof.map((p, i) => <Html key={i} html={p} style={{ fontSize: 12.5, color: C.gray800, background: C.slate, border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 12px" }} />)}
            </div>
          </div>
        )}

        {d.quickwins && d.quickwins.length > 0 && (
          <section style={{ padding: "48px 0 0" }}>
            <h2 style={{ fontFamily: sora, fontSize: 27, fontWeight: 800, color: C.navy, margin: 0 }}>Primii pasi — saptamana 1</h2>
            <p style={{ color: C.gray500, fontSize: 15, margin: "6px 0 22px" }}>Efect imediat, fara dependente. De-aici incepe.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
              {d.quickwins.map((w, i) => (
                <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.cyan}`, borderRadius: 14, padding: 18 }}>
                  <div style={{ fontFamily: sora, fontWeight: 800, color: C.cyan, fontSize: 13, marginBottom: 6 }}>PAS {i + 1}</div>
                  <div style={{ fontFamily: sora, fontWeight: 700, fontSize: 14.5, color: C.gray800, marginBottom: 5 }}>{w.t}</div>
                  {w.d && <div style={{ fontSize: 13, color: C.gray600, lineHeight: 1.5 }}>{w.d}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        <Section title="Google Ads — ce e in neregula" sub={d.google_sub} items={d.google} />
        <Section title="Meta Ads — ce e in neregula" sub={d.meta_sub} items={d.meta} />

        {d.plan && d.plan.length > 0 && (
          <section style={{ padding: "48px 0 0" }}>
            <h2 style={{ fontFamily: sora, fontSize: 27, fontWeight: 800, color: C.navy, margin: 0 }}>Plan de actiune</h2>
            <p style={{ color: C.gray500, fontSize: 15, margin: "6px 0 22px" }}>In ordine — tracking-ul intai, apoi structura.</p>
            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, padding: 26 }}>
              {d.plan.map((p: WarmStep, i) => (
                <div key={i} style={{ display: "flex", gap: 14, padding: "12px 0", borderBottom: i < d.plan!.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${C.indigo},${C.cyan})`, color: C.white, fontFamily: sora, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                  <div>
                    <b style={{ fontFamily: sora, fontSize: 15, color: C.gray800, display: "block" }}>{p.t}</b>
                    {p.d && <span style={{ fontSize: 13.5, color: C.gray600 }}>{p.d}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer style={{ textAlign: "center", color: C.gray400, fontSize: 13, padding: "36px 0 48px" }}>
        Audit intern Devrika · {d.date} · date reale din conturi (Google Ads · Meta · GA4)
      </footer>
    </div>
  );
}
