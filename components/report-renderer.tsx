"use client";

import { CHECKS, SECTIUNI_CONFIG, CHECK_TO_PROBLEM, PROBLEMS, type StatusCheck, type Sectiune } from "@/lib/problems-db";
import type { AuditData, CheckResult, PageCheck, MoneyLeak } from "@/lib/types";

export type { AuditData };

/* ---------- paleta (identica cu PDF-ul Devrika) ---------- */
const C = {
  navy: "#13163A", navyMid: "#23265F", indigo: "#47499E", cyan: "#0ABECF",
  white: "#FFFFFF",
  red: "#C0392B", redBg: "#FEF2F2", orange: "#D45B00", orangeBg: "#FFF4E6",
  yellow: "#B45309", yellowBg: "#FFFBEB", green: "#1A7A4A", greenBg: "#F0FFF4",
  gray400: "#8FA3C0", gray500: "#64748b", gray600: "#4A5E7A", gray800: "#1E2D42",
  slate: "#F4F6FB",
};
const sora = "var(--font-sora), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

function scoreColor(s: number) { return s >= 70 ? C.green : s >= 40 ? C.orange : C.red; }
function statusScore(s: StatusCheck) { return s === "ok" ? 100 : s === "atentie" ? 55 : 10; }
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
      const status: StatusCheck = sc >= 70 ? "ok" : sc >= 40 ? "atentie" : "critic";
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

function topFindings(data: AuditData, n: number): Finding[] {
  const sectiuni: Sectiune[] = ["viteza", "seo", "continut", "keywords", "structura", "schema", "social", "securitate"];
  const all = sectiuni.flatMap(s => splitSection(s, data).problems);
  all.sort((a, b) => (a.status === b.status ? a.rank - b.rank : a.status === "critic" ? -1 : 1));
  return all.slice(0, n);
}

function countAllProblems(data: AuditData): { total: number; critice: number } {
  const sectiuni: Sectiune[] = ["viteza", "seo", "continut", "keywords", "structura", "schema", "social", "securitate"];
  const all = sectiuni.flatMap(s => splitSection(s, data).problems);
  return { total: all.length, critice: all.filter(f => f.status === "critic").length };
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
    <div style={{ background: C.white, border: "1px solid #E6EBF4", borderRadius: 16, padding: "22px 26px", boxShadow: "0 6px 24px rgba(19,22,58,0.05)", display: "flex", gap: 18 }}>
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
    <div style={{ background: C.white, border: "1px solid #E6EBF4", borderLeft: `4px solid ${fg}`, borderRadius: 14, padding: "18px 22px", boxShadow: "0 6px 24px rgba(19,22,58,0.05)" }}>
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

function ConversieSection({ c }: { c: import("@/lib/types").ConversieAudit }) {
  const zone: import("@/lib/types").ConvZona[] = ["Tracking & PPC", "Incredere", "Functii magazin", "UX & Mobil", "Cos & checkout"];
  const gaps = c.leaks.filter(l => l.present !== "da");
  const have = c.leaks.filter(l => l.present === "da");
  const ppcColor = c.scorPpc >= 70 ? C.green : c.scorPpc >= 40 ? C.orange : C.red;
  return (
    <section style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 12px" }}>
      <h2 style={{ fontFamily: sora, fontSize: 28, fontWeight: 800, color: C.navy, margin: "0 0 6px" }}>Bani pierduti din site si reclame</h2>
      <p style={{ color: C.gray500, margin: "0 0 22px", fontSize: 15.5 }}>Fiecare vizitator — mai ales cel platit din reclame — care nu cumpara e buget aruncat. Uite unde se scurg banii.</p>

      {/* banner pregatire PPC */}
      <div style={{ background: `radial-gradient(120% 140% at 0% 0%, ${C.navyMid} 0%, ${C.navy} 70%)`, color: C.white, borderRadius: 18, padding: "22px 26px", display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", marginBottom: 26 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: sora, fontSize: 40, fontWeight: 800, color: ppcColor, lineHeight: 1 }}>{c.scorPpc}<span style={{ fontSize: 18, color: C.gray400 }}>/100</span></div>
          <div style={{ fontSize: 11.5, color: C.gray400, marginTop: 4, letterSpacing: "0.04em" }}>pregatire pentru reclame</div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontFamily: sora, fontWeight: 700, fontSize: 17, marginBottom: 4 }}>
            {c.ruleazaReclame === "da" ? "Rulezi reclame — dar pe o fundatie care pierde bani" : "Inca nu rulezi reclame — iar fundatia nu e pregatita"}
          </div>
          <p style={{ fontSize: 14, color: "#C7D2E8", lineHeight: 1.5, margin: 0 }}>
            {c.ruleazaReclame === "da"
              ? "Cheltui pe reclame, dar lipsurile de mai jos fac ca o parte din buget sa se duca pe vizitatori care nu cumpara. Reparam fundatia si gestionam campaniile ca fiecare leu sa aduca vanzari."
              : "Inainte sa pui bani in reclame, site-ul trebuie sa converteasca si sa masoare. Altfel platesti trafic care pleaca. Construim fundatia si pornim campaniile corect."}
          </p>
        </div>
      </div>

      {zone.map(z => {
        const items = gaps.filter(l => l.zona === z);
        if (!items.length) return null;
        return (
          <div key={z} style={{ marginBottom: 26 }}>
            <h3 style={{ fontFamily: sora, fontSize: 18, fontWeight: 800, color: C.navy, margin: "0 0 12px" }}>{z}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map(l => <LeakCard key={l.id} l={l} />)}
            </div>
          </div>
        );
      })}

      {have.length > 0 && (
        <div style={{ marginTop: 4 }}>
          <h3 style={{ fontFamily: sora, fontSize: 15, fontWeight: 700, color: C.gray600, margin: "0 0 10px" }}>Ai deja, bine ca stam pe asta:</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {have.map(l => (
              <span key={l.id} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: C.greenBg, border: "1px solid #D6EFE0", borderRadius: 10, padding: "8px 13px", fontSize: 13.5, color: C.gray800 }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
                <span style={{ fontWeight: 600 }}>{l.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ============================ RAPORT ============================ */
export function ReportRenderer({ data }: { data: AuditData }) {
  const sectiuni: Sectiune[] = ["viteza", "seo", "continut", "keywords", "structura", "schema", "social", "securitate"];
  const top = topFindings(data, 5);
  const { total, critice } = countAllProblems(data);
  const verdict = data.scor >= 70 ? "Stai bine, dar mai sunt puncte de castigat." : data.scor >= 40 ? "Pierzi clienti din cauza unor probleme reparabile." : "Pierzi clienti zilnic — site-ul are probleme grave de vizibilitate.";

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
            <span style={{ display: "inline-block", fontFamily: sora, fontWeight: 700, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: C.cyan, background: "rgba(71,73,158,0.45)", border: "1px solid rgba(10,190,207,0.3)", padding: "6px 14px", borderRadius: 999 }}>Audit gratuit · SEO</span>
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

      {/* ---------- CE TE COSTA ---------- */}
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 0" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(10,190,207,0.07), rgba(71,73,158,0.07))", border: "1px solid #E6EBF4", borderLeft: `4px solid ${C.cyan}`, borderRadius: 18, padding: "28px 30px" }}>
          <div style={{ fontFamily: sora, fontSize: 13, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: C.indigo, marginBottom: 8 }}>Ce te costa asta</div>
          <div style={{ fontFamily: sora, fontSize: 26, fontWeight: 800, color: C.navy, lineHeight: 1.15, marginBottom: 12 }}>
            {data.scor < 40 ? "Pierzi clienti in fiecare zi" : data.scor < 70 ? "Lasi clienti pe masa" : "Esti aproape — dar concurenta e mai vizibila"}
          </div>
          <p style={{ fontSize: 15.5, color: C.gray600, lineHeight: 1.6, margin: 0 }}>
            {critice > 0
              ? <><b style={{ color: C.gray800 }}>{critice} probleme critice</b> si inca {Math.max(total - critice, 0)} de reglat inseamna </>
              : <><b style={{ color: C.gray800 }}>{total} puncte de reglat</b> inseamna </>}
            ca o parte din oamenii care te cauta pe Google ajung la concurenta in loc sa ajunga la tine. Toate sunt reparabile — iar acelasi trafic iti poate aduce mai multe vanzari, <b style={{ color: C.gray800 }}>fara buget suplimentar de reclama</b>. <span style={{ color: C.gray400, fontStyle: "italic" }}>Estimativ — impactul exact depinde de piata si de executie.</span>
          </p>
        </div>
      </section>

      {/* ---------- BANI PIERDUTI / PPC ---------- */}
      {data.conversie && <ConversieSection c={data.conversie} />}

      {/* ---------- TOP PROBLEME ---------- */}
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 12px" }}>
        <h2 style={{ fontFamily: sora, fontSize: 28, fontWeight: 800, color: C.navy, margin: "0 0 6px" }}>Ce te tine pe loc in Google</h2>
        <p style={{ color: C.gray500, margin: "0 0 26px", fontSize: 15.5 }}>Cele mai importante {top.length} probleme, in ordinea impactului asupra clientilor tai.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {top.map((f, i) => <FindingCard key={i} f={f} index={i} showArea />)}
        </div>
      </section>

      {/* ---------- DETALIU PE SECTIUNI (acelasi format) ---------- */}
      <section style={{ maxWidth: 920, margin: "0 auto", padding: "44px 24px 12px" }}>
        <h2 style={{ fontFamily: sora, fontSize: 28, fontWeight: 800, color: C.navy, margin: "0 0 6px" }}>Raportul complet</h2>
        <p style={{ color: C.gray500, margin: "0 0 30px", fontSize: 15.5 }}>Toate verificarile pe cele 8 zone, grupate. Problemele cu detalii, restul marcate ca rezolvate.</p>
        {sectiuni.map(s => <SectionBlock key={s} sectiune={s} data={data} />)}
      </section>

      {/* ---------- DE CE DEVRIKA ---------- */}
      <section style={{ maxWidth: 920, margin: "20px auto 0", padding: "0 24px 0" }}>
        <h2 style={{ fontFamily: sora, fontSize: 28, fontWeight: 800, color: C.navy, margin: "0 0 6px" }}>De ce Devrika</h2>
        <p style={{ color: C.gray500, margin: "0 0 22px", fontSize: 15.5 }}>Nu primesti doar un raport. Primesti echipa care il pune in practica.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[
            { t: "Implementam, nu doar raportam", d: "Reparam noi ce ai vazut aici — nu-ti lasam o lista de teme." },
            { t: "Toate canalele, un singur partener", d: "SEO + Google Ads + Meta, optimizate pe vanzari reale, nu pe vanity metrics." },
            { t: "Specializati pe ecommerce & WordPress", d: "Zeci de magazine optimizate — stim exact ce misca acul." },
          ].map((x, i) => (
            <div key={i} style={{ background: C.white, border: "1px solid #E6EBF4", borderTop: `3px solid ${C.cyan}`, borderRadius: 14, padding: "18px 20px" }}>
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
