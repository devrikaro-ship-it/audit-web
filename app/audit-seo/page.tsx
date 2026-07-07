import Link from "next/link";

const sora = "var(--font-sora), system-ui, sans-serif";
const inter = "var(--font-inter), system-ui, sans-serif";

// Cele 4 zone — apar O SINGURA data, interactive (click = ce verificam acolo). Ton neutru/diagnostic.
const zones = [
  {
    bg: "#eef0ff", stroke: "#47499E",
    title: "Tracking & masurare",
    hook: "Nu stii sigur de unde vin vanzarile.",
    icon: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></>,
    checks: [
      "Ai GA4, conversii Google Ads, Meta Pixel, TikTok?",
      "Masori corect ce platesti pe reclame si ce aduc inapoi?",
      "Consimtamant cookie (Consent Mode) pus corect?",
    ],
    why: "Fara masurare, arunci bani pe reclame pe orb.",
  },
  {
    bg: "#e0f9fb", stroke: "#0ABECF",
    title: "SEO",
    hook: "Cat de usor te gaseste lumea gratuit in Google.",
    icon: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
    checks: [
      "Titluri, descrieri si structura paginilor",
      "Continut si cuvinte cheie pe categorii si produse",
      "Sitemap, link-uri interne, date structurate",
    ],
    why: "Trafic gratuit pe care acum poate il pierzi.",
  },
  {
    bg: "#eef0ff", stroke: "#47499E",
    title: "UX / UI magazin",
    hook: "Cat de usor e sa cumpere cineva de la tine.",
    icon: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
    checks: [
      "Viteza pe telefon",
      "Pagina produs: poze, pret, stoc, \"adauga in cos\", recenzii",
      "Pagina categorie + filtre si sortare",
    ],
    why: "Fiecare pas greu = comenzi pierdute.",
  },
  {
    bg: "#e0f9fb", stroke: "#0ABECF",
    title: "Google Ads & Shopping",
    hook: "Cat platesti in plus si cine iti fura clientii.",
    icon: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
    checks: [
      "Ce tip de CSS folosesti (poti plati pana la ~20% mai mult pe click)",
      "Cine liciteaza pe produsele tale in Shopping",
      "Apari sau nu pe propriile produse",
    ],
    why: "Cost pe click mai mic = mai multe vanzari la acelasi buget.",
  },
];

const mockBars = [
  { label: "Tracking", pct: 50, color: "#ef4444" },
  { label: "SEO", pct: 61, color: "#47499E" },
  { label: "UX / UI", pct: 58, color: "#47499E" },
  { label: "Google Ads", pct: 45, color: "#ef4444" },
];

const simRows = [
  { k: "Rata de conversie", now: "1.3%", goal: "2.0%" },
  { k: "Cost pe achizitie", now: "reper", goal: "−15%" },
  { k: "ROAS", now: "2.8×", goal: "~4.9×" },
];

export default function AuditSEO() {
  return (
    <div className="overflow-x-hidden" style={{ fontFamily: inter }}>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b px-8"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderColor: "rgba(71,73,158,0.08)" }}>
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-devrika.png" alt="Devrika" width={36} height={36} className="h-9 w-9" />
            <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
          </Link>
          <Link href="/audit"
            className="rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>
            Audit gratuit →
          </Link>
        </div>
      </nav>

      {/* 1 · HERO — diagnostic, nu de vanzare */}
      <section className="relative overflow-hidden px-8 pb-24 pt-36 text-center"
        style={{ background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
        <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[800px] w-[800px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle,rgba(71,73,158,0.08) 0%,transparent 70%)" }} />

        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold"
          style={{ background: "#f0f4ff", borderColor: "rgba(71,73,158,0.15)", color: "#47499E" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#0ABECF" }} />
          Gratuit · Fara cont · Pentru magazine online
        </div>

        <h1 className="mx-auto mb-6 max-w-[820px] font-black leading-[1.05] tracking-[-2px]"
          style={{ fontFamily: sora, fontSize: "clamp(36px,6vw,68px)", color: "#0f172a" }}>
          Afla unde pierde bani<br />
          magazinul tau{" "}
          <em className="not-italic" style={{
            background: "linear-gradient(135deg,#47499E,#0ABECF)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>online</em>
        </h1>

        <p className="mx-auto mb-10 max-w-[560px] text-lg leading-relaxed" style={{ color: "#64748b" }}>
          Dai adresa magazinului, il scanam pe loc si vezi in cateva minute unde pierzi cumparatori si unde arzi bani pe reclame — masurare, SEO, experienta de cumparare si Google Shopping.
        </p>

        <Link href="/audit"
          className="inline-flex items-center gap-2.5 rounded-[14px] px-9 py-[18px] text-[17px] font-bold text-white transition-all hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)", boxShadow: "0 8px 32px rgba(71,73,158,0.3)" }}>
          Scaneaza magazinul meu
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        <div className="mt-4 flex items-center justify-center gap-1 text-[13px]" style={{ color: "#64748b" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Fara card bancar. Fara cont. Doar adresa magazinului tau.
        </div>

        {/* Browser mockup */}
        <div className="mt-16 inline-block w-full max-w-[700px]">
          <div className="rounded-2xl p-3" style={{ background: "#1e293b", boxShadow: "0 32px 80px rgba(0,0,0,0.2),0 0 0 1px rgba(255,255,255,0.05)" }}>
            <div className="mb-3 flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#ef4444" }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#f59e0b" }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#10b981" }} />
              <div className="ml-2 flex-1 rounded-md px-3 py-1.5 text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                audit.devrika.ro/r/magazinul-tau
              </div>
            </div>
            <div className="rounded-xl p-6 text-left" style={{ background: "linear-gradient(135deg,#f8f7ff,#f0fafa)" }}>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: "#1e293b" }}>magazinultau.ro — Raport audit</span>
                <span className="rounded-full px-3 py-1 text-[13px] font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>53 / 100</span>
              </div>
              <div className="flex flex-col gap-2">
                {mockBars.map((b) => (
                  <div key={b.label} className="flex items-center gap-2.5">
                    <span className="w-[140px] shrink-0 text-xs" style={{ color: "#64748b" }}>{b.label}</span>
                    <div className="flex-1 overflow-hidden rounded-sm" style={{ height: 6, background: "#e2e8f0" }}>
                      <div style={{ width: `${b.pct}%`, height: "100%", background: b.color, borderRadius: 3 }} />
                    </div>
                    <span className="w-7 text-right text-xs font-bold" style={{ color: b.color }}>{b.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2 · TRUST */}
      <section className="bg-white px-8 py-16">
        <div className="mx-auto grid max-w-[960px] grid-cols-2 items-start gap-8 text-center md:grid-cols-4">
          {[
            { n: "180+", l: "Magazine analizate" },
            { n: "3.100+", l: "Probleme gasite" },
            { n: "40.000€/luna", l: "Buget de reclame gestionat" },
            { n: "4.8/5", l: "Nota medie clienti" },
          ].map((s) => (
            <div key={s.l}>
              <div className="whitespace-nowrap font-black tracking-[-1px]" style={{
                fontFamily: sora, fontSize: "clamp(22px,3.4vw,32px)",
                background: "linear-gradient(135deg,#47499E,#0ABECF)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
              }}>{s.n}</div>
              <div className="mt-1 text-sm font-medium" style={{ color: "#64748b" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 3 · PROBLEMA — context, nu pitch */}
      <section className="px-8 py-20" style={{ background: "linear-gradient(180deg,#fff 0%,#f8f7ff 100%)" }}>
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="mb-5 font-extrabold leading-[1.15] tracking-[-1px]"
            style={{ fontFamily: sora, fontSize: "clamp(26px,4vw,38px)", color: "#0f172a" }}>
            Primesti vizite, dar putine devin comenzi
          </h2>
          <p className="mx-auto mb-8 max-w-[560px] text-lg leading-relaxed" style={{ color: "#64748b" }}>
            De cele mai multe ori nu traficul e problema, ci lucruri mici si ascunse:
          </p>
          <ul className="mx-auto flex max-w-[520px] flex-col gap-3.5 text-left">
            {[
              "Masurare care nu prinde toate vanzarile",
              "Produse care nu apar in cautari",
              "Pasi greoi pana la cumparare",
              "Clicuri platite mai scump decat trebuie",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-[15px]"
                style={{ borderColor: "#e8eaf5", color: "#334155" }}>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-[520px] text-lg leading-relaxed" style={{ color: "#64748b" }}>
            Auditul le arata pe toate, <b style={{ color: "#0f172a" }}>dintr-o privire</b>.
          </p>
        </div>
      </section>

      {/* 4 · CE ANALIZAM — 4 zone interactive */}
      <section className="bg-white px-8 py-24">
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[2px]" style={{ color: "#0ABECF" }}>Ce analizam</p>
        <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontFamily: sora, fontSize: "clamp(28px,4vw,42px)", color: "#0f172a" }}>
          4 zone unde un magazin pierde bani
        </h2>
        <p className="mx-auto mb-14 max-w-[520px] text-center text-base leading-relaxed" style={{ color: "#64748b" }}>
          Apasa pe fiecare zona ca sa vezi exact ce verificam acolo — in limbaj clar, nu tehnic.
        </p>
        <div className="mx-auto grid max-w-[880px] grid-cols-1 items-start gap-4 md:grid-cols-2">
          {zones.map((z) => (
            <details key={z.title} className="group rounded-2xl border transition-all"
              style={{ background: "#fff", borderColor: "#e2e8f0" }}>
              <summary className="flex cursor-pointer list-none items-center gap-4 p-6">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: z.bg }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={z.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {z.icon}
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-bold" style={{ fontFamily: sora, color: "#1e293b" }}>{z.title}</p>
                  <p className="text-[13px] leading-snug" style={{ color: "#64748b" }}>{z.hook}</p>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"
                  className="shrink-0 transition-transform group-open:rotate-180">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </summary>
              <div className="px-6 pb-6" style={{ paddingLeft: 84 }}>
                <ul className="flex flex-col gap-2">
                  {z.checks.map((c) => (
                    <li key={c} className="flex items-start gap-2 text-[13.5px]" style={{ color: "#475569" }}>
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: z.stroke }} />
                      {c}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-[13px] font-semibold" style={{ color: "#47499E" }}>{z.why}</p>
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* 5 · CUM FUNCTIONEAZA */}
      <section className="px-8 py-24" style={{ background: "linear-gradient(180deg,#fff 0%,#f8f7ff 100%)" }}>
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[2px]" style={{ color: "#0ABECF" }}>Cum functioneaza</p>
        <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontFamily: sora, fontSize: "clamp(28px,4vw,42px)", color: "#0f172a" }}>
          3 pasi pana la raportul tau
        </h2>
        <p className="mx-auto mb-16 max-w-[500px] text-center text-base leading-relaxed" style={{ color: "#64748b" }}>
          Nu ai nevoie de cunostinte tehnice. Dai adresa si te ocupi de restul in cateva minute.
        </p>
        <div className="relative mx-auto grid max-w-[800px] grid-cols-1 gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute inset-x-[15%] top-7 hidden h-px md:block"
            style={{ background: "linear-gradient(90deg,transparent,#e2e8f0 20%,#e2e8f0 80%,transparent)" }} />
          {[
            { n: "1", t: "Dai adresa magazinului", d: "Il scanam pe loc si iti aratam ce am gasit — platforma, masuratori, structura." },
            { n: "2", t: "Raspunzi la cateva intrebari", d: "Comanda medie, buget de reclame, ce te preocupa. Cat timp analizam magazinul in fundal." },
            { n: "3", t: "Primesti raportul", d: "Scor pe cele 4 zone, unde pierzi bani si o estimare de cat ai putea castiga in plus." },
          ].map((s) => (
            <div key={s.n} className="relative z-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl font-extrabold text-white"
                style={{ fontFamily: sora, background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>
                {s.n}
              </div>
              <p className="mb-1.5 text-[15px] font-bold" style={{ fontFamily: sora, color: "#1e293b" }}>{s.t}</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6 · SIMULARE — ce castigi daca repari */}
      <section className="bg-white px-8 py-24">
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[2px]" style={{ color: "#0ABECF" }}>Estimare de venit</p>
        <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontFamily: sora, fontSize: "clamp(28px,4vw,42px)", color: "#0f172a" }}>
          Vezi cat ai putea castiga daca repari
        </h2>
        <p className="mx-auto mb-12 max-w-[560px] text-center text-base leading-relaxed" style={{ color: "#64748b" }}>
          In timpul analizei iti punem cateva intrebari (buget de reclame, comanda medie), iar raportul estimeaza cat ai putea aduce in plus la acelasi buget — daca creste rata de conversie si scade costul pe click. Asa arata rezultatul:
        </p>
        <div className="mx-auto max-w-[640px] rounded-2xl border p-6 md:p-8" style={{ background: "#fafbff", borderColor: "#e2e8f0" }}>
          <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "#e2e8f0" }}>
            <table className="w-full text-sm" style={{ borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
              <thead>
                <tr style={{ background: "#fff" }}>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Indicator</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide" style={{ color: "#94a3b8" }}>Acum</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wide" style={{ color: "#47499E" }}>Posibil</th>
                </tr>
              </thead>
              <tbody>
                {simRows.map((r, i) => (
                  <tr key={r.k} style={{ borderTop: i === 0 ? "none" : "1px solid #eef1f7" }}>
                    <td className="px-4 py-2.5 text-left" style={{ color: "#64748b" }}>{r.k}</td>
                    <td className="px-4 py-2.5 text-right" style={{ color: "#64748b" }}>{r.now}</td>
                    <td className="px-4 py-2.5 text-right font-bold" style={{ color: "#47499E" }}>{r.goal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "#94a3b8" }}>
            Cifre exemplu, orientative. In raport o vezi pe cifrele tale. Estimarea exacta iese cu acces la cont (GA4 / Google Ads).
          </p>
        </div>
      </section>

      {/* 7 · CTA FINAL */}
      <section className="relative overflow-hidden px-8 py-24 text-center"
        style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>
        <div className="pointer-events-none absolute inset-0 opacity-15"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px,white 1px,transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10">
          <h2 className="mx-auto mb-4 max-w-[620px] font-black text-white leading-[1.1] tracking-[-1.5px]"
            style={{ fontFamily: sora, fontSize: "clamp(28px,5vw,52px)" }}>
            Vezi unde pierde bani<br />magazinul tau
          </h2>
          <p className="mb-10 text-lg" style={{ color: "rgba(255,255,255,0.8)" }}>
            Audit gratuit pentru magazine online. Fara cont. Rezultate in cateva minute.
          </p>
          <Link href="/audit"
            className="inline-flex items-center gap-2.5 rounded-[14px] bg-white px-10 py-[18px] text-[17px] font-extrabold transition-all hover:-translate-y-0.5"
            style={{ fontFamily: sora, color: "#47499E", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            Scaneaza magazinul meu
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-8 py-10 text-center" style={{ background: "#0f172a" }}>
        <div className="mb-4 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={30} height={30} className="h-[30px] w-[30px]" />
          <span className="text-base font-extrabold text-white">Devrika</span>
        </div>
        <p className="text-[13px]" style={{ color: "#475569" }}>
          © {new Date().getFullYear()} Devrika Agency ·{" "}
          <Link href="/audit-seo" className="transition-colors hover:text-[#0ABECF]" style={{ color: "#0ABECF" }}>Audit magazine online</Link>
          {" · "}
          <a href="https://devrika.ro" className="transition-colors hover:text-[#0ABECF]" style={{ color: "#0ABECF" }}>devrika.ro</a>
        </p>
      </footer>

    </div>
  );
}
