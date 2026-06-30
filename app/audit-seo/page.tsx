import Link from "next/link";

const features = [
  {
    bg: "#eef0ff", stroke: "#47499E",
    title: "Viteza & Core Web Vitals",
    desc: "Scor PageSpeed, LCP, CLS, TBT — si exact ce incetineste site-ul tau.",
    icon: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
  },
  {
    bg: "#e0f9fb", stroke: "#0ABECF",
    title: "SEO Tehnic",
    desc: "Title tags, meta descriptions, H1, canonicals, sitemap si multe altele.",
    icon: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  },
  {
    bg: "#eef0ff", stroke: "#47499E",
    title: "Calitatea Continutului",
    desc: "Continut subtire, pagini duplicate, structura headings si probleme de lizibilitate.",
    icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
  },
  {
    bg: "#e0f9fb", stroke: "#0ABECF",
    title: "Experienta Mobile",
    desc: "PageSpeed mobile, probleme responsive, butoane prea mici si viewport.",
    icon: <><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>,
  },
  {
    bg: "#eef0ff", stroke: "#47499E",
    title: "Structura Site-ului",
    desc: "Linkuri rupte, adancime pagini, pagini orfane si lanturi de redirecturi.",
    icon: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>,
  },
  {
    bg: "#e0f9fb", stroke: "#0ABECF",
    title: "Schema Markup",
    desc: "Prezenta JSON-LD, tipuri detectate, date structurate lipsa.",
    icon: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>,
  },
  {
    bg: "#eef0ff", stroke: "#47499E",
    title: "Social & OG Tags",
    desc: "Open Graph, Twitter Card, favicon si completitudine previzualizare sociala.",
    icon: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  },
  {
    bg: "#e0f9fb", stroke: "#0ABECF",
    title: "Securitate",
    desc: "HTTPS, HSTS, headere de securitate, mixed content si redirecturi corecte.",
    icon: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  },
];

const categories = [
  { color: "#47499E", name: "⚡ Viteza & Performanta" },
  { color: "#0ABECF", name: "🔍 SEO Tehnic" },
  { color: "#47499E", name: "📝 Calitatea Continutului" },
  { color: "#0ABECF", name: "📱 Experienta Mobile" },
  { color: "#47499E", name: "🔗 Structura Site-ului" },
  { color: "#0ABECF", name: "🗂️ Schema Markup" },
  { color: "#47499E", name: "🌐 Social & Branding" },
  { color: "#0ABECF", name: "🔒 Securitate" },
];

const mockBars = [
  { label: "⚡ Viteza & Performanta", pct: 41, color: "#ef4444" },
  { label: "🔍 SEO Tehnic", pct: 78, color: "#47499E" },
  { label: "📝 Continut", pct: 65, color: "#47499E" },
  { label: "📱 Mobile", pct: 55, color: "#47499E" },
  { label: "🔒 Securitate", pct: 95, color: "#0ABECF" },
];

export default function AuditSEO() {
  return (
    <div className="overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b px-8"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderColor: "rgba(71,73,158,0.08)" }}>
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 no-underline">
            <svg width="28" height="28" viewBox="0 0 93 88" fill="none">
              <defs>
                <linearGradient id="lg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0ABECF" /><stop offset="100%" stopColor="#47499E" /></linearGradient>
                <linearGradient id="lg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#47499E" /><stop offset="100%" stopColor="#0ABECF" /></linearGradient>
              </defs>
              <ellipse cx="35" cy="44" rx="35" ry="35" fill="url(#lg1)" opacity="0.9" />
              <ellipse cx="58" cy="44" rx="35" ry="35" fill="url(#lg2)" opacity="0.7" />
              <circle cx="46.5" cy="44" r="5" fill="#fff" opacity="0.9" />
            </svg>
            <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
          </a>
          <Link href="/audit"
            className="rounded-lg px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>
            Audit gratuit →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative overflow-hidden px-8 pb-24 pt-36 text-center"
        style={{ background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
        <div className="pointer-events-none absolute left-1/2 top-[-200px] h-[800px] w-[800px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle,rgba(71,73,158,0.08) 0%,transparent 70%)" }} />

        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold"
          style={{ background: "#f0f4ff", borderColor: "rgba(71,73,158,0.15)", color: "#47499E" }}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#0ABECF" }} />
          Gratuit · Fara cont · Rezultate instant
        </div>

        <h1 className="mx-auto mb-6 max-w-[800px] font-black leading-[1.05] tracking-[-2px]"
          style={{ fontSize: "clamp(36px,6vw,68px)", color: "#0f172a" }}>
          Afla de ce site-ul tau<br />
          nu obtine{" "}
          <em className="not-italic" style={{
            background: "linear-gradient(135deg,#47499E,#0ABECF)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>trafic</em>
        </h1>

        <p className="mx-auto mb-10 max-w-[520px] text-lg leading-relaxed" style={{ color: "#64748b" }}>
          Primeste un audit SEO complet cu recomandari clare in 2 minute. 100% gratuit.
        </p>

        <Link href="/audit"
          className="inline-flex items-center gap-2.5 rounded-[14px] px-9 py-[18px] text-[17px] font-bold text-white transition-all hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg,#47499E,#0ABECF)",
            boxShadow: "0 8px 32px rgba(71,73,158,0.3)"
          }}>
          Analizeaza site-ul meu gratuit
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        <div className="mt-4 flex items-center justify-center gap-1 text-[13px]" style={{ color: "#94a3b8" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Fara card bancar. Fara cont. Doar URL-ul site-ului tau.
        </div>

        {/* Browser mockup */}
        <div className="mt-16 inline-block w-full max-w-[700px]">
          <div className="rounded-2xl p-3" style={{ background: "#1e293b", boxShadow: "0 32px 80px rgba(0,0,0,0.2),0 0 0 1px rgba(255,255,255,0.05)" }}>
            <div className="mb-3 flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#ef4444" }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#f59e0b" }} />
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#10b981" }} />
              <div className="ml-2 flex-1 rounded-md px-3 py-1.5 text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                seo-siteultau-20260428.vercel.app
              </div>
            </div>
            <div className="rounded-xl p-6 text-left" style={{ background: "linear-gradient(135deg,#f8f7ff,#f0fafa)" }}>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold" style={{ color: "#1e293b" }}>siteultau.ro — Raport SEO</span>
                <span className="rounded-full px-3 py-1 text-[13px] font-extrabold text-white"
                  style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>72 / 100</span>
              </div>
              <div className="flex flex-col gap-2">
                {mockBars.map((b) => (
                  <div key={b.label} className="flex items-center gap-2.5">
                    <span className="w-[160px] shrink-0 text-xs" style={{ color: "#64748b" }}>{b.label}</span>
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

      {/* STATS */}
      <section className="bg-white px-8 py-16">
        <div className="mx-auto grid max-w-[900px] grid-cols-2 gap-8 text-center md:grid-cols-4">
          {[
            { n: "2.400+", l: "Site-uri analizate" },
            { n: "8", l: "Categorii SEO verificate" },
            { n: "2 min", l: "Timp mediu audit" },
            { n: "100%", l: "Gratuit, mereu" },
          ].map((s) => (
            <div key={s.l}>
              <div className="text-4xl font-black tracking-[-1px]" style={{
                background: "linear-gradient(135deg,#47499E,#0ABECF)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
              }}>{s.n}</div>
              <div className="mt-1 text-sm font-medium" style={{ color: "#64748b" }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-8 py-24" style={{ background: "linear-gradient(180deg,#fff 0%,#f8f7ff 100%)" }}>
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[2px]" style={{ color: "#0ABECF" }}>Ce include</p>
        <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontSize: "clamp(28px,4vw,42px)", color: "#0f172a" }}>
          Tot ce ai nevoie ca sa urci in Google
        </h2>
        <p className="mx-auto mb-16 max-w-[480px] text-center text-base leading-relaxed" style={{ color: "#64748b" }}>
          O analiza completa a tuturor factorilor care influenteaza pozitia ta in Google — livrata intr-un raport clar si actionabil.
        </p>
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title}
              className="rounded-2xl border p-7 transition-all hover:border-[rgba(71,73,158,0.2)] hover:shadow-[0_8px_32px_rgba(71,73,158,0.1)]"
              style={{ background: "#fff", borderColor: "#e2e8f0" }}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: f.bg }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={f.stroke} strokeWidth="2" strokeLinecap="round">
                  {f.icon}
                </svg>
              </div>
              <p className="mb-1.5 text-[15px] font-bold" style={{ color: "#1e293b" }}>{f.title}</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="bg-white px-8 py-24">
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[2px]" style={{ color: "#0ABECF" }}>Cum functioneaza</p>
        <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontSize: "clamp(28px,4vw,42px)", color: "#0f172a" }}>
          3 pasi pana la raportul tau gratuit
        </h2>
        <p className="mx-auto mb-16 max-w-[480px] text-center text-base leading-relaxed" style={{ color: "#64748b" }}>
          Nu ai nevoie de cunostinte tehnice. Introduci URL-ul si noi ne ocupam de rest.
        </p>
        <div className="relative mx-auto grid max-w-[800px] grid-cols-1 gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute inset-x-[15%] top-7 hidden h-px md:block"
            style={{ background: "linear-gradient(90deg,transparent,#e2e8f0 20%,#e2e8f0 80%,transparent)" }} />
          {[
            { n: "1", t: "Introduci URL-ul", d: "Ne spui despre site-ul tau si principala ta problema in 60 de secunde." },
            { n: "2", t: "Noi il analizam", d: "Sistemul nostru crawleaza site-ul si ruleaza verificari PageSpeed pe 8 categorii." },
            { n: "3", t: "Primesti raportul", d: "Raport detaliat si prioritizat in inbox-ul tau in 2-3 minute." },
          ].map((s) => (
            <div key={s.n} className="relative z-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl font-extrabold text-white"
                style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>
                {s.n}
              </div>
              <p className="mb-1.5 text-[15px] font-bold" style={{ color: "#1e293b" }}>{s.t}</p>
              <p className="text-[13px] leading-relaxed" style={{ color: "#64748b" }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="px-8 py-24" style={{ background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[2px]" style={{ color: "#0ABECF" }}>Acoperire</p>
        <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontSize: "clamp(28px,4vw,42px)", color: "#0f172a" }}>
          8 categorii analizate
        </h2>
        <p className="mx-auto mb-12 max-w-[480px] text-center text-base leading-relaxed" style={{ color: "#64748b" }}>
          Toti factorii care conteaza pentru Google, intr-un singur raport.
        </p>
        <div className="mx-auto grid max-w-[900px] grid-cols-2 gap-3 md:grid-cols-4">
          {categories.map((c) => (
            <div key={c.name}
              className="flex items-center gap-3 rounded-xl border px-4 py-4 transition-colors hover:border-[#47499E]"
              style={{ background: "#fff", borderColor: "#e2e8f0" }}>
              <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
              <span className="text-[13px] font-semibold" style={{ color: "#1e293b" }}>{c.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden px-8 py-24 text-center"
        style={{ background: "linear-gradient(135deg,#47499E,#0ABECF)" }}>
        <div className="pointer-events-none absolute inset-0 opacity-15"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px,white 1px,transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10">
          <h2 className="mx-auto mb-4 max-w-[600px] font-black text-white leading-[1.1] tracking-[-1.5px]"
            style={{ fontSize: "clamp(28px,5vw,52px)" }}>
            Gata sa afli ce te<br />tine pe loc?
          </h2>
          <p className="mb-10 text-lg" style={{ color: "rgba(255,255,255,0.8)" }}>
            Audit SEO gratuit. Fara cont. Rezultate in 2 minute.
          </p>
          <Link href="/audit"
            className="inline-flex items-center gap-2.5 rounded-[14px] bg-white px-10 py-[18px] text-[17px] font-extrabold transition-all hover:-translate-y-0.5"
            style={{ color: "#47499E", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            Analizeaza site-ul meu gratuit
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-8 py-10 text-center" style={{ background: "#0f172a" }}>
        <div className="mb-4 flex items-center justify-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 93 88" fill="none">
            <defs>
              <linearGradient id="flg1" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0ABECF" /><stop offset="100%" stopColor="#47499E" /></linearGradient>
              <linearGradient id="flg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#47499E" /><stop offset="100%" stopColor="#0ABECF" /></linearGradient>
            </defs>
            <ellipse cx="35" cy="44" rx="35" ry="35" fill="url(#flg1)" opacity="0.9" />
            <ellipse cx="58" cy="44" rx="35" ry="35" fill="url(#flg2)" opacity="0.7" />
            <circle cx="46.5" cy="44" r="5" fill="#fff" opacity="0.9" />
          </svg>
          <span className="text-base font-extrabold text-white">Devrika</span>
        </div>
        <p className="text-[13px]" style={{ color: "#475569" }}>
          © {new Date().getFullYear()} Devrika Agency ·{" "}
          <Link href="/audit-seo" className="transition-colors hover:text-[#0ABECF]" style={{ color: "#0ABECF" }}>Audit SEO Gratuit</Link>
          {" · "}
          <a href="https://devrika.ro" className="transition-colors hover:text-[#0ABECF]" style={{ color: "#0ABECF" }}>devrika.ro</a>
        </p>
      </footer>

    </div>
  );
}
