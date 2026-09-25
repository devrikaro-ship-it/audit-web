"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fill, PROGRESS, PROGRESS_STEPS, WORD } from "@/lib/copy-registry";
import type { ProgressStep } from "@/lib/types";

// The waiting screen shows the audit's real steps as the engine runs them, each with what it measured (spec
// 2026-09-25 §6). It replaced fixed sentences rotating every 3.5 s, unrelated to what the engine was doing.

function DevrikaLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 93 88" fill="none">
      <defs>
        <linearGradient id="dv1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0ABECF" />
          <stop offset="100%" stopColor="#47499E" />
        </linearGradient>
        <linearGradient id="dv2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#47499E" />
          <stop offset="100%" stopColor="#0ABECF" />
        </linearGradient>
      </defs>
      <ellipse cx="35" cy="44" rx="35" ry="35" fill="url(#dv1)" opacity="0.9" />
      <ellipse cx="58" cy="44" rx="35" ry="35" fill="url(#dv2)" opacity="0.7" />
      <circle cx="46.5" cy="44" r="5" fill="#fff" opacity="0.9" />
    </svg>
  );
}

const MARK: Record<ProgressStep["state"] | "waiting", { icon: string; color: string }> = {
  waiting: { icon: "○", color: "#cbd5e1" },
  running: { icon: "◌", color: "#47499E" },
  done: { icon: "✓", color: "#16a34a" },
  unmeasured: { icon: "?", color: "#b45309" },
};

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!id) return;
    const poll = setInterval(async () => {
      try {
        const json = await (await fetch(`/api/audit?id=${id}`)).json();
        if (Array.isArray(json.steps)) setSteps(json.steps);
        if (json.status === "done") { clearInterval(poll); router.push(`/r/${id}`); }
        else if (json.status === "error") { clearInterval(poll); router.push(`/r/${id}?error=1`); }
      } catch { /* keep polling */ }
    }, 1500);
    return () => clearInterval(poll);
  }, [id, router]);

  const byId = new Map(steps.map((s) => [s.id, s]));
  const finished = PROGRESS_STEPS.filter((s) => { const st = byId.get(s.id)?.state; return st === "done" || st === "unmeasured"; }).length;
  const current = Math.min(PROGRESS_STEPS.length, finished + 1);
  const pct = Math.round((finished / PROGRESS_STEPS.length) * 100);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(135deg,#f0f4ff 0%,#e8f0fe 40%,#f0fafa 100%)" }}>
      <div className="w-full max-w-md space-y-7">
        <div className="flex items-center justify-center gap-3">
          <DevrikaLogo />
          <span className="text-xl font-extrabold" style={{ color: "#1e1b4b" }}>Devrika</span>
        </div>

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-extrabold" style={{ color: "#0f172a" }}>{PROGRESS.title}</h1>
          <p className="text-sm" style={{ color: "#64748b" }}>
            {fill(PROGRESS.stepOf, { i: current, n: PROGRESS_STEPS.length })} · {fill(PROGRESS.elapsed, { s: Math.round((now - startedAt) / 1000) })}
          </p>
        </div>

        <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#e2e8f0" }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#47499E,#0ABECF)" }} />
        </div>

        <ol className="rounded-2xl bg-white shadow-sm border divide-y" style={{ borderColor: "#e2e8f0" }}>
          {PROGRESS_STEPS.map((s) => {
            const st = byId.get(s.id);
            const mark = MARK[st?.state ?? "waiting"];
            return (
              <li key={s.id} className="flex items-start gap-3 px-4 py-3" data-step={s.id} data-state={st?.state ?? "waiting"}>
                <span className={`mt-0.5 w-5 text-center font-bold ${st?.state === "running" ? "animate-pulse" : ""}`} style={{ color: mark.color }}>{mark.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold" style={{ color: st ? "#0f172a" : "#94a3b8" }}>{s.label}</span>
                  {st?.result && <span className="block text-xs mt-0.5" style={{ color: st.state === "unmeasured" ? "#b45309" : "#475569" }}>{st.state === "unmeasured" ? WORD.verify : st.result}</span>}
                </span>
              </li>
            );
          })}
        </ol>

        <p className="text-xs text-center" style={{ color: "#94a3b8" }}>{PROGRESS.note}</p>
      </div>
    </div>
  );
}
