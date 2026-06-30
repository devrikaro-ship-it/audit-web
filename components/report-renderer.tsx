"use client";

import { useState } from "react";
import { CHECKS, SECTIUNI_CONFIG, CHECK_TO_PROBLEM, PROBLEMS, type StatusCheck, type Sectiune } from "@/lib/problems-db";
import type { AuditData, CheckResult, PageCheck } from "@/lib/types";

export type { AuditData };

function statusCfg(s: StatusCheck) {
  if (s === "ok")      return { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-600",  score: 100 };
  if (s === "atentie") return { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-600", score: 55  };
  return                      { bg: "bg-red-50",    border: "border-red-200",    text: "text-red-600",    score: 10  };
}

function scoreColor(s: number) {
  if (s >= 70) return "#22c55e";
  if (s >= 40) return "#f59e0b";
  return "#ef4444";
}

function sectionScoreFromChecks(checksRezultate: Record<string, CheckResult>, sectiune: Sectiune) {
  const keys = Object.entries(CHECKS).filter(([, c]) => c.sectiune === sectiune).map(([k]) => k);
  const scores = keys.map(k => statusCfg(checksRezultate[k]?.status ?? "ok").score);
  return Math.round(scores.reduce((a, b) => a + b, 0) / (scores.length || 1));
}

function pageSectionScore(checks: PageCheck[]) {
  const scores = checks.map(c => Math.round((c.correctCount / Math.max(c.total, 1)) * 100));
  return Math.round(scores.reduce((a, b) => a + b, 0) / (checks.length || 1));
}

function SectionIcon({ icon }: { icon: string }) {
  const p = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (icon === "zap")          return <svg {...p}><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" /></svg>;
  if (icon === "search")       return <svg {...p}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>;
  if (icon === "file-text")    return <svg {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>;
  if (icon === "link")         return <svg {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
  if (icon === "code")         return <svg {...p}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
  if (icon === "share")        return <svg {...p}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>;
  if (icon === "shield")       return <svg {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></svg>;
  if (icon === "trending-up")  return <svg {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
  return null;
}

function CheckIcon({ status }: { status: StatusCheck }) {
  const cfg = statusCfg(status);
  if (status === "ok") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cfg.text}>
      <circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
  if (status === "atentie") return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cfg.text}>
      <circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cfg.text}>
      <circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" />
    </svg>
  );
}

function ScorCircle({ scor }: { scor: number }) {
  const r = 46;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(scor);
  const label = scor >= 70 ? "Performanta buna!" : scor >= 40 ? "Are probleme SEO" : "Probleme critice!";
  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative inline-block">
        <svg viewBox="0 0 100 100" width="240" height="240" fill="none">
          <circle cx="50" cy="50" r={r} stroke="rgba(200,200,200,0.2)" strokeWidth="8"
            style={{ transformOrigin: "50% 50%", transform: "rotate(-90deg)" }} />
          <circle cx="50" cy="50" r={r} stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${(scor / 100) * circ} ${circ}`}
            style={{ transformOrigin: "50% 50%", transform: "rotate(-90deg)" }} />
          <text x="50" y="50" textAnchor="middle" dominantBaseline="middle"
            fill="currentColor" fontSize="30" fontWeight="700">{scor}</text>
        </svg>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-gray-900">Scor General SEO</h2>
        <p className="text-gray-600">{label}</p>
      </div>
    </div>
  );
}

function CheckItem({ checkId, result }: { checkId: string; result: CheckResult }) {
  const [open, setOpen] = useState(false);
  const check = CHECKS[checkId];
  const cfg = statusCfg(result.status);
  const problemId = CHECK_TO_PROBLEM[checkId]?.[result.status];
  const problem = problemId ? PROBLEMS[problemId] : null;
  const canOpen = result.status !== "ok" && !!problem;

  return (
    <div
      className={`rounded-lg border-2 ${cfg.text} ${cfg.bg} ${cfg.border} ${canOpen ? "cursor-pointer" : ""}`}
      onClick={() => canOpen && setOpen(o => !o)}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3 flex-1">
          <CheckIcon status={result.status} />
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{check?.label ?? checkId}</p>
            <p className="text-sm text-gray-600 mt-1">{result.value}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-bold text-sm text-gray-700">{cfg.score}</span>
          {canOpen && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </div>
      {open && problem && (
        <div className="px-4 pb-4 border-t border-current/10">
          <div className="pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Problema</p>
            <p className="text-sm text-gray-700 mt-1">{problem.problema}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3">Ce trebuie facut</p>
            <p className="text-sm text-gray-700 mt-1">{problem.fix}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PageCheckItem({ check }: { check: PageCheck }) {
  const [open, setOpen] = useState(false);
  const score = Math.round((check.correctCount / Math.max(check.total, 1)) * 100);
  const status: StatusCheck = score >= 70 ? "ok" : score >= 40 ? "atentie" : "critic";
  const cfg = statusCfg(status);
  const canOpen = status !== "ok";

  return (
    <div
      className={`rounded-lg border-2 ${cfg.bg} ${cfg.border} ${canOpen ? "cursor-pointer" : ""}`}
      onClick={() => canOpen && setOpen(o => !o)}
    >
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3 flex-1">
          <CheckIcon status={status} />
          <div className="flex-1">
            <p className="font-semibold text-gray-900">{check.label}</p>
            <p className="text-sm text-gray-500 mt-1">{check.correctCount} din {check.total} {check.unit ?? "pagini"} OK</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`font-bold text-sm ${cfg.text}`}>{score}</span>
          {canOpen && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-current/10">
          <div className="pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Problema</p>
            <p className="text-sm text-gray-700 mt-1">{check.problema}</p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3">Ce trebuie facut</p>
            <p className="text-sm text-gray-700 mt-1">{check.fix}</p>
          </div>
        </div>
      )}
    </div>
  );
}

type PageBasedSectiune = "seo" | "continut" | "keywords" | "structura";

function SectionCard({ sectiune, data }: { sectiune: Sectiune; data: AuditData }) {
  const cfg = SECTIUNI_CONFIG[sectiune];
  const PAGE_BASED: Record<PageBasedSectiune, PageCheck[]> = {
    seo:      data.seoChecks,
    continut: data.continutChecks,
    keywords: data.keywordsChecks,
    structura: data.structuraChecks,
  };
  const pageChecks = PAGE_BASED[sectiune as PageBasedSectiune] ?? null;
  const checkIds = Object.entries(CHECKS).filter(([, c]) => c.sectiune === sectiune).map(([k]) => k);
  const scor = pageChecks
    ? pageSectionScore(pageChecks)
    : sectionScoreFromChecks(data.checksRezultate, sectiune);
  const color = scoreColor(scor);

  return (
    <div className="bg-white rounded-xl shadow-xl border-0 flex flex-col py-6 h-full">
      <div className="px-6 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-[#47499E] to-[#0ABECF]">
            <SectionIcon icon={cfg.icon} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{cfg.label}</h3>
            <p className="text-xs text-gray-400">{cfg.importantaLabel}</p>
            {pageChecks && (
              <p className="text-xs text-gray-400">
                {sectiune === "keywords"
                  ? `Top ${data.pagesAnalyzed} kw analizate`
                  : `${data.pagesAnalyzed} pagini analizate`}
              </p>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="text-3xl font-extrabold" style={{ color }}>{scor}</span>
          <p className="text-xs text-gray-400">/ 100</p>
        </div>
      </div>
      <div className="px-6 space-y-3">
        {pageChecks
          ? pageChecks.map(c => <PageCheckItem key={c.id} check={c} />)
          : checkIds.map(id => (
            <CheckItem key={id} checkId={id} result={data.checksRezultate[id] ?? { status: "ok", value: "—" }} />
          ))
        }
      </div>
    </div>
  );
}

export function ReportRenderer({ data }: { data: AuditData }) {
  const sectiuni: Sectiune[] = ["viteza", "seo", "continut", "keywords", "structura", "schema", "social", "securitate"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-12">

        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-[#47499E] to-[#0ABECF] bg-clip-text text-transparent">
            Raport Audit SEO
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {data.domain} &mdash; {new Date().toLocaleDateString("ro-RO")}
          </p>
          <p className="text-sm text-gray-400">{data.pagesAnalyzed} pagini analizate</p>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-xl shadow-2xl border-0">
          <div className="px-6 pt-12 pb-12">
            <div className="flex flex-col items-center">
              <ScorCircle scor={data.scor} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sectiuni.map(s => <SectionCard key={s} sectiune={s} data={data} />)}
        </div>

        <div className="rounded-xl shadow-2xl border-0 bg-gradient-to-br from-[#47499E] to-[#0ABECF] text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-30"
            style={{ backgroundImage: "url(\"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItaDJ2LTJoLTJ6bTAgNHYyaDJ2LTJoLTJ6bS0yIDJ2Mmgydi0yaC0yem0wLTR2Mmgydi0yaC0yem0yLTJ2LTJoLTJ2Mmgyem0wLTR2LTJoLTJ2Mmgyem0yIDJ2LTJoLTJ2Mmgyem0wIDR2LTJoLTJ2Mmgyem0yLTJ2Mmgydi0yaC0yem0wLTR2Mmgydi0yaC0yem0tMiAydi0yaC0ydjJoMnptMC00di0yaC0ydjJoMnptMiAydi0yaC0ydjJoMnoiLz48L2c+PC9nPjwvc3ZnPg==\")" }} />
          <div className="px-6 pt-12 pb-12 relative z-10">
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
              </svg>
              <h2 className="text-4xl font-bold">Gata sa imbunatatesti SEO-ul?</h2>
              <p className="text-xl text-white/90">
                Implementeaza recomandarile din acest raport si urmareste cresterea traficului organic. Echipa Devrika te poate ajuta.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <a href="https://devrika.ro/contact" className="bg-white text-[#47499E] hover:bg-white/90 font-semibold text-lg px-8 py-4 rounded-md shadow-xl inline-flex items-center justify-center transition-colors">
                  Solicita Consultanta Gratuita
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-gray-400 pb-4">
          Raport generat automat de Devrika &bull; audit.devrika.ro
        </p>
      </div>
    </div>
  );
}
