"use client";

import React, { useEffect, useState } from "react";
import type { AuditRequestBody } from "@/lib/audit-request";
import { SITE_KIND } from "@/lib/copy-registry";
import { withCountryCode } from "@/lib/phone";

const TARI = [
  { code: "+40", flag: "🇷🇴", name: "Romania" },
  { code: "+1",  flag: "🇺🇸", name: "USA / Canada" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
  { code: "+49", flag: "🇩🇪", name: "Germania" },
  { code: "+33", flag: "🇫🇷", name: "Franta" },
  { code: "+39", flag: "🇮🇹", name: "Italia" },
  { code: "+34", flag: "🇪🇸", name: "Spania" },
  { code: "+31", flag: "🇳🇱", name: "Olanda" },
  { code: "+43", flag: "🇦🇹", name: "Austria" },
  { code: "+32", flag: "🇧🇪", name: "Belgia" },
  { code: "+41", flag: "🇨🇭", name: "Elvetia" },
  { code: "+380", flag: "🇺🇦", name: "Ucraina" },
  { code: "+373", flag: "🇲🇩", name: "Moldova" },
  { code: "+359", flag: "🇧🇬", name: "Bulgaria" },
  { code: "other", flag: "🌍", name: "Alta tara" },
];

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
function isValidPhone(v: string) {
  return /^[0-9\s\-]{6,15}$/.test(v.trim());
}

const TOTAL_STEPS = 2;
const PROBLEME = [
  { label: "Am trafic, dar putine vanzari", sub: "Multi vizitatori, putini cumparatori" },
  { label: "Nu apar organic in Google", sub: "Vizibilitate SEO slaba pe cautarile tale" },
  { label: "Nu apar in cautarile AI", sub: "Lipsesti din ChatGPT / AI Overviews (LLM / GEO)" },
  { label: "Site-ul se incarca greu", sub: "Mai ales pe telefon" },
  { label: "Nu stiu care e problema", sub: "Vreau imaginea completa a magazinului" },
];


function DevrikaLogo() {
  return (
    <svg width="28" height="28" viewBox="0 0 93 88" fill="none">
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

function ProgressDots({ current }: { current: number }) {
  return (
    <div className="flex flex-col items-center gap-2 mb-8">
      <div className="flex gap-2">
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <div key={i} className="h-2 rounded-full transition-all duration-300"
            style={{ width: i === current - 1 ? 28 : 8, background: i < current ? "linear-gradient(135deg,#47499E,#0ABECF)" : "#e2e8f0" }} />
        ))}
      </div>
      <span className="text-xs text-gray-400">Pasul {current} din {TOTAL_STEPS}</span>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6">
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Inapoi
    </button>
  );
}

function PrimaryButton({ children, onClick, disabled = false }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="w-full py-4 rounded-xl text-white font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
      style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>
      {children}
    </button>
  );
}


type SiteKind = "ecom" | "leads";
type ScanResult = { origin: string; reachable: boolean; platform: string | null; isEcom: boolean | null; siteKind?: SiteKind | null };

// The kind of site the scan read, with "Schimba": a visitor who knows better corrects it, and the audit restarts
// with the corrected kind.
function ScanCard({ scan, kind, onKind }: { scan: ScanResult; kind: SiteKind | null; onKind: (k: SiteKind) => void }) {
  const row = (label: string, val: React.ReactNode) => (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: "#f1f5f9" }}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{val}</span>
    </div>
  );
  return (
    <div className="rounded-xl border p-5 mb-6" style={{ borderColor: "#e2e8f0", background: "#fafbff" }}>
      {row("Platforma", scan.platform ?? "o detectam in analiza")}
      {row("Tip site", kind ? (
        <span className="flex items-center gap-2">{SITE_KIND[kind]}
          <button type="button" onClick={() => onKind(kind === "ecom" ? "leads" : "ecom")} className="text-xs font-semibold underline" style={{ color: "#47499E" }}>Schimba</button>
        </span>
      ) : (
        <span className="flex items-center gap-2">
          {(["ecom", "leads"] as const).map((k) => (
            <button key={k} type="button" onClick={() => onKind(k)} className="text-xs font-semibold underline" style={{ color: "#47499E" }}>{SITE_KIND[k]}</button>
          ))}
        </span>
      ))}
      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        E doar o privire rapida. In analiza completa citim paginile care vand — categorii si produse — si verificam cum te gaseste Google si cat de usor cumpara un vizitator.
      </p>
    </div>
  );
}

export default function StartPage() {
  type Screen = "url" | "scan" | "found" | "q";
  const [screen, setScreen] = useState<Screen>("url");
  const [qstep, setQstep] = useState(1);

  const [url, setUrl] = useState("");
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [kind, setKind] = useState<SiteKind | null>(null);

  const [probleme, setProbleme] = useState<string[]>([]);

  const [nume, setNume] = useState("");
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [telefon, setTelefon] = useState("");
  const [telefonTouched, setTelefonTouched] = useState(false);
  const [prefix, setPrefix] = useState("+40");
  const [prefixCustom, setPrefixCustom] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // The landing's scan form sends ?url=; start the scan with it so the visitor does not type it twice.
  useEffect(() => {
    const fromLanding = new URLSearchParams(window.location.search).get("url")?.trim();
    if (fromLanding) void startScan(fromLanding);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // URL -> porneste scanul rapid SI auditul complet in fundal (spec §11.2)
  async function startScan(target: string = url) {
    const url = target;
    if (!url.trim()) return;
    setUrl(url);
    setScreen("scan");
    // auditul complet ruleaza cat timp userul raspunde la intrebari
    fetch("/api/audit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "start", url, tipBusiness: "magazin" } satisfies AuditRequestBody),
    }).then((r) => r.json()).then((d) => { if (d?.id) setJobId(d.id); }).catch(() => {});
    // scanul rapid -> cardul "uite ce am gasit"
    try {
      const res = await fetch("/api/scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setScan(data as ScanResult);
      setKind((data as ScanResult).siteKind ?? null);
    } catch {
      setScan({ origin: url, reachable: false, platform: null, isEcom: null });
    }
    setScreen("found");
  }

  // The visitor corrects the kind: the audit restarts with it and replaces the run already going.
  function chooseKind(k: SiteKind) {
    setKind(k);
    fetch("/api/audit", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phase: "start", url, tipBusiness: "magazin", siteKind: k, ...(jobId ? { replaces: jobId } : {}) } satisfies AuditRequestBody),
    }).then((r) => r.json()).then((d) => { if (d?.id) setJobId(d.id); }).catch(() => {});
  }

  function qNext() { setQstep((s) => Math.min(s + 1, TOTAL_STEPS)); }
  function qBack() {
    if (qstep === 1) { setScreen("found"); return; }
    setQstep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const telefonComplet = withCountryCode(prefix === "other" ? prefixCustom : prefix, telefon);
    try {
      let id = jobId;
      if (id) {
        await fetch("/api/audit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "finalize", id, nume, email, telefon: telefonComplet, probleme } satisfies AuditRequestBody),
        });
      } else {
        // fallback: auditul nu s-a pornit la scan -> submit intr-un pas
        const res = await fetch("/api/audit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, tipBusiness: "magazin", platforma: scan?.platform ?? undefined, ...(kind ? { siteKind: kind } : {}), nume, email, telefon: telefonComplet, probleme } satisfies AuditRequestBody),
        });
        id = (await res.json())?.id;
      }
      window.location.href = `/processing/${id}`;
    } catch {
      setSubmitting(false);
      alert("A aparut o eroare. Te rog incearca din nou.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(135deg,#f0f4ff 0%,#e8f0fe 30%,#f0fafa 70%,#e8fffe 100%)" }}>
      <header className="fixed top-0 left-0 right-0 px-8 py-4 flex items-center gap-2.5 z-10"
        style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)" }}>
        <DevrikaLogo />
        <span className="text-base font-extrabold" style={{ color: "#1e1b4b" }}>Devrika</span>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-12">
        {screen === "q" && <ProgressDots current={qstep} />}

        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

          {/* URL */}
          {screen === "url" && (
            <div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">Adresa magazinului tau</h1>
              <p className="text-sm text-gray-400 mb-6">O scanam pe loc si iti aratam ce gasim. Fara cont, fara card.</p>
              <div className="relative mb-6">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                  </svg>
                </span>
                <input
                  type="url" placeholder="ex: magazinul-tau.ro" value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void startScan(); }}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#47499E] transition-colors"
                />
              </div>
              <PrimaryButton onClick={() => void startScan()} disabled={!url.trim()}>Scaneaza magazinul →</PrimaryButton>
            </div>
          )}

          {/* SCANNING */}
          {screen === "scan" && (
            <div className="text-center py-6">
              <div className="mx-auto mb-6 h-14 w-14 rounded-full border-4 animate-spin"
                style={{ borderColor: "#e2e8f0", borderTopColor: "#47499E" }} />
              <h1 className="text-xl font-black text-gray-900 mb-1">Scanam magazinul tau...</h1>
              <p className="text-sm text-gray-400">Ne uitam la platforma si la structura. Dureaza cateva secunde.</p>
            </div>
          )}

          {/* FOUND */}
          {screen === "found" && scan && (
            <div>
              <div className="inline-flex items-center gap-1.5 mb-3 px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{ background: "#ecfdf5", color: "#047857" }}>
                <span>✓</span> Analiza a pornit
              </div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">Uite ce am gasit</h1>
              <p className="text-sm text-gray-400 mb-5">Analizam magazinul in fundal chiar acum. Pana e gata, spune-ne ce te preocupa si unde trimitem raportul.</p>
              <ScanCard scan={scan} kind={kind} onKind={chooseKind} />
              <PrimaryButton onClick={() => { setScreen("q"); setQstep(1); }}>Continua →</PrimaryButton>
              <button onClick={() => setScreen("url")} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3">
                Alta adresa
              </button>
            </div>
          )}

          {/* Q1 — preocupare */}
          {screen === "q" && qstep === 1 && (
            <div>
              <BackButton onClick={qBack} />
              <h1 className="text-2xl font-black text-gray-900 mb-1">Ce te preocupa cel mai mult?</h1>
              <p className="text-sm text-gray-400 mb-6">Poti alege mai multe. Ne ajuta sa punem accentul unde conteaza pentru tine.</p>
              <div className="flex flex-col gap-2 mb-6">
                {PROBLEME.map((p) => {
                  const selected = probleme.includes(p.label);
                  return (
                    <button key={p.label}
                      onClick={() => setProbleme((prev) => selected ? prev.filter((x) => x !== p.label) : [...prev, p.label])}
                      className="flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all"
                      style={{ borderColor: selected ? "#47499E" : "#e2e8f0", background: selected ? "#f0f4ff" : "white" }}>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                        <p className="text-xs text-gray-400">{p.sub}</p>
                      </div>
                      <div className="ml-auto shrink-0 h-5 w-5 rounded flex items-center justify-center border-2 transition-all"
                        style={{ borderColor: selected ? "#47499E" : "#cbd5e1", background: selected ? "#47499E" : "white" }}>
                        {selected && (
                          <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <PrimaryButton onClick={qNext}>Continua →</PrimaryButton>
            </div>
          )}

          {/* Q2 — contact */}
          {screen === "q" && qstep === 2 && (() => {
            const isOther = prefix === "other";
            const emailErr = emailTouched && !isValidEmail(email);
            const telErr = telefonTouched && !isValidPhone(telefon);
            const prefixValid = isOther ? prefixCustom.startsWith("+") && prefixCustom.length >= 2 : true;
            const canSubmit = nume.trim() && isValidEmail(email) && isValidPhone(telefon) && prefixValid;
            const selectedTara = TARI.find((t) => t.code === prefix) ?? TARI[0];
            return (
              <div>
                <BackButton onClick={qBack} />
                <h1 className="text-2xl font-black text-gray-900 mb-1">Unde trimitem raportul?</h1>
                <p className="text-sm text-gray-400 mb-6">Iti trimitem raportul complet pe email in cateva minute.</p>
                <div className="flex flex-col gap-4 mb-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Numele tau</label>
                    <input type="text" placeholder="ex: Ion Popescu" value={nume} onChange={(e) => setNume(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border text-sm outline-none transition-colors" style={{ borderColor: "#e2e8f0" }}
                      onFocus={(e) => e.target.style.borderColor = "#47499E"} onBlur={(e) => e.target.style.borderColor = "#e2e8f0"} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                    <input type="email" placeholder="ex: ion@firma.ro" value={email} onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      className="w-full px-4 py-3.5 rounded-xl border text-sm outline-none transition-colors"
                      style={{ borderColor: emailErr ? "#ef4444" : "#e2e8f0" }}
                      onFocus={(e) => e.target.style.borderColor = emailErr ? "#ef4444" : "#47499E"} />
                    {emailErr && <p className="text-xs text-red-500 mt-1">Introdu o adresa de email valida (ex: ion@firma.ro)</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Telefon</label>
                    <div className="flex gap-2">
                      <div className="relative">
                        <button type="button" onClick={() => setDropdownOpen((o) => !o)}
                          className="flex items-center gap-1.5 px-3 py-3.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors"
                          style={{ borderColor: dropdownOpen ? "#47499E" : "#e2e8f0", minWidth: 90 }}>
                          <span>{selectedTara.flag}</span>
                          <span className="text-gray-700">{selectedTara.code}</span>
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {dropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto w-52">
                            {TARI.map((t) => (
                              <button key={t.code} type="button"
                                onClick={() => { setPrefix(t.code); setDropdownOpen(false); if (t.code !== "other") setPrefixCustom(""); }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                                style={{ background: prefix === t.code ? "#f0f4ff" : undefined }}>
                                <span>{t.flag}</span>
                                <span className="text-gray-500 text-xs w-10 shrink-0">{t.code !== "other" ? t.code : ""}</span>
                                <span className="text-gray-700 truncate">{t.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {isOther && (
                        <input type="text" placeholder="+52" value={prefixCustom}
                          onChange={(e) => setPrefixCustom(e.target.value.replace(/[^+0-9]/g, ""))}
                          className="w-20 px-3 py-3.5 rounded-xl border text-sm outline-none transition-colors text-center"
                          style={{ borderColor: prefixCustom && !prefixValid ? "#ef4444" : "#e2e8f0" }}
                          onFocus={(e) => e.target.style.borderColor = "#47499E"} onBlur={(e) => e.target.style.borderColor = "#e2e8f0"} maxLength={5} />
                      )}
                      <input type="tel" placeholder="740 000 000" value={telefon}
                        onChange={(e) => setTelefon(e.target.value.replace(/[^0-9\s\-]/g, ""))} onBlur={() => setTelefonTouched(true)}
                        className="flex-1 px-4 py-3.5 rounded-xl border text-sm outline-none transition-colors"
                        style={{ borderColor: telErr ? "#ef4444" : "#e2e8f0" }}
                        onFocus={(e) => e.target.style.borderColor = telErr ? "#ef4444" : "#47499E"} />
                    </div>
                    {telErr && <p className="text-xs text-red-500 mt-1">Introdu un numar de telefon valid (min 6 cifre)</p>}
                  </div>
                </div>
                <PrimaryButton onClick={handleSubmit} disabled={!canSubmit || submitting}>
                  {submitting ? "Se pregateste raportul..." : "Vezi raportul magazinului →"}
                </PrimaryButton>
                <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400 mt-3">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  Datele tale sunt in siguranta. Fara spam, vreodata.
                </p>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
