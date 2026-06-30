"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const STEPS = [
  "Verific robots.txt si sitemap...",
  "Colectez paginile de analizat...",
  "Analizez titluri, meta si headings...",
  "Verific schema markup si Open Graph...",
  "Masor viteza cu PageSpeed API...",
  "Calculez scorul final...",
];

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

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [dots, setDots] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);

  // Rotate dots
  useEffect(() => {
    const t = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 500);
    return () => clearInterval(t);
  }, []);

  // Rotate steps
  useEffect(() => {
    const t = setInterval(() => setStepIndex(i => (i + 1) % STEPS.length), 3500);
    return () => clearInterval(t);
  }, []);

  // Elapsed counter
  useEffect(() => {
    const t = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll for completion
  useEffect(() => {
    if (!id) return;
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/audit?id=${id}`);
        const json = await res.json();
        if (json.status === "done") {
          clearInterval(poll);
          router.push(`/r/${id}`);
        } else if (json.status === "error") {
          clearInterval(poll);
          router.push(`/r/${id}?error=1`);
        }
      } catch { /* continue polling */ }
    }, 2500);
    return () => clearInterval(poll);
  }, [id, router]);

  const pct = Math.min(95, Math.round((elapsedSec / 90) * 100));

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg,#f0f4ff 0%,#e8f0fe 40%,#f0fafa 100%)" }}
    >
      <div className="w-full max-w-md text-center space-y-10">

        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <DevrikaLogo />
          <span className="text-xl font-extrabold" style={{ color: "#1e1b4b" }}>Devrika</span>
        </div>

        {/* Spinner */}
        <div className="relative mx-auto" style={{ width: 96, height: 96 }}>
          <svg viewBox="0 0 100 100" width={96} height={96} className="animate-spin" style={{ animationDuration: "1.4s" }}>
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(71,73,158,0.1)" strokeWidth="8" />
            <circle cx="50" cy="50" r="44" fill="none"
              stroke="url(#spinGrad)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray="138 138" strokeDashoffset="34"
              style={{ transformOrigin: "50% 50%", transform: "rotate(-90deg)" }} />
            <defs>
              <linearGradient id="spinGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#47499E" />
                <stop offset="100%" stopColor="#0ABECF" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold" style={{ color: "#47499E" }}>{pct}%</span>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold" style={{ color: "#0f172a" }}>
            Analizam site-ul tau{dots}
          </h1>
          <p className="text-sm" style={{ color: "#64748b" }}>
            {STEPS[stepIndex]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="rounded-full overflow-hidden" style={{ height: 6, background: "#e2e8f0" }}>
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg,#47499E,#0ABECF)" }}
          />
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: "🔍", label: "SEO Tehnic", done: elapsedSec > 15 },
            { icon: "⚡", label: "Viteza", done: elapsedSec > 45 },
            { icon: "📝", label: "Continut", done: elapsedSec > 30 },
          ].map(item => (
            <div key={item.label}
              className="rounded-xl px-3 py-3 text-center border transition-all"
              style={{
                background: item.done ? "#f0fdf4" : "white",
                borderColor: item.done ? "#86efac" : "#e2e8f0",
              }}>
              <div className="text-lg mb-1">{item.icon}</div>
              <div className="text-xs font-medium" style={{ color: item.done ? "#16a34a" : "#64748b" }}>
                {item.done ? "✓ Gata" : item.label}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ color: "#94a3b8" }}>
          Auditul dureaza in medie 60-90 secunde. Nu inchide aceasta fereastra.
        </p>
      </div>
    </div>
  );
}
