"use client";

import React, { useState } from "react";
import type { AuditRequestBody } from "@/lib/audit-request";
import { CURRENCIES, symOf } from "@/lib/currency";

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

const TOTAL_STEPS = 5;

// Rata de conversie pe intervale usoare (owner netehnic). value = mijloc reprezentativ; null = "nu stiu".
const CONV_BUCKETS: { label: string; sub: string; value: number | null }[] = [
  { label: "Sub 1%", sub: "din 100 de vizitatori, sub 1 cumpara", value: 0.7 },
  { label: "1 - 2%", sub: "cam 1-2 din 100", value: 1.5 },
  { label: "2 - 3%", sub: "cam 2-3 din 100", value: 2.5 },
  { label: "Peste 3%", sub: "3 sau mai multi din 100", value: 3.5 },
  { label: "Nu stiu", sub: "folosim media pietei in simulare", value: null },
];

const PROBLEME = [
  { label: "Am trafic, dar putine vanzari", sub: "Multi vizitatori, rata mica de conversie" },
  { label: "Platesc prea mult pe o vanzare", sub: "Costul pe achizitie (CPA) e prea mare" },
  { label: "Reclamele nu ating ROAS-ul dorit", sub: "Bani investiti in Google / Meta, randament sub tinta" },
  { label: "Nu apar organic in Google", sub: "Vizibilitate SEO slaba pe cautarile tale" },
  { label: "Nu apar in cautarile AI", sub: "Lipsesti din ChatGPT / AI Overviews (LLM / GEO)" },
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

function CurrencyInput({ value, onChange, placeholder, sym }: { value: string; onChange: (v: string) => void; placeholder: string; sym: string }) {
  return (
    <div className="mb-2 flex items-center rounded-xl border border-gray-200 transition-colors focus-within:border-[#47499E]">
      <span className="shrink-0 pl-4 pr-1.5 text-sm font-semibold text-gray-400">{sym}</span>
      <input
        type="text" inputMode="decimal" placeholder={placeholder} value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))}
        className="w-full bg-transparent py-3.5 pr-4 text-sm outline-none"
      />
    </div>
  );
}

type ScanResult = { origin: string; reachable: boolean; platform: string | null; isEcom: boolean | null; tracking: { gtm?: boolean; ga4?: boolean; metaPixel?: boolean; tiktok?: boolean }; currency?: string | null };

function ScanCard({ scan }: { scan: ScanResult }) {
  const trackers = [
    { k: "ga4", label: "Google Analytics 4", on: scan.tracking.ga4 },
    { k: "metaPixel", label: "Meta Pixel", on: scan.tracking.metaPixel },
    { k: "tiktok", label: "TikTok Pixel", on: scan.tracking.tiktok },
    { k: "gtm", label: "Google Tag Manager", on: scan.tracking.gtm },
  ];
  const row = (label: string, val: React.ReactNode) => (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: "#f1f5f9" }}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{val}</span>
    </div>
  );
  return (
    <div className="rounded-xl border p-5 mb-6" style={{ borderColor: "#e2e8f0", background: "#fafbff" }}>
      {row("Platforma", scan.platform ?? "o detectam in analiza")}
      {row("Tip site", scan.isEcom ? "Magazin online" : "Site")}
      <div className="pt-3">
        <span className="text-sm text-gray-500">Masuratori vazute deja in cod</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {trackers.map((t) => (
            <span key={t.k} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium"
              style={{ background: t.on ? "#ecfdf5" : "#f8fafc", color: t.on ? "#047857" : "#64748b", border: `1px solid ${t.on ? "#a7f3d0" : "#e2e8f0"}` }}>
              {t.on ? <span>✓</span> : null}{t.label}{!t.on ? <span className="opacity-70">· in analiza</span> : null}
            </span>
          ))}
        </div>
      </div>
      <p className="text-xs text-gray-400 mt-4 leading-relaxed">
        E doar o privire rapida in cod. Multe masuratori (GA4, Pixel) se incarca prin Google Tag Manager sau abia dupa ce accepti cookies — nu apar aici, dar nu inseamna ca lipsesc. In analiza completa deschidem magazinul intr-un browser real, dam accept si verificam ce se declanseaza cu adevarat, plus prezenta ta in Google Shopping.
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

  const [convValue, setConvValue] = useState<number | null | undefined>(undefined); // undefined = neatins
  const [aov, setAov] = useState("");
  const [adBudget, setAdBudget] = useState("");
  const [currency, setCurrency] = useState("RON"); // detectata din scan; userul poate schimba
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

  // URL -> porneste scanul rapid SI auditul complet in fundal (spec §11.2)
  async function startScan() {
    if (!url.trim()) return;
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
      // doar coduri din picker, ca un chip sa fie mereu activ; altfel ramane default RON
      if (data?.currency && CURRENCIES.some((c) => c.code === data.currency)) setCurrency(data.currency);
    } catch {
      setScan({ origin: url, reachable: false, platform: null, isEcom: null, tracking: {} });
    }
    setScreen("found");
  }

  function qNext() { setQstep((s) => Math.min(s + 1, TOTAL_STEPS)); }
  function qBack() {
    if (qstep === 1) { setScreen("found"); return; }
    setQstep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const convRate = convValue === undefined ? null : convValue;
    try {
      let id = jobId;
      if (id) {
        await fetch("/api/audit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase: "finalize", id, nume, email, telefon, probleme, convRate, aov, adBudget, currency } satisfies AuditRequestBody),
        });
      } else {
        // fallback: auditul nu s-a pornit la scan -> submit intr-un pas
        const res = await fetch("/api/audit", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, tipBusiness: "magazin", platforma: scan?.platform ?? undefined, nume, email, telefon, probleme, convRate, aov, adBudget, currency } satisfies AuditRequestBody),
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
                  onKeyDown={(e) => { if (e.key === "Enter") startScan(); }}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#47499E] transition-colors"
                />
              </div>
              <PrimaryButton onClick={startScan} disabled={!url.trim()}>Scaneaza magazinul →</PrimaryButton>
            </div>
          )}

          {/* SCANNING */}
          {screen === "scan" && (
            <div className="text-center py-6">
              <div className="mx-auto mb-6 h-14 w-14 rounded-full border-4 animate-spin"
                style={{ borderColor: "#e2e8f0", borderTopColor: "#47499E" }} />
              <h1 className="text-xl font-black text-gray-900 mb-1">Scanam magazinul tau...</h1>
              <p className="text-sm text-gray-400">Ne uitam la platforma, masuratori si structura. Dureaza cateva secunde.</p>
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
              <p className="text-sm text-gray-400 mb-5">Analizam magazinul in fundal chiar acum. Pana e gata, raspunde la cateva intrebari ca sa-ti facem si o estimare de venit.</p>
              <ScanCard scan={scan} />
              <PrimaryButton onClick={() => { setScreen("q"); setQstep(1); }}>Continua →</PrimaryButton>
              <button onClick={() => setScreen("url")} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3">
                Alta adresa
              </button>
            </div>
          )}

          {/* Q1 — conversie */}
          {screen === "q" && qstep === 1 && (
            <div>
              <BackButton onClick={qBack} />
              <h1 className="text-2xl font-black text-gray-900 mb-1">Ce rata de conversie ai?</h1>
              <p className="text-sm text-gray-400 mb-6">Din vizitatori, cati cumpara. Daca nu stii, alege ultima varianta — folosim media pietei.</p>
              <div className="flex flex-col gap-2 mb-6">
                {CONV_BUCKETS.map((b) => {
                  const selected = convValue === b.value && !(b.value === null && convValue === undefined);
                  return (
                    <button key={b.label}
                      onClick={() => { setConvValue(b.value); qNext(); }}
                      className="flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all hover:border-[#47499E]"
                      style={{ borderColor: selected ? "#47499E" : "#e2e8f0", background: selected ? "#f0f4ff" : "white" }}>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{b.label}</p>
                        <p className="text-xs text-gray-400">{b.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Q2 — AOV */}
          {screen === "q" && qstep === 2 && (
            <div>
              <BackButton onClick={qBack} />
              <h1 className="text-2xl font-black text-gray-900 mb-1">Cat e comanda medie?</h1>
              <p className="text-sm text-gray-400 mb-4">Valoarea medie a unei comenzi (AOV), aproximativ.</p>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-xs text-gray-400">Moneda:</span>
                {CURRENCIES.map((c) => (
                  <button key={c.code} type="button" onClick={() => setCurrency(c.code)}
                    className="rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all"
                    style={{ background: currency === c.code ? "#f0f4ff" : "white", borderColor: currency === c.code ? "#47499E" : "#e2e8f0", color: currency === c.code ? "#47499E" : "#64748b" }}>
                    {c.code}
                  </button>
                ))}
              </div>
              <CurrencyInput value={aov} onChange={setAov} placeholder="ex: 200" sym={symOf(currency)} />
              <p className="text-xs text-gray-400 mb-6">Cat cheltuie in medie un client cand comanda.</p>
              <PrimaryButton onClick={qNext}>Continua →</PrimaryButton>
              <button onClick={qNext} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3">Nu stiu / sari peste</button>
            </div>
          )}

          {/* Q3 — buget ads */}
          {screen === "q" && qstep === 3 && (
            <div>
              <BackButton onClick={qBack} />
              <h1 className="text-2xl font-black text-gray-900 mb-1">Buget lunar de reclame?</h1>
              <p className="text-sm text-gray-400 mb-6">Aproximativ, cat investesti pe luna in Google / Meta. Doar pentru simulare.</p>
              <CurrencyInput value={adBudget} onChange={setAdBudget} placeholder="ex: 5000" sym={symOf(currency)} />
              <p className="text-xs text-gray-400 mb-6">Daca nu faci reclame acum, lasa gol.</p>
              <PrimaryButton onClick={qNext}>Continua →</PrimaryButton>
              <button onClick={qNext} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3">Nu fac reclame / sari peste</button>
            </div>
          )}

          {/* Q4 — preocupare */}
          {screen === "q" && qstep === 4 && (
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

          {/* Q5 — contact */}
          {screen === "q" && qstep === 5 && (() => {
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
                <p className="text-sm text-gray-400 mb-6">Iti trimitem raportul complet + simularea pe email in cateva minute.</p>
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
