"use client";

import { CHECKS, SECTIUNI_CONFIG, CHECK_TO_PROBLEM, PROBLEMS, type StatusCheck, type Sectiune } from "@/lib/problems-db";
import type { AuditData, CheckResult, PageCheck, MoneyLeak, UxField } from "@/lib/types";
import { statusScore, scoreToStatus, VERDICT_GOOD, VERDICT_MID } from "@/lib/scoring";
import { C, sora, inter } from "@/lib/theme";
import { symOf } from "@/lib/currency";

export type { AuditData };

/* ---------- design tokens: paleta + fonturi in lib/theme (sursa unica) ---------- */

function scoreColor(s: number) { return s >= VERDICT_GOOD ? C.green : s >= VERDICT_MID ? C.orange : C.red; }
function sevMeta(s: StatusCheck) {
  if (s === "ok")      return { label: "OK",     fg: C.green,  bg: C.greenBg };
  if (s === "atentie") return { label: "MEDIU",  fg: C.yellow, bg: C.yellowBg };
  return                      { label: "CRITIC", fg: C.red,    bg: C.redBg };
}

type Finding = { area: string; label: string; status: StatusCheck; problema: string; fix: string; value: string; rank: number };
type OkItem = { label: string; value: string };

const PAGE_BASED = new Set<Sectiune>(["seo", "continut", "keywords", "structura"]);

/* aduna problemele + OK-urile dintr-o sectiune */
function splitSection(sectiune: Sectiune, data: AuditData): { scor: number; problems: Finding[]; oks: OkItem[] } {
  const area = SECTIUNI_CONFIG[sectiune]?.label ?? sectiune;
  const problems: Finding[] = [];
  const oks: OkItem[] = [];
  const scores: number[] = [];

  if (PAGE_BASED.has(sectiune)) {
    const map: Record<string, PageCheck[]> = {
      seo: data.seoChecks, continut: data.continutChecks, keywords: data.keywordsChecks, structura: data.structuraChecks,
    };
    for (const c of map[sectiune] ?? []) {
      const sc = Math.round((c.correctCount / Math.max(c.total, 1)) * 100);
      scores.push(sc);
      const status: StatusCheck = scoreToStatus(sc);
      const value = `${c.correctCount} din ${c.total} ${c.unit ?? "pagini"} OK`;
      if (status === "ok") oks.push({ label: c.label, value });
      else problems.push({ area, label: c.label, status, problema: c.problema, fix: c.fix, value, rank: sc });
    }
  } else {
    const ids = Object.entries(CHECKS).filter(([, c]) => c.sectiune === sectiune).map(([k]) => k);
    for (const id of ids) {
      const r: CheckResult = data.checksRezultate[id] ?? { status: "ok", value: "—" };
      scores.push(statusScore(r.status));
      if (r.status === "ok") { oks.push({ label: CHECKS[id]?.label ?? id, value: r.value }); continue; }
      const probId = CHECK_TO_PROBLEM[id]?.[r.status];
      const prob = probId ? PROBLEMS[probId] : null;
      problems.push({ area, label: CHECKS[id]?.label ?? id, status: r.status, problema: prob?.problema ?? "", fix: prob?.fix ?? "", value: r.value, rank: statusScore(r.status) });
    }
  }
  problems.sort((a, b) => (a.status === b.status ? a.rank - b.rank : a.status === "critic" ? -1 : 1));
  const scor = Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));
  return { scor, problems, oks };
}

function countAllProblems(data: AuditData): { total: number; critice: number } {
  const sectiuni: Sectiune[] = ["viteza", "seo", "continut", "keywords", "structura", "schema"];
  const all = sectiuni.flatMap(s => splitSection(s, data).problems);
  let total = all.length;
  let critice = all.filter(f => f.status === "critic").length;
  // UX/UI: fiecare camp care nu e "bun"/"necunoscut" = o problema (slab = critica)
  for (const f of data.ux?.fields ?? []) {
    if (f.status === "slab") { total++; critice++; }
    else if (f.status === "partial") { total++; }
  }
  // Tracking: campurile confirmate lipsa (nu "de verificat") = critice
  const trackIds = ["ga4", "ads_conv", "pixel", "tiktok", "consent"];
  for (const l of data.conversie?.leaks ?? []) {
    if (trackIds.includes(l.id) && l.present === "nu") { total++; critice++; }
  }
  return { total, critice };
}

/* ---------- 4 categorii raport: Tracking · SEO · UX/UI · Trust ---------- */
function catVerdict(s: number) {
  if (s >= VERDICT_GOOD) return { w: "Bun",       fg: C.green,  bg: C.greenBg };
  if (s >= VERDICT_MID)  return { w: "De reglat", fg: C.yellow, bg: C.yellowBg };
  return                        { w: "Slab",      fg: C.red,    bg: C.redBg };
}
function sectionAvg(data: AuditData, sections: Sectiune[]): number {
  const s = sections.map(x => splitSection(x, data).scor);
  return s.reduce((a, b) => a + b, 0) / (s.length || 1);
}
// scor pe baza prezentei unor semnale din ConversieAudit (tracking, incredere, ux)
function leakScore(data: AuditData, ids: string[]): number | null {
  const rel = (data.conversie?.leaks ?? []).filter(l => ids.includes(l.id) && l.present !== "necunoscut");
  if (!rel.length) return null;
  return (rel.filter(l => l.present === "da").length / rel.length) * 100;
}
function avgDefined(...vals: (number | null)[]): number {
  const v = vals.filter((x): x is number => x != null);
  return Math.round(v.reduce((a, b) => a + b, 0) / (v.length || 1));
}
function googleAdsScore(g: NonNullable<AuditData["googleAds"]>): number {
  if (g.css.status === "third_party_css") return 100;
  if (g.css.status === "google_css") return 45;
  if (g.shopping.present) return 60;
  if (g.css.status === "not_in_shopping") return 25;
  return 50;
}
function googleAdsSub(g: NonNullable<AuditData["googleAds"]>): string {
  if (g.css.status === "google_css") return "Fara CSS partener — CPC ~20% mai mare";
  if (g.css.status === "third_party_css") return `CSS partener (${g.css.provider}) — optimizat`;
  if (g.css.status === "not_in_shopping") return "Nu rulezi Google Shopping";
  return "CSS · Shopping · concurenta";
}
function CategoriiSummary({ data }: { data: AuditData }) {
  const gAds = data.googleAds
    ? { label: "Google Ads", sub: googleAdsSub(data.googleAds), scor: googleAdsScore(data.googleAds) }
    : { label: "Google Ads", sub: "Verificare CSS + Shopping", scor: 50 };
  const cards = [
    { label: "Tracking",          sub: "Google, Meta, TikTok + Consent Mode", scor: avgDefined(leakScore(data, ["ga4", "ads_conv", "pixel", "tiktok", "consent"])) },
    { label: "SEO",               sub: "On-page · Continut · Keywords · Structura · Schema", scor: Math.round(sectionAvg(data, ["seo", "continut", "keywords", "structura", "schema"])) },
    { label: "UX / UI",           sub: "Viteza + homepage, categorie, produs, filtre", scor: data.ux ? data.ux.scor : Math.round(sectionAvg(data, ["viteza"])) },
    gAds,
  ];
  return (
    <section style={{ maxWidth: 920, margin: "0 auto", padding: "40px 24px 0" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
        {cards.map(c => {
          const v = catVerdict(c.scor);
          return (
            <div key={c.label} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "18px 20px", boxShadow: "0 6px 24px rgba(19,22,58,.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: sora, fontWeight: 800, fontSize: 14.5, color: C.navy }}>{c.label}</span>
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: ".04em", textTransform: "uppercase", color: v.fg, background: v.bg, padding: "3px 8px", borderRadius: 6 }}>{v.w}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 11.5, color: C.gray500 }}>{c.sub}</span>
                <b style={{ fontFamily: sora, fontSize: 15, color: v.fg }}>{c.scor}<span style={{ fontSize: 11, color: C.gray400 }}>/100</span></b>
              </div>
              <div style={{ height: 7, background: C.slate, borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", borderRadius: 99, width: `${c.scor}%`, background: v.fg }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- gauge 270° ---------- */
function Gauge({ scor }: { scor: number }) {
  const R = 80, CIRC = 2 * Math.PI * R, ARC = 0.75;
  return (
    <div style={{ position: "relative", width: 220, height: 220 }}>
      <svg viewBox="0 0 200 200" width="220" height="220" fill="none">
        <circle cx="100" cy="100" r={R} stroke="rgba(255,255,255,0.10)" strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${ARC * CIRC} ${CIRC}`} transform="rotate(135 100 100)" />
        <circle cx="100" cy="100" r={R} stroke={C.cyan} strokeWidth="14" strokeLinecap="round"
          strokeDasharray={`${(scor / 100) * ARC * CIRC} ${CIRC}`} transform="rotate(135 100 100)" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "translateY(-6px)" }}>
        <span style={{ fontFamily: sora, fontSize: 56, fontWeight: 800, color: C.white, lineHeight: 1 }}>{scor}</span>
        <span style={{ fontSize: 13, color: C.gray400, marginTop: 2 }}>din 100</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cyan, marginTop: 8 }}>Vizibilitate online</span>
      </div>
    </div>
  );
}

function StatPill({ n, label, color }: { n: number | string; label: string; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 14, padding: "16px 22px", minWidth: 120, textAlign: "center" }}>
      <div style={{ fontFamily: sora, fontSize: 28, fontWeight: 800, color }}>{n}</div>
      <div style={{ fontSize: 12, color: C.gray400, marginTop: 2, letterSpacing: "0.04em" }}>{label}</div>
    </div>
  );
}

/* ---------- card problema lizibil (acelasi format peste tot) ---------- */
function FindingCard({ f, index, showArea }: { f: Finding; index?: number; showArea?: boolean }) {
  const m = sevMeta(f.status);
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: "22px 26px", boxShadow: "0 6px 24px rgba(19,22,58,0.05)", display: "flex", gap: 18 }}>
      {index != null && <div style={{ fontFamily: sora, fontSize: 22, fontWeight: 800, color: "#C9D2E3", width: 30, flexShrink: 0 }}>{String(index + 1).padStart(2, "0")}</div>}
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ fontFamily: sora, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", padding: "3px 9px", borderRadius: 6, color: m.fg, background: m.bg }}>{m.label}</span>
          {showArea && <span style={{ fontSize: 11, color: C.gray500, textTransform: "uppercase", letterSpacing: "0.05em" }}>{f.area}</span>}
          <span style={{ fontSize: 12.5, color: C.gray400 }}>{f.value}</span>
        </div>
        <h4 style={{ fontFamily: sora, fontSize: 17, fontWeight: 700, color: C.gray800, margin: "0 0 7px" }}>{f.label}</h4>
        <p style={{ fontSize: 14.5, color: C.gray600, lineHeight: 1.55, margin: "0 0 10px" }}>{f.problema}</p>
        <p style={{ fontSize: 13.5, color: C.gray800, lineHeight: 1.5, margin: 0 }}>
          <span style={{ fontWeight: 700, color: C.indigo }}>Ce facem: </span>{f.fix}
        </p>
      </div>
    </div>
  );
}

function SectionIconBox({ icon, size = 22 }: { icon: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    zap: <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />,
    search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
    "file-text": <><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M16 13H8" /><path d="M16 17H8" /></>,
    link: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
    code: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></>,
    share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>,
    shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
    "trending-up": <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>,
  };
  return <svg {...p}>{paths[icon] ?? null}</svg>;
}

/* ---------- bloc sectiune: header + probleme (carduri) + OK compact ---------- */
function SectionBlock({ sectiune, data }: { sectiune: Sectiune; data: AuditData }) {
  const cfg = SECTIUNI_CONFIG[sectiune];
  const { scor, problems, oks } = splitSection(sectiune, data);
  const color = scoreColor(scor);
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ padding: 12, borderRadius: 13, background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})` }}><SectionIconBox icon={cfg.icon} /></div>
        <div style={{ flex: 1 }}>
          <h3 style={{ fontFamily: sora, fontSize: 21, fontWeight: 800, color: C.navy, margin: 0 }}>{cfg.label}</h3>
          <p style={{ fontSize: 13, color: C.gray500, margin: "2px 0 0" }}>{cfg.importantaLabel}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontFamily: sora, fontSize: 30, fontWeight: 800, color }}>{scor}</span>
          <span style={{ fontSize: 13, color: C.gray400 }}> /100</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {problems.map((f, i) => <FindingCard key={i} f={f} />)}
      </div>

      {oks.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: problems.length ? 14 : 0 }}>
          {oks.map((o, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.greenBg, border: "1px solid #D6EFE0", borderRadius: 10, padding: "8px 13px", fontSize: 13.5, color: C.gray800 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
              <span style={{ fontWeight: 600 }}>{o.label}</span>
              <span style={{ color: C.gray500 }}>· {o.value}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Conversie / bani pierduti (PPC) ---------- */
function LeakCard({ l }: { l: MoneyLeak }) {
  const unknown = l.present === "necunoscut";
  const fg = unknown ? C.yellow : C.red, bg = unknown ? C.yellowBg : C.redBg;
  const lab = unknown ? "DE VERIFICAT" : "LIPSESTE";
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${fg}`, borderRadius: 14, padding: "18px 22px", boxShadow: "0 6px 24px rgba(19,22,58,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 7 }}>
        <span style={{ fontFamily: sora, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", padding: "3px 9px", borderRadius: 6, color: fg, background: bg }}>{lab}</span>
        <h4 style={{ fontFamily: sora, fontSize: 16, fontWeight: 700, color: C.gray800, margin: 0 }}>{l.label}</h4>
      </div>
      <p style={{ fontSize: 14, color: C.gray600, lineHeight: 1.55, margin: "0 0 9px" }}>{l.pierdere}</p>
      <p style={{ fontSize: 13, color: C.gray800, lineHeight: 1.5, margin: 0 }}>
        <span style={{ fontWeight: 700, color: C.indigo }}>Ce facem: </span>{l.fix}
      </p>
    </div>
  );
}

/* ---------- chip verde "ai deja" ---------- */
function GreenChip({ label }: { label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.greenBg, border: "1px solid #D6EFE0", borderRadius: 10, padding: "8px 13px", fontSize: 13.5, color: C.gray800 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
      <span style={{ fontWeight: 600 }}>{label}</span>
    </span>
  );
}

/* ---------- header rubrica: titlu + scor + subtitlu ---------- */
function RubricHead({ title, sub, scor }: { title: string; sub: string; scor: number }) {
  const color = scoreColor(scor);
  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ fontFamily: sora, fontSize: 28, fontWeight: 800, color: C.navy, margin: 0 }}>{title}</h2>
        <span style={{ fontFamily: sora, fontSize: 26, fontWeight: 800, color }}>{scor}<span style={{ fontSize: 14, color: C.gray400 }}>/100</span></span>
      </div>
      <p style={{ color: C.gray500, margin: "6px 0 22px", fontSize: 15.5 }}>{sub}</p>
    </>
  );
}

/* ---------- Rubrica 1: Tracking (strict tracking) ---------- */
function TrackingSection({ data }: { data: AuditData }) {
  const trackIds = ["ga4", "ads_conv", "pixel", "tiktok", "consent"];
  const leaks = (data.conversie?.leaks ?? []).filter(l => trackIds.includes(l.id));
  const gaps = leaks.filter(l => l.present !== "da");
  const have = leaks.filter(l => l.present === "da");
  return (
    <section style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 12px" }}>
      <RubricHead title="Tracking" sub="Google (Analytics + Ads), Meta, TikTok si Consent Mode v2 — masurarea pe care se bazeaza orice reclama profitabila." scor={avgDefined(leakScore(data, ["ga4", "ads_conv", "pixel", "tiktok", "consent"]))} />
      {gaps.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{gaps.map(l => <LeakCard key={l.id} l={l} />)}</div>}
      {have.length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: gaps.length ? 14 : 0 }}>{have.map(l => <GreenChip key={l.id} label={l.label} />)}</div>}
    </section>
  );
}

/* ---------- Rubrica 3: UX / UI (analiza pe tipuri de pagina) ---------- */
function UxCard({ f }: { f: UxField }) {
  const v =
    f.status === "bun"        ? { fg: C.green,  bg: C.greenBg,  lab: "BUN" } :
    f.status === "partial"    ? { fg: C.orange, bg: C.yellowBg, lab: "DE REGLAT" } :
    f.status === "necunoscut" ? { fg: C.yellow, bg: C.yellowBg, lab: "DE VERIFICAT" } :
                                { fg: C.red,    bg: C.redBg,    lab: "SLAB" };
  const showFix = f.status !== "bun";
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${v.fg}`, borderRadius: 14, padding: "18px 22px", boxShadow: "0 6px 24px rgba(19,22,58,0.05)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 7 }}>
        <span style={{ fontFamily: sora, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", padding: "3px 9px", borderRadius: 6, color: v.fg, background: v.bg }}>{v.lab}</span>
        <h4 style={{ fontFamily: sora, fontSize: 16, fontWeight: 700, color: C.gray800, margin: 0, flex: 1 }}>{f.label}</h4>
        {f.status !== "necunoscut" && <span style={{ fontFamily: sora, fontSize: 15, fontWeight: 800, color: v.fg }}>{f.scor}<span style={{ fontSize: 11, color: C.gray400 }}>/100</span></span>}
      </div>
      {showFix && <p style={{ fontSize: 14, color: C.gray600, lineHeight: 1.55, margin: "0 0 9px" }}>{f.problema}</p>}
      {(f.gasit.length > 0 || f.lipsa.length > 0) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, margin: showFix ? "0 0 10px" : 0 }}>
          {f.gasit.map((g, i) => (
            <span key={`g${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: C.greenBg, border: "1px solid #D6EFE0", borderRadius: 8, padding: "4px 9px", fontSize: 12.5, color: C.gray800 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>{g}
            </span>
          ))}
          {f.lipsa.map((l, i) => (
            <span key={`l${i}`} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: f.status === "necunoscut" ? C.slate : C.redBg, border: `1px solid ${f.status === "necunoscut" ? C.border : "#F6D9D4"}`, borderRadius: 8, padding: "4px 9px", fontSize: 12.5, color: C.gray600 }}>
              {f.status !== "necunoscut" && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.red} strokeWidth="2.8" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>}{l}
            </span>
          ))}
        </div>
      )}
      {showFix && (
        <p style={{ fontSize: 13, color: C.gray800, lineHeight: 1.5, margin: 0 }}>
          <span style={{ fontWeight: 700, color: C.indigo }}>Ce facem: </span>{f.fix}
        </p>
      )}
    </div>
  );
}

function UxUiSection({ data }: { data: AuditData }) {
  if (!data.ux) return null;
  return (
    <section style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 12px" }}>
      <RubricHead title="UX / UI" sub="Cum arata si se misca magazinul — viteza pe mobil si experienta pe homepage, categorie, produs si la filtrare." scor={data.ux.scor} />
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {data.ux.fields.map(f => <UxCard key={f.id} f={f} />)}
      </div>
    </section>
  );
}

function AdsFindingCard({ fg, bg, lab, title, message }: { fg: string; bg: string; lab: string; title: string; message: string }) {
  return (
    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${fg}`, borderRadius: 14, padding: "18px 22px", boxShadow: "0 6px 24px rgba(19,22,58,0.05)", marginBottom: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 7 }}>
        <span style={{ fontFamily: sora, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", padding: "3px 9px", borderRadius: 6, color: fg, background: bg }}>{lab}</span>
        <h4 style={{ fontFamily: sora, fontSize: 16, fontWeight: 700, color: C.gray800, margin: 0 }}>{title}</h4>
      </div>
      <p style={{ fontSize: 14, color: C.gray600, lineHeight: 1.55, margin: 0 }}>{message}</p>
    </div>
  );
}

function GoogleAdsSection({ data }: { data: AuditData }) {
  const g = data.googleAds;
  const ps = data.productSignal;
  const price = g?.pricePosition, brand = g?.brandDefense, gbp = g?.gbpReviews;
  const priceV = price && price.status !== "unknown" && (
    price.status === "pricier" ? { fg: C.orange, bg: C.yellowBg, lab: "PRET PESTE PIATA", title: "Esti mai scump decat media concurentei pe produsele verificate" } :
    price.status === "cheaper" ? { fg: C.green, bg: C.greenBg, lab: "AVANTAJ DE PRET", title: "Esti mai ieftin decat media concurentei — foloseste-l in reclame" } :
                                 { fg: C.gray500, bg: C.slate, lab: "PRET LA NIVELUL PIETEI", title: "Esti aproximativ la nivelul pretului mediu din Shopping" });
  const gbpV = gbp && (
    gbp.status === "found"
      ? (gbp.rating != null && gbp.rating >= 4.3 ? { fg: C.green, bg: C.greenBg, lab: "RECENZII GOOGLE" } : { fg: C.orange, bg: C.yellowBg, lab: "RECENZII GOOGLE" })
      : { fg: C.yellow, bg: C.yellowBg, lab: "DE VERIFICAT" });
  const css = g?.css, shop = g?.shopping;
  const v = css && (
    css.status === "third_party_css" ? { fg: C.green, bg: C.greenBg, lab: "AI CSS PARTENER", title: `Rulezi Google Shopping printr-un CSS partener (${css.provider})` } :
    css.status === "google_css"      ? { fg: C.red, bg: C.redBg, lab: "PLATESTI IN PLUS", title: "Rulezi prin CSS-ul Google — CPC pana la ~20% mai mare" } :
    css.status === "not_in_shopping" ? { fg: C.orange, bg: C.yellowBg, lab: "OPORTUNITATE", title: "Nu apari in Google Shopping pe produsele tale" } :
                                       { fg: C.gray500, bg: C.slate, lab: "NEDETERMINAT", title: "Nu am putut verifica statusul in Google Shopping" });
  return (
    <section style={{ maxWidth: 920, margin: "0 auto", padding: "8px 24px 12px" }}>
      <h2 style={{ fontFamily: sora, fontSize: 28, fontWeight: 800, color: C.navy, margin: "0 0 6px" }}>Google Ads — Shopping &amp; CSS</h2>
      <p style={{ color: C.gray500, margin: "0 0 22px", fontSize: 15.5 }}>{g ? "Am cautat produsele tale pe Google si am citit reclamele Shopping reale — exact ce vede un cumparator." : "Cum stai pe Google Shopping si cat de pregatite sunt produsele tale pentru reclame."}</p>

      {css && v && (
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${v.fg}`, borderRadius: 14, padding: "18px 22px", boxShadow: "0 6px 24px rgba(19,22,58,0.05)", marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 7 }}>
          <span style={{ fontFamily: sora, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", padding: "3px 9px", borderRadius: 6, color: v.fg, background: v.bg }}>{v.lab}</span>
          <h4 style={{ fontFamily: sora, fontSize: 16, fontWeight: 700, color: C.gray800, margin: 0 }}>{v.title}</h4>
        </div>
        <p style={{ fontSize: 14, color: C.gray600, lineHeight: 1.55, margin: 0 }}>{css.message}</p>
      </div>
      )}

      {price && priceV && <AdsFindingCard fg={priceV.fg} bg={priceV.bg} lab={priceV.lab} title={priceV.title} message={price.message} />}

      {ps && (
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.indigo}`, borderRadius: 14, padding: "18px 22px", boxShadow: "0 6px 24px rgba(19,22,58,0.05)", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 7 }}>
            <span style={{ fontFamily: sora, fontWeight: 800, fontSize: 11, letterSpacing: "0.06em", padding: "3px 9px", borderRadius: 6, color: C.indigo, background: "rgba(71,73,158,0.10)" }}>OPTIMIZARE PRODUSE</span>
            <h4 style={{ fontFamily: sora, fontSize: 16, fontWeight: 700, color: C.gray800, margin: 0 }}>{ps.headline}</h4>
          </div>
          <p style={{ fontSize: 14, color: C.gray600, lineHeight: 1.55, margin: 0 }}>{ps.message}</p>
        </div>
      )}

      {shop && shop.competitors.length > 0 && (
        <div style={{ background: C.slate, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 24px" }}>
          <h3 style={{ fontFamily: sora, fontSize: 17, fontWeight: 800, color: C.navy, margin: "0 0 6px" }}>Cine liciteaza pe produsele tale ({shop.competitors.length})</h3>
          <p style={{ fontSize: 14, color: C.gray600, lineHeight: 1.55, margin: "0 0 14px" }}>{shop.message}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shop.competitors.slice(0, 8).map((c, i) => {
              const gCss = /^google$/i.test(c.css);
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px" }}>
                  <span style={{ fontFamily: sora, fontWeight: 800, fontSize: 12, color: C.gray400, minWidth: 18 }}>{i + 1}</span>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: C.gray800 }}>{c.seller}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, padding: "3px 8px", borderRadius: 6, color: gCss ? C.gray500 : C.green, background: gCss ? C.slate : C.greenBg }}>{gCss ? "CSS Google" : `CSS ${c.css}`}</span>
                  {c.price != null && <span style={{ fontFamily: sora, fontSize: 13.5, fontWeight: 700, color: C.navy, minWidth: 72, textAlign: "right" }}>{c.price.toLocaleString("ro-RO")} {shop.currency || "RON"}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {brand && brand.status === "contested" && (
        <div style={{ marginTop: 22 }}>
          <AdsFindingCard fg={C.red} bg={C.redBg} lab="APARARE BRAND" title="Concurentii apar pe cautarea numelui tau de brand" message={brand.message} />
        </div>
      )}

      {gbp && gbpV && (gbp.status === "found" || gbp.status === "unknown") && (
        <div style={{ marginTop: brand && brand.status === "contested" ? 0 : 22 }}>
          <AdsFindingCard fg={gbpV.fg} bg={gbpV.bg} lab={gbpV.lab}
            title={gbp.status === "found"
              ? (gbp.rating != null ? `Profil Google: ${gbp.rating} stele${gbp.count != null ? ` (${gbp.count} recenzii)` : ""}` : "Ai recenzii pe profilul Google")
              : "Profil Google Business cu recenzii — de verificat"}
            message={gbp.message} />
        </div>
      )}
    </section>
  );
}

/* ============================ RAPORT ============================ */
function RoiSimSection({ data }: { data: AuditData }) {
  const r = data.roiSim;
  if (!r) return null;
  const sym = symOf(r.currency);
  const money = (n: number) => n.toLocaleString("ro-RO") + " " + sym;
  const rows = [
    { k: "Rata de conversie", now: r.convNowPct + "%", goal: r.convGoalPct + "%" },
    { k: "Cost pe achizitie", now: money(r.cpaNow), goal: money(r.cpaGoal) },
    { k: "ROAS (venit / buget)", now: r.roasNow + "×", goal: r.roasGoal + "×" },
    { k: "Venit din reclame / luna", now: money(r.revenueNow), goal: money(r.revenueGoal) },
  ];
  return (
    <section style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 12px" }}>
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(71,73,158,0.06), rgba(10,190,207,0.06))", padding: "26px 30px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontFamily: sora, fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.indigo, marginBottom: 8 }}>Ce castigi daca repari · estimare</div>
          <div style={{ fontFamily: sora, fontSize: 26, fontWeight: 800, color: C.navy, lineHeight: 1.15 }}>
            La acelasi buget, ai putea aduce in plus{" "}
            <span style={{ color: C.indigo }}>~{money(r.extraRevenueMonth)}</span> pe luna
          </div>
          <p style={{ fontSize: 14.5, color: C.gray600, lineHeight: 1.55, margin: "10px 0 0" }}>
            Adica ~<b style={{ color: C.gray800 }}>{money(r.extraRevenueYear)}</b> pe an — daca duci rata de conversie de la {r.convNowPct}% la {r.convGoalPct}%{r.cpcReductionPct > 0 ? ` si scazi costul pe click cu ~${r.cpcReductionPct}%` : ""}.
          </p>
        </div>

        <div style={{ padding: "8px 30px 4px", overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14.5, fontVariantNumeric: "tabular-nums" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "12px 8px", fontFamily: sora, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: C.gray400, fontWeight: 700 }}>Indicator</th>
                <th style={{ textAlign: "right", padding: "12px 8px", fontFamily: sora, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: C.gray400, fontWeight: 700 }}>Acum</th>
                <th style={{ textAlign: "right", padding: "12px 8px", fontFamily: sora, fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", color: C.indigo, fontWeight: 700 }}>Posibil</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.k} style={{ borderTop: i === 0 ? "none" : "1px solid #EEF1F7" }}>
                  <td style={{ textAlign: "left", padding: "12px 8px", color: C.gray600 }}>{row.k}</td>
                  <td style={{ textAlign: "right", padding: "12px 8px", color: C.gray400 }}>{row.now}</td>
                  <td style={{ textAlign: "right", padding: "12px 8px", color: C.indigo, fontWeight: 700 }}>{row.goal}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ padding: "14px 30px 24px", borderTop: "1px solid #EEF1F7", marginTop: 6 }}>
          <p style={{ fontSize: 12.5, color: C.gray400, lineHeight: 1.6, margin: 0 }}>
            {r.assumptions.join(" ")}
          </p>
        </div>
      </div>
    </section>
  );
}

export function ReportRenderer({ data }: { data: AuditData }) {
  const seoSub: Sectiune[] = ["seo", "continut", "keywords", "structura", "schema"];
  const { total, critice } = countAllProblems(data);
  const verdict = data.scor >= VERDICT_GOOD ? "Stai bine, dar mai sunt puncte de castigat." : data.scor >= VERDICT_MID ? "Pierzi clienti din cauza unor probleme reparabile." : "Pierzi clienti zilnic — site-ul are probleme grave de vizibilitate.";

  return (
    <div style={{ fontFamily: inter, background: C.slate, minHeight: "100vh" }}>
      {/* ---------- HERO dark ---------- */}
      <header style={{ background: `radial-gradient(120% 120% at 50% -10%, ${C.navyMid} 0%, ${C.navy} 60%)`, color: C.white }}>
        <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px 56px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: sora, fontWeight: 800, letterSpacing: "0.18em", fontSize: 15, color: C.cyan }}>DEVRIKA</span>
            <span style={{ fontSize: 13, color: C.gray400 }}>{new Date().toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>

          <div style={{ textAlign: "center", marginTop: 40 }}>
            <span style={{ display: "inline-block", fontFamily: sora, fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cyan, background: "rgba(71,73,158,0.45)", border: "1px solid rgba(10,190,207,0.3)", padding: "6px 14px", borderRadius: 999 }}>Audit gratuit · Magazin online</span>
            <h1 style={{ fontFamily: sora, fontSize: 46, fontWeight: 800, margin: "16px 0 8px", letterSpacing: "-0.01em" }}>{data.domain}</h1>
            <p style={{ fontSize: 18, color: "#C7D2E8", margin: 0 }}>Cat de bine te gasesc clientii online — si cat pierzi</p>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}><Gauge scor={data.scor} /></div>
          <p style={{ textAlign: "center", fontFamily: sora, fontSize: 18, fontWeight: 600, color: C.white, margin: "6px 0 0" }}>{verdict}</p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 30 }}>
            <StatPill n={total} label="probleme gasite" color={C.cyan} />
            <StatPill n={critice} label="critice" color="#FF7A6B" />
            <StatPill n={data.pagesAnalyzed} label="pagini analizate" color={C.white} />
          </div>
        </div>
      </header>

      {/* ---------- AVERTISMENT crawl partial ---------- */}
      {data.avertisment && (
        <section style={{ maxWidth: 920, margin: "0 auto", padding: "24px 24px 0" }}>
          <div style={{ background: C.yellowBg, border: `1px solid ${C.yellow}33`, borderLeft: `4px solid ${C.yellow}`, borderRadius: 14, padding: "16px 20px", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18, lineHeight: 1.3 }}>⚠️</span>
            <p style={{ fontSize: 14.5, color: C.gray800, lineHeight: 1.55, margin: 0 }}>{data.avertisment}</p>
          </div>
        </section>
      )}

      {/* ---------- 4 CATEGORII (grijile din funnel) ---------- */}
      <CategoriiSummary data={data} />

      {/* ---------- CE TE COSTA ---------- */}
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 0" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(10,190,207,0.07), rgba(71,73,158,0.07))", border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.cyan}`, borderRadius: 18, padding: "28px 30px" }}>
          <div style={{ fontFamily: sora, fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.indigo, marginBottom: 8 }}>Ce te costa asta</div>
          <div style={{ fontFamily: sora, fontSize: 26, fontWeight: 800, color: C.navy, lineHeight: 1.15, marginBottom: 12 }}>
            {data.scor < VERDICT_MID ? "Pierzi clienti in fiecare zi" : data.scor < VERDICT_GOOD ? "Lasi clienti pe masa" : "Esti aproape — dar concurenta e mai vizibila"}
          </div>
          <p style={{ fontSize: 15.5, color: C.gray600, lineHeight: 1.6, margin: 0 }}>
            {critice > 0
              ? <><b style={{ color: C.gray800 }}>{critice} probleme critice</b> si inca {Math.max(total - critice, 0)} de reglat inseamna </>
              : <><b style={{ color: C.gray800 }}>{total} puncte de reglat</b> inseamna </>}
            ca o parte din oamenii care te cauta pe Google ajung la concurenta in loc sa ajunga la tine. Toate sunt reparabile — iar acelasi trafic iti poate aduce mai multe vanzari, <b style={{ color: C.gray800 }}>fara buget suplimentar de reclama</b>. <span style={{ color: C.gray400, fontStyle: "italic" }}>Estimativ — impactul exact depinde de piata si de executie.</span>
          </p>
        </div>
      </section>

      {/* ---------- RUBRICA 1: TRACKING ---------- */}
      {data.conversie && <TrackingSection data={data} />}

      {/* ---------- RUBRICA 2: SEO ---------- */}
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 12px" }}>
        <RubricHead title="SEO" sub="On-page, continut, cuvinte cheie, structura si date structurate — verificate pe home, categorii si produse." scor={Math.round(sectionAvg(data, seoSub))} />
        {seoSub.map(s => <SectionBlock key={s} sectiune={s} data={data} />)}
      </section>

      {/* ---------- RUBRICA 3: UX / UI ---------- */}
      {data.ux && <UxUiSection data={data} />}

      {/* ---------- RUBRICA 4: GOOGLE ADS ---------- */}
      {(data.googleAds || data.productSignal) && <GoogleAdsSection data={data} />}

      {/* ---------- SIMULARE DE VENIT (din inputurile funnel-ului) ---------- */}
      {data.roiSim && <RoiSimSection data={data} />}

      {/* ---------- DE CE DEVRIKA ---------- */}
      <section style={{ maxWidth: 920, margin: "20px auto 0", padding: "0 24px 0" }}>
        <h2 style={{ fontFamily: sora, fontSize: 28, fontWeight: 800, color: C.navy, margin: "0 0 6px" }}>De ce Devrika</h2>
        <p style={{ color: C.gray500, margin: "0 0 22px", fontSize: 15.5 }}>Nu primesti doar un raport. Primesti echipa care il pune in practica.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[
            { t: "Implementam, nu doar raportam", d: "Reparam noi ce ai vazut aici — nu-ti lasam o lista de teme." },
            { t: "Toate canalele, un singur partener", d: "SEO + Google Ads + Meta, optimizate pe vanzari reale, nu pe vanity metrics." },
            { t: "Specializati pe ecommerce", d: "Zeci de magazine optimizate, pe orice platforma — stim exact ce misca acul." },
          ].map((x, i) => (
            <div key={i} style={{ background: C.white, border: `1px solid ${C.border}`, borderTop: `3px solid ${C.cyan}`, borderRadius: 14, padding: "18px 20px" }}>
              <div style={{ fontFamily: sora, fontWeight: 700, fontSize: 15, color: C.gray800, marginBottom: 6 }}>{x.t}</div>
              <div style={{ fontSize: 13.5, color: C.gray600, lineHeight: 1.5 }}>{x.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section style={{ maxWidth: 920, margin: "28px auto 0", padding: "0 24px 56px" }}>
        <div style={{ borderRadius: 24, overflow: "hidden", background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, color: C.white, padding: "52px 32px", textAlign: "center" }}>
          <h2 style={{ fontFamily: sora, fontSize: 32, fontWeight: 800, margin: "0 0 12px" }}>Hai sa transformam traficul in vanzari</h2>
          <p style={{ fontSize: 18, color: "rgba(255,255,255,0.92)", maxWidth: 640, margin: "0 auto 28px", lineHeight: 1.55 }}>
            Reparam fundatia (site + masurare) si iti gestionam reclamele pe Google si Meta, ca fiecare leu de buget sa aduca vanzari. Prima discutie e gratuita, fara obligatii.
          </p>
          <a href="https://devrika.ro/contact" style={{ display: "inline-block", background: C.white, color: C.indigo, fontFamily: sora, fontWeight: 700, fontSize: 17, padding: "16px 34px", borderRadius: 12, textDecoration: "none", boxShadow: "0 12px 30px rgba(0,0,0,0.18)" }}>
            Vreau o discutie gratuita
          </a>
          <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", marginTop: 26, fontFamily: sora, fontWeight: 600, fontSize: 15.5 }}>
            <a href="tel:+40742374325" style={{ color: C.white, textDecoration: "none" }}>Razvan · 0742 374 325</a>
            <a href="tel:+40756281176" style={{ color: C.white, textDecoration: "none" }}>Vlad · 0756 281 176</a>
            <a href="mailto:hello@devrika.ro" style={{ color: C.white, textDecoration: "none" }}>hello@devrika.ro</a>
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 13, color: C.gray400, marginTop: 22 }}>Raport generat automat de Devrika · audit.devrika.ro</p>
      </section>
    </div>
  );
}
