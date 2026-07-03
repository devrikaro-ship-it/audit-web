import Link from "next/link";

const features = [
  {
    bg: "#eef0ff", stroke: "#47499E",
    title: "Tracking & masurare",
    desc: "GA4, Google Ads, Meta Pixel, TikTok, Consent Mode v2. Daca nu masori corect, reclamele se optimizeaza pe orb si arzi buget.",
    icon: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></>,
  },
  {
    bg: "#e0f9fb", stroke: "#0ABECF",
    title: "Google Shopping & CSS",
    desc: "Rulezi prin CSS-ul Google (platesti pana la ~20% mai mult pe click) sau printr-un partener? Vezi si cine liciteaza pe produsele tale.",
    icon: <><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></>,
  },
  {
    bg: "#eef0ff", stroke: "#47499E",
    title: "Optimizare produse",
    desc: "Titluri, descrieri si feed. Daca produsele nu-s optimizate, apar mai rar in Shopping si in cautare — chiar cu buget de reclama.",
    icon: <><path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>,
  },
  {
    bg: "#e0f9fb", stroke: "#0ABECF",
    title: "SEO ecommerce",
    desc: "Title, meta, H1, canonical, schema Product cu pret si stele, structura pe categorii si produse — verificate pe zeci de pagini.",
    icon: <><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>,
  },
  {
    bg: "#eef0ff", stroke: "#47499E",
    title: "Pagina produs & categorie",
    desc: "Galerie, pret+stoc, buton 'Adauga in cos', descriere, recenzii, produse similare, filtre — locul unde clientul decide sa cumpere.",
    icon: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  },
  {
    bg: "#e0f9fb", stroke: "#0ABECF",
    title: "Viteza pe mobil",
    desc: "~70% din cumparatori sunt pe telefon. Un magazin lent pe mobil pierde vanzari — si bugetul de reclama pe care il aduce acolo.",
    icon: <><rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></>,
  },
  {
    bg: "#eef0ff", stroke: "#47499E",
    title: "Concurenti in Shopping",
    desc: "Cine apare langa tine pe produsele tale, ce CSS folosesc si la ce pret — exact ce vede cumparatorul cand cauta ce vinzi.",
    icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  },
  {
    bg: "#e0f9fb", stroke: "#0ABECF",
    title: "Schema & rich results",
    desc: "Produsele tale apar in Google cu pret si stele langa rezultat? Fara ele, clientul da click la concurentul care le are.",
    icon: <><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></>,
  },
];

const categories = [
  { color: "#47499E", name: "📊 Tracking & masurare" },
  { color: "#0ABECF", name: "🔍 SEO ecommerce" },
  { color: "#47499E", name: "🛒 UX / UI magazin" },
  { color: "#0ABECF", name: "🎯 Google Ads & Shopping" },
];

const mockBars = [
  { label: "📊 Tracking", pct: 50, color: "#ef4444" },
  { label: "🔍 SEO", pct: 61, color: "#47499E" },
  { label: "🛒 UX / UI", pct: 58, color: "#47499E" },
  { label: "🎯 Google Ads", pct: 45, color: "#ef4444" },
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
          Gratuit · Fara cont · Pentru magazine online
        </div>

        <h1 className="mx-auto mb-6 max-w-[820px] font-black leading-[1.05] tracking-[-2px]"
          style={{ fontSize: "clamp(36px,6vw,68px)", color: "#0f172a" }}>
          Afla de ce magazinul tau<br />
          nu{" "}
          <em className="not-italic" style={{
            background: "linear-gradient(135deg,#47499E,#0ABECF)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>vinde</em>{" "}
          cat ar putea
        </h1>

        <p className="mx-auto mb-10 max-w-[560px] text-lg leading-relaxed" style={{ color: "#64748b" }}>
          In 2 minute vezi unde pierzi cumparatori si unde arzi bani pe reclame — masurare, SEO, experienta de cumparare si Google Shopping, cu ce te costa fiecare si cum se repara.
        </p>

        <Link href="/audit"
          className="inline-flex items-center gap-2.5 rounded-[14px] px-9 py-[18px] text-[17px] font-bold text-white transition-all hover:-translate-y-0.5"
          style={{
            background: "linear-gradient(135deg,#47499E,#0ABECF)",
            boxShadow: "0 8px 32px rgba(71,73,158,0.3)"
          }}>
          Analizeaza magazinul meu gratuit
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        <div className="mt-4 flex items-center justify-center gap-1 text-[13px]" style={{ color: "#94a3b8" }}>
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
            { n: "180+", l: "Magazine analizate" },
            { n: "3.100+", l: "Probleme gasite" },
            { n: "40.000 €/luna", l: "Buget de reclame gestionat" },
            { n: "4.8/5", l: "Nota medie clienti" },
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
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[2px]" style={{ color: "#0ABECF" }}>Ce verificam</p>
        <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontSize: "clamp(28px,4vw,42px)", color: "#0f172a" }}>
          Tot ce tine magazinul tau pe loc
        </h2>
        <p className="mx-auto mb-16 max-w-[520px] text-center text-base leading-relaxed" style={{ color: "#64748b" }}>
          Verificam fiecare loc unde un magazin pierde vanzari — de la masurare si Google Shopping pana la pagina de produs. Primesti ce te costa fiecare problema si exact ce reparam.
        </p>
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f) => (
            <div key={f.title}
              className="rounded-2xl border p-7 transition-all hover:border-[rgba(71,73,158,0.2)] hover:shadow-[0_8px_32px_rgba(71,73,158,0.1)]"
              style={{ background: "#fff", borderColor: "#e2e8f0" }}>
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: f.bg }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={f.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        <p className="mx-auto mb-16 max-w-[500px] text-center text-base leading-relaxed" style={{ color: "#64748b" }}>
          Nu ai nevoie de cunostinte tehnice. Ne dai adresa magazinului si noi ne ocupam de rest.
        </p>
        <div className="relative mx-auto grid max-w-[800px] grid-cols-1 gap-8 md:grid-cols-3">
          <div className="pointer-events-none absolute inset-x-[15%] top-7 hidden h-px md:block"
            style={{ background: "linear-gradient(90deg,transparent,#e2e8f0 20%,#e2e8f0 80%,transparent)" }} />
          {[
            { n: "1", t: "Ne dai adresa magazinului", d: "Ne spui despre magazinul tau si principala ta problema in 60 de secunde." },
            { n: "2", t: "Noi il analizam", d: "Verificam zeci de pagini, masurarea, Google Shopping (CSS + concurenti) si experienta de cumparare." },
            { n: "3", t: "Primesti raportul", d: "Raport pe 4 rubrici, cu ce te costa fiecare problema si exact ce reparam ca sa vinzi mai mult." },
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
          4 rubrici, tot ce conteaza la un magazin online
        </h2>
        <p className="mx-auto mb-12 max-w-[500px] text-center text-base leading-relaxed" style={{ color: "#64748b" }}>
          Masurare, vizibilitate in Google, experienta de cumparare si reclame — intr-un singur raport clar.
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
          <h2 className="mx-auto mb-4 max-w-[620px] font-black text-white leading-[1.1] tracking-[-1.5px]"
            style={{ fontSize: "clamp(28px,5vw,52px)" }}>
            Gata sa afli ce te<br />costa clienti?
          </h2>
          <p className="mb-10 text-lg" style={{ color: "rgba(255,255,255,0.8)" }}>
            Audit gratuit pentru magazine online. Fara cont. Rezultate in 2 minute.
          </p>
          <Link href="/audit"
            className="inline-flex items-center gap-2.5 rounded-[14px] bg-white px-10 py-[18px] text-[17px] font-extrabold transition-all hover:-translate-y-0.5"
            style={{ color: "#47499E", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            Analizeaza magazinul meu gratuit
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
          <Link href="/audit-seo" className="transition-colors hover:text-[#0ABECF]" style={{ color: "#0ABECF" }}>Audit magazine online</Link>
          {" · "}
          <a href="https://devrika.ro" className="transition-colors hover:text-[#0ABECF]" style={{ color: "#0ABECF" }}>devrika.ro</a>
        </p>
      </footer>

    </div>
  );
}
