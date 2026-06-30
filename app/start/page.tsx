"use client";

import React, { useState } from "react";

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

const PLATFORME_PREZENTARE = [
  "WordPress", "Wix", "Squarespace", "Webflow", "Joomla", "Custom", "Altul",
];
const PLATFORME_MAGAZINE = [
  "WooCommerce", "Shopify", "GoMag", "MerchantPro", "OpenCart",
  "PrestaShop", "Magento", "Wix eCommerce", "Custom", "Altul",
];
const PROBLEME = [
  {
    label: "Site-ul meu se incarca greu",
    sub: "Vizitatorii pleaca inainte sa vada continutul",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="#47499E" strokeWidth="1.5"/>
        <path d="M12 6v6l4 2" stroke="#0ABECF" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Nu apar in Google",
    sub: "Site-ul nu e indexat sau nu apare deloc",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" stroke="#47499E" strokeWidth="1.5"/>
        <path d="M16.5 16.5L21 21" stroke="#0ABECF" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M8 11h6M11 8v6" stroke="#47499E" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Apar dar nimeni nu da click",
    sub: "Am impresii dar CTR-ul e scazut",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <path d="M15 15l-5-5m0 0l-3 8L3 3l18 4-8 3z" stroke="#47499E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M15 15l4 4" stroke="#0ABECF" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Am trafic dar nu convertesc",
    sub: "Multi vizitatori, putini clienti",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <path d="M3 17l4-4 4 4 4-6 4 2" stroke="#47499E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M3 21h18" stroke="#0ABECF" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    label: "Nu stiu care e problema",
    sub: "Vreau sa vad imaginea completa",
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" stroke="#47499E" strokeWidth="1.5"/>
        <path d="M12 8v4M12 16h.01" stroke="#0ABECF" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
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
          <div
            key={i}
            className="h-2 rounded-full transition-all duration-300"
            style={{
              width: i === current - 1 ? 28 : 8,
              background: i < current
                ? "linear-gradient(135deg,#47499E,#0ABECF)"
                : "#e2e8f0",
            }}
          />
        ))}
      </div>
      <span className="text-xs text-gray-400">Pasul {current} din {TOTAL_STEPS}</span>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-6"
    >
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
      Inapoi
    </button>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full py-4 rounded-xl text-white font-bold text-base transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
      style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}
    >
      {children}
    </button>
  );
}

export default function StartPage() {
  const [step, setStep] = useState(1);
  const [url, setUrl] = useState("");
  const [tipBusiness, setTipBusiness] = useState<"magazin" | "prezentare" | "">("");
  const [platforma, setPlatforma] = useState("");
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

  const platforme = tipBusiness === "magazin" ? PLATFORME_MAGAZINE : PLATFORME_PREZENTARE;

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }
  function back() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, tipBusiness, platforma, probleme, nume, email, telefon }),
      });
      const { id } = await res.json();
      window.location.href = `/processing/${id}`;
    } catch {
      setSubmitting(false);
      alert("A aparut o eroare. Te rog incearca din nou.");
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: "linear-gradient(135deg,#f0f4ff 0%,#e8f0fe 30%,#f0fafa 70%,#e8fffe 100%)",
      }}
    >
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 px-8 py-4 flex items-center gap-2.5 z-10"
        style={{ background: "rgba(255,255,255,0.8)", backdropFilter: "blur(8px)" }}>
        <DevrikaLogo />
        <span className="text-base font-extrabold" style={{ color: "#1e1b4b" }}>Devrika</span>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pt-24 pb-12">
        <ProgressDots current={step} />

        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">

          {/* Step 1 — URL */}
          {step === 1 && (
            <div>
              <h1 className="text-2xl font-black text-gray-900 mb-1">URL-ul site-ului tau</h1>
              <p className="text-sm text-gray-400 mb-6">Introducem adresa exacta pentru a putea scana site-ul</p>
              <div className="relative mb-6">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20" />
                  </svg>
                </span>
                <input
                  type="url"
                  placeholder="ex: site-ul-tau.ro"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 text-sm outline-none focus:border-[#47499E] transition-colors"
                />
              </div>
              <PrimaryButton onClick={next} disabled={!url.trim()}>
                Continua →
              </PrimaryButton>
            </div>
          )}

          {/* Step 2 — Tip business */}
          {step === 2 && (
            <div>
              <BackButton onClick={back} />
              <h1 className="text-2xl font-black text-gray-900 mb-1">Ce tip de site ai?</h1>
              <p className="text-sm text-gray-400 mb-6">Adaptam analiza in functie de tipul afacerii tale</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    value: "magazin",
                    label: "Magazine online",
                    icon: (
                      <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
                        <rect x="2" y="7" width="20" height="14" rx="2" fill="#f0f4ff" stroke="#47499E" strokeWidth="1.5"/>
                        <path d="M16 7V5a4 4 0 00-8 0v2" stroke="#47499E" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M9 12h6M12 9v6" stroke="#0ABECF" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    ),
                  },
                  {
                    value: "prezentare",
                    label: "Site prezentare & servicii",
                    icon: (
                      <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
                        <rect x="2" y="3" width="20" height="15" rx="2" fill="#f0f4ff" stroke="#47499E" strokeWidth="1.5"/>
                        <path d="M8 21h8M12 18v3" stroke="#47499E" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M6 8h12M6 12h8" stroke="#0ABECF" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    ),
                  },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setTipBusiness(opt.value as "magazin" | "prezentare"); setPlatforma(""); next(); }}
                    className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all hover:border-[#47499E]"
                    style={{
                      borderColor: tipBusiness === opt.value ? "#47499E" : "#e2e8f0",
                      background: tipBusiness === opt.value ? "#f0f4ff" : "white",
                    }}
                  >
                    {opt.icon}
                    <span className="text-sm font-semibold text-gray-800 text-center">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Platforma */}
          {step === 3 && (
            <div>
              <BackButton onClick={back} />
              <h1 className="text-2xl font-black text-gray-900 mb-1">Ce platforma folosesti?</h1>
              <p className="text-sm text-gray-400 mb-6">Ne ajuta sa detectam probleme specifice platformei tale</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {platforme.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlatforma(p)}
                    className="px-4 py-2 rounded-full text-sm font-medium border-2 transition-all"
                    style={{
                      borderColor: platforma === p ? "#47499E" : "#e2e8f0",
                      background: platforma === p ? "#f0f4ff" : "white",
                      color: platforma === p ? "#47499E" : "#64748b",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <PrimaryButton onClick={next} disabled={!platforma}>
                Continua →
              </PrimaryButton>
            </div>
          )}

          {/* Step 4 — Probleme (selectie multipla) */}
          {step === 4 && (
            <div>
              <BackButton onClick={back} />
              <h1 className="text-2xl font-black text-gray-900 mb-1">Care sunt problemele tale?</h1>
              <p className="text-sm text-gray-400 mb-6">Poti selecta mai multe. Prioritizam recomandarile in functie de obiectivele tale.</p>
              <div className="flex flex-col gap-2 mb-6">
                {PROBLEME.map((p) => {
                  const selected = probleme.includes(p.label);
                  return (
                    <button
                      key={p.label}
                      onClick={() => setProbleme((prev) =>
                        selected ? prev.filter((x) => x !== p.label) : [...prev, p.label]
                      )}
                      className="flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all"
                      style={{
                        borderColor: selected ? "#47499E" : "#e2e8f0",
                        background: selected ? "#f0f4ff" : "white",
                      }}
                    >
                      <span className="shrink-0">{p.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{p.label}</p>
                        <p className="text-xs text-gray-400">{p.sub}</p>
                      </div>
                      <div
                        className="ml-auto shrink-0 h-5 w-5 rounded flex items-center justify-center border-2 transition-all"
                        style={{
                          borderColor: selected ? "#47499E" : "#cbd5e1",
                          background: selected ? "#47499E" : "white",
                        }}
                      >
                        {selected && (
                          <svg width="12" height="12" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <PrimaryButton onClick={next} disabled={probleme.length === 0}>
                Continua →
              </PrimaryButton>
            </div>
          )}

          {/* Step 5 — Date contact */}
          {step === 5 && (() => {
            const isOther = prefix === "other";
            const emailErr = emailTouched && !isValidEmail(email);
            const telErr = telefonTouched && !isValidPhone(telefon);
            const prefixValid = isOther ? prefixCustom.startsWith("+") && prefixCustom.length >= 2 : true;
            const canSubmit = nume.trim() && isValidEmail(email) && isValidPhone(telefon) && prefixValid;
            const selectedTara = TARI.find((t) => t.code === prefix) ?? TARI[0];
            return (
              <div>
                <BackButton onClick={back} />
                <h1 className="text-2xl font-black text-gray-900 mb-1">Ultimul pas!</h1>
                <p className="text-sm text-gray-400 mb-6">Iti trimitem raportul gratuit pe email in cateva minute</p>
                <div className="flex flex-col gap-4 mb-6">

                  {/* Nume */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Numele tau</label>
                    <input
                      type="text"
                      placeholder="ex: Ion Popescu"
                      value={nume}
                      onChange={(e) => setNume(e.target.value)}
                      className="w-full px-4 py-3.5 rounded-xl border text-sm outline-none transition-colors"
                      style={{ borderColor: "#e2e8f0" }}
                      onFocus={(e) => e.target.style.borderColor = "#47499E"}
                      onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                    <input
                      type="email"
                      placeholder="ex: ion@firma.ro"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={() => setEmailTouched(true)}
                      className="w-full px-4 py-3.5 rounded-xl border text-sm outline-none transition-colors"
                      style={{ borderColor: emailErr ? "#ef4444" : "#e2e8f0" }}
                      onFocus={(e) => e.target.style.borderColor = emailErr ? "#ef4444" : "#47499E"}
                    />
                    {emailErr && (
                      <p className="text-xs text-red-500 mt-1">Introdu o adresa de email valida (ex: ion@firma.ro)</p>
                    )}
                  </div>

                  {/* Telefon cu prefix tara */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Telefon</label>
                    <div className="flex gap-2">
                      {/* Dropdown prefix */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setDropdownOpen((o) => !o)}
                          className="flex items-center gap-1.5 px-3 py-3.5 rounded-xl border text-sm font-medium whitespace-nowrap transition-colors"
                          style={{ borderColor: dropdownOpen ? "#47499E" : "#e2e8f0", minWidth: 90 }}
                        >
                          <span>{selectedTara.flag}</span>
                          <span className="text-gray-700">{selectedTara.code}</span>
                          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {dropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto w-52">
                            {TARI.map((t) => (
                              <button
                                key={t.code}
                                type="button"
                                onClick={() => { setPrefix(t.code); setDropdownOpen(false); if (t.code !== "other") setPrefixCustom(""); }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition-colors"
                                style={{ background: prefix === t.code ? "#f0f4ff" : undefined }}
                              >
                                <span>{t.flag}</span>
                                <span className="text-gray-500 text-xs w-10 shrink-0">{t.code !== "other" ? t.code : ""}</span>
                                <span className="text-gray-700 truncate">{t.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Input prefix manual pentru Alta tara */}
                      {isOther && (
                        <input
                          type="text"
                          placeholder="+52"
                          value={prefixCustom}
                          onChange={(e) => setPrefixCustom(e.target.value.replace(/[^+0-9]/g, ""))}
                          className="w-20 px-3 py-3.5 rounded-xl border text-sm outline-none transition-colors text-center"
                          style={{ borderColor: prefixCustom && !prefixValid ? "#ef4444" : "#e2e8f0" }}
                          onFocus={(e) => e.target.style.borderColor = "#47499E"}
                          onBlur={(e) => e.target.style.borderColor = "#e2e8f0"}
                          maxLength={5}
                        />
                      )}
                      {/* Numar */}
                      <input
                        type="tel"
                        placeholder="740 000 000"
                        value={telefon}
                        onChange={(e) => setTelefon(e.target.value.replace(/[^0-9\s\-]/g, ""))}
                        onBlur={() => setTelefonTouched(true)}
                        className="flex-1 px-4 py-3.5 rounded-xl border text-sm outline-none transition-colors"
                        style={{ borderColor: telErr ? "#ef4444" : "#e2e8f0" }}
                        onFocus={(e) => e.target.style.borderColor = telErr ? "#ef4444" : "#47499E"}
                      />
                    </div>
                    {telErr && (
                      <p className="text-xs text-red-500 mt-1">Introdu un numar de telefon valid (min 6 cifre)</p>
                    )}
                  </div>
                </div>

                <PrimaryButton onClick={handleSubmit} disabled={!canSubmit || submitting}>
                  {submitting ? "Se porneste auditul..." : "Trimite-mi raportul gratuit →"}
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
