import Link from "next/link";
import { C, sora, inter, brandGradient } from "@/lib/theme";

// Landing pentru auditul PE CONT CONECTAT (Google Shopping).
// Sora vizuala a /audit-seo, dar alt produs: acolo scanam site-ul din exterior,
// aici prospectul conecteaza contul si vedem cifrele lui reale.
//
// REGULA DE ONESTITATE (mostenita din specul auditului conectat): trei niveluri,
// niciodata amestecate — MASURAT (produse, catalog mort) / ESTIMARE etichetata (CSS)
// / SIMULARE etichetata (bugetul curatat). Nicio proiectie nu se prezinta ca fapt.

const CONNECT_HREF = "/google-ads/connect";

// Titlu propriu, nu cel global. Google cere ca numele aplicatiei din ecranul de consimtamant
// ("Devrika") sa se regaseasca pe pagina declarata ca home page a aplicatiei — altfel
// verificarea pica pe "app name does not match the app name on your home page".
export const metadata = {
  title: "Audit Devrika — analiza contului tau de Google Ads",
  description:
    "Audit Devrika analizeaza contul tau de Google Ads si iti arata ce produse consuma buget fara sa "
    + "vanda. Citim doar datele de Shopping din ultimele 12 luni, nu modificam nimic in cont.",
};

// Randurile din mockup-ul de raport. Cifre exemplu, marcate ca atare sub tabel.
const mockVillains = [
  { p: "Rochie office bleumarin", cost: "4.820 lei", roas: "0,8×" },
  { p: "Set 3 tricouri bumbac", cost: "3.140 lei", roas: "1,2×" },
  { p: "Geanta piele ecologica", cost: "2.605 lei", roas: "0,0×" },
];

// Cele 3 lucruri pe care le arata raportul. `tier` = nivelul de onestitate.
const findings = [
  {
    tier: "Masurat",
    tierBg: C.greenBg,
    tierFg: C.green,
    title: "Produsele care iti ard bugetul",
    body:
      "Fiecare produs din Shopping care a cheltuit bani si a stat sub ROAS-ul tau minim, cu suma exacta pe ultimele 12 luni. Adunate, iti dau banii dusi pe produse care nu ating targetul.",
    icon: (
      <>
        <path d="M3 3v18h18" />
        <path d="m19 15-4-4-3 3-4-4" />
      </>
    ),
  },
  {
    tier: "Masurat",
    tierBg: C.greenBg,
    tierFg: C.green,
    title: "Catalogul mort",
    body:
      "Cate produse din catalog nu au avut nicio afisare. Nu iti inventam o suma pe ele — primesti faptul: cate sunt si ce parte din catalog inseamna.",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M9 9h6v6H9z" />
      </>
    ),
  },
  {
    tier: "Estimare",
    tierBg: C.yellowBg,
    tierFg: C.yellow,
    title: "Cat platesti in plus pe click",
    body:
      "Daca rulezi Shopping direct prin Google, fara CSS, costul pe click poate fi cu pana la ~20% mai mare. Cheltuiala pe care o aplicam e reala, procentul e un reper de piata — asa il si marcam.",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
  },
];

const steps = [
  {
    n: "1",
    t: "Conectezi contul",
    d: "Te autentifici direct la Google, ca la orice aplicatie. Parola ta nu trece prin noi.",
  },
  {
    n: "2",
    t: "Spui cat iti ramane din 100 de lei",
    d: "Un singur camp: marja ta, aproximativ. Din ea calculam noi pragul sub care un produs nu-si merita bugetul — nu trebuie sa stii ce inseamna ROAS.",
  },
  {
    n: "3",
    t: "Primesti raportul",
    d: "Pe loc, pe cifrele tale din ultimele 12 luni. Fara asteptare si fara discutie de vanzare inainte.",
  },
];

const safety = [
  {
    t: "Doar citim",
    d: "Nu pornim, nu oprim si nu modificam nimic in contul tau.",
    icon: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  },
  {
    t: "Doar datele de Shopping",
    d: "Cerem un singur drept de acces, cel pentru Google Ads. Nimic din Gmail sau Drive.",
    icon: <><rect x="3" y="8" width="18" height="13" rx="2" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></>,
  },
  {
    t: "Retragi accesul oricand",
    d: "Dintr-un click, din contul tau Google. Nu depinde de noi.",
    icon: <><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></>,
  },
  {
    t: "Fara card, fara abonament",
    d: "Raportul e gratuit. Discutam dupa, doar daca vrei tu.",
    icon: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>,
  },
];

export default function GoogleAdsLanding() {
  return (
    <div className="overflow-x-hidden" style={{ fontFamily: inter }}>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b px-8"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderColor: "rgba(71,73,158,0.08)" }}>
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-devrika.png" alt="Audit Devrika" width={36} height={36} className="h-9 w-9" />
            <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Audit Devrika</span>
          </Link>
          <Link href={CONNECT_HREF}
            className="flex min-h-11 items-center rounded-lg px-5 text-sm font-bold text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{ background: brandGradient, outlineColor: C.indigo }}>
            Conecteaza contul →
          </Link>
        </div>
      </nav>

      {/* 1 · HERO */}
      <section className="relative overflow-hidden px-8 pb-24 pt-36 text-center"
        style={{ background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-200px] h-[800px] w-[800px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle,rgba(71,73,158,0.08) 0%,transparent 70%)" }} />

        <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold"
          style={{ background: "#f0f4ff", borderColor: "rgba(71,73,158,0.15)", color: C.indigo }}>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: C.cyan }} />
          Audit Devrika · Aplicatie web · Gratuit
        </div>

        <h1 className="mx-auto mb-6 max-w-[860px] font-black leading-[1.05] tracking-[-2px]"
          style={{ fontFamily: sora, fontSize: "clamp(36px,6vw,68px)", color: "#0f172a" }}>
          Vezi ce produse iti ard{" "}
          <em className="not-italic" style={{
            background: brandGradient,
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>bugetul</em><br />
          in Google Shopping
        </h1>

        {/* Prima explicatie a aplicatiei sta AICI, sub titlu, nu la mijlocul paginii:
            verificarea de branding Google se uita la ce e vizibil sus si respinge cu
            "your home page does not explain the purpose of your app" daca nu gaseste
            numele aplicatiei alaturi de ce face ea. */}
        <p className="mx-auto mb-4 max-w-[640px] text-lg leading-relaxed" style={{ color: C.gray500 }}>
          Acesta e unul dintre auditurile din <Link href="/" style={{ color: C.indigo, fontWeight: 700 }}>Audit Devrika</Link>,
          aplicatia web care analizeaza magazinul si conturile tale de publicitate. Auditul de fata
          se conecteaza la contul tau de Google Ads si iti arata pe ce produse pierzi bani in
          campaniile de Shopping.
        </p>
        <p className="mx-auto mb-10 max-w-[640px] text-[16.5px] leading-relaxed" style={{ color: C.gray500 }}>
          Iti conectezi contul de Google Ads, aplicatia citeste datele campaniilor de Shopping din
          ultimele 12 luni si iti spune care produse consuma buget fara sa vanda — produs cu produs,
          cu suma exacta. Nu modifica nimic in contul tau.
        </p>

        <Link href={CONNECT_HREF}
          className="inline-flex items-center gap-2.5 rounded-[14px] px-9 py-[18px] text-[17px] font-bold text-white transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          style={{ background: brandGradient, boxShadow: "0 8px 32px rgba(71,73,158,0.3)", outlineColor: C.indigo }}>
          Conecteaza contul Google Ads
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[13px]" style={{ color: C.gray500 }}>
          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Citim doar datele de Shopping. Nu modificam nimic in contul tau.
        </div>

        {/* Preview raport */}
        <div className="mt-16 inline-block w-full max-w-[700px]">
          <div className="rounded-2xl p-3" style={{ background: "#1e293b", boxShadow: "0 32px 80px rgba(0,0,0,0.2),0 0 0 1px rgba(255,255,255,0.05)" }}>
            <div className="mb-3 flex items-center gap-1.5">
              <div aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "#ef4444" }} />
              <div aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "#f59e0b" }} />
              <div aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: "#10b981" }} />
              <div className="ml-2 flex-1 rounded-md px-3 py-1.5 text-xs" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                audit.devrika.ro/google-ads/raport
              </div>
            </div>
            <div className="rounded-xl p-5 text-left md:p-6" style={{ background: "linear-gradient(135deg,#f8f7ff,#f0fafa)" }}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold" style={{ color: "#1e293b" }}>Produse sub ROAS 4,0× · 12 luni</span>
                <span className="rounded-full px-3 py-1 text-[13px] font-extrabold text-white" style={{ background: C.red }}>
                  10.565 lei
                </span>
              </div>
              <table className="w-full text-left text-[13px]" style={{ borderCollapse: "collapse", fontVariantNumeric: "tabular-nums" }}>
                <thead>
                  <tr>
                    <th className="pb-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.gray400 }}>Produs</th>
                    <th className="pb-2 text-right text-[11px] font-bold uppercase tracking-wide" style={{ color: C.gray400 }}>Cheltuit</th>
                    <th className="pb-2 text-right text-[11px] font-bold uppercase tracking-wide" style={{ color: C.gray400 }}>ROAS</th>
                  </tr>
                </thead>
                <tbody>
                  {mockVillains.map((r) => (
                    <tr key={r.p} style={{ borderTop: "1px solid #e6ebf4" }}>
                      <td className="py-2 pr-2" style={{ color: C.gray800 }}>{r.p}</td>
                      <td className="py-2 text-right font-semibold" style={{ color: C.gray800 }}>{r.cost}</td>
                      <td className="py-2 text-right font-bold" style={{ color: C.red }}>{r.roas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "#fff", color: C.gray600 }}>
                <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.orange }} />
                <span><b style={{ color: C.gray800 }}>128 produse</b> din catalog nu au avut nicio afisare in 12 luni.</span>
              </div>
            </div>
          </div>
          <p className="mt-3 text-[12px]" style={{ color: C.gray400 }}>
            Exemplu de raport. In varianta ta apar produsele si sumele din contul tau.
          </p>
        </div>
      </section>

      {/* 2 · SIGURANTA — sus, pentru ca aici e bariera reala */}
      <section className="bg-white px-8 py-16">
        {/* Paragraful asta are si un rol tehnic: reviewerul Google verifica daca pagina
            declarata ca home page explica ce face aplicatia si cu ce date lucreaza. */}
        <p className="mx-auto mb-10 max-w-[760px] text-center text-[15px] leading-relaxed" style={{ color: C.gray500 }}>
          <b style={{ color: "#0f172a" }}>Audit Devrika</b> este aplicatia care face aceasta analiza. Cu
          acordul tau, se conecteaza la contul tau de Google Ads si citeste <b>doar</b> datele
          campaniilor de Shopping din ultimele 12 luni — cheltuiala, afisarile si vanzarile pe
          fiecare produs. Pe baza lor iti arata unde se duc banii. Nu stocam datele contului tau si
          nu facem nicio modificare in el.
        </p>
        <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {safety.map((s) => (
            <div key={s.t} className="flex flex-col gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "#eef0ff" }}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {s.icon}
                </svg>
              </div>
              <p className="text-[15px] font-bold" style={{ fontFamily: sora, color: "#1e293b" }}>{s.t}</p>
              <p className="text-[13.5px] leading-relaxed" style={{ color: C.gray500 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3 · PROBLEMA */}
      <section className="px-8 py-20" style={{ background: "linear-gradient(180deg,#fff 0%,#f8f7ff 100%)" }}>
        <div className="mx-auto max-w-[720px] text-center">
          <h2 className="mb-5 font-extrabold leading-[1.15] tracking-[-1px]"
            style={{ fontFamily: sora, fontSize: "clamp(26px,4vw,38px)", color: "#0f172a" }}>
            Contul merge pe plus, dar nu tot din el
          </h2>
          <p className="mx-auto mb-8 max-w-[580px] text-lg leading-relaxed" style={{ color: C.gray500 }}>
            Intr-o campanie de Shopping, media ascunde adevarul. Cateva produse duc tot rezultatul, iar restul consuma linistit acelasi buget:
          </p>
          <ul className="mx-auto flex max-w-[540px] flex-col gap-3.5 text-left">
            {[
              "Produse pe care cheltuiesti lunar si nu ating niciodata ROAS-ul tau",
              "Produse care nu au vandut nimic, dar continua sa consume",
              "Sute de produse din catalog pe care nu le-a vazut nimeni",
              "Un cost pe click mai mare decat al concurentei, pe aceleasi produse",
            ].map((t) => (
              <li key={t} className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-[15px]"
                style={{ borderColor: "#e8eaf5", color: "#334155" }}>
                <span aria-hidden="true" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ background: brandGradient }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-8 max-w-[540px] text-lg leading-relaxed" style={{ color: C.gray500 }}>
            Raportul le scoate la suprafata <b style={{ color: "#0f172a" }}>cu nume si cu suma</b>.
          </p>
        </div>
      </section>

      {/* 4 · CE AFLI */}
      <section className="bg-white px-8 py-24">
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[2px]" style={{ color: C.cyan }}>Ce afli</p>
        <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontFamily: sora, fontSize: "clamp(28px,4vw,42px)", color: "#0f172a" }}>
          Trei raspunsuri, pe cifrele tale
        </h2>
        <p className="mx-auto mb-14 max-w-[560px] text-center text-base leading-relaxed" style={{ color: C.gray500 }}>
          Marcam clar ce e masurat in contul tau si ce e reper de piata. Nu amestecam.
        </p>
        <div className="mx-auto grid max-w-[1000px] grid-cols-1 items-stretch gap-5 md:grid-cols-3">
          {findings.map((f) => (
            <div key={f.title} className="flex flex-col rounded-2xl border p-6" style={{ borderColor: "#e2e8f0", background: "#fff" }}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "#eef0ff" }}>
                  <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {f.icon}
                  </svg>
                </div>
                <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide"
                  style={{ background: f.tierBg, color: f.tierFg }}>
                  {f.tier}
                </span>
              </div>
              <p className="mb-2 text-[16px] font-bold" style={{ fontFamily: sora, color: "#1e293b" }}>{f.title}</p>
              <p className="text-[14px] leading-relaxed" style={{ color: C.gray500 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5 · CUM FUNCTIONEAZA */}
      <section className="px-8 py-24" style={{ background: "linear-gradient(180deg,#fff 0%,#f8f7ff 100%)" }}>
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[2px]" style={{ color: C.cyan }}>Cum functioneaza</p>
        <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontFamily: sora, fontSize: "clamp(28px,4vw,42px)", color: "#0f172a" }}>
          Sub un minut pana la raport
        </h2>
        <p className="mx-auto mb-16 max-w-[520px] text-center text-base leading-relaxed" style={{ color: C.gray500 }}>
          Nu ai nevoie de cunostinte tehnice si nu trebuie sa exporti nimic din cont.
        </p>
        <div className="relative mx-auto grid max-w-[800px] grid-cols-1 gap-8 md:grid-cols-3">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-[15%] top-7 hidden h-px md:block"
            style={{ background: "linear-gradient(90deg,transparent,#e2e8f0 20%,#e2e8f0 80%,transparent)" }} />
          {steps.map((s) => (
            <div key={s.n} className="relative z-10 text-center">
              <div aria-hidden="true" className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-xl font-extrabold text-white"
                style={{ fontFamily: sora, background: brandGradient }}>
                {s.n}
              </div>
              <p className="mb-1.5 text-[15px] font-bold" style={{ fontFamily: sora, color: "#1e293b" }}>{s.t}</p>
              <p className="text-[13px] leading-relaxed" style={{ color: C.gray500 }}>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 6 · SIMULARE */}
      <section className="bg-white px-8 py-24">
        <p className="mb-3 text-center text-[13px] font-bold uppercase tracking-[2px]" style={{ color: C.cyan }}>Dupa curatare</p>
        <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontFamily: sora, fontSize: "clamp(28px,4vw,42px)", color: "#0f172a" }}>
          Cat ar aduce acelasi buget, curatat
        </h2>
        <p className="mx-auto mb-12 max-w-[600px] text-center text-base leading-relaxed" style={{ color: C.gray500 }}>
          Raportul ia banii ramasi dupa ce tai produsele slabe si ii pune la randamentul produselor care chiar vand la tine. Asa arata:
        </p>
        <div className="mx-auto max-w-[640px] rounded-2xl border p-6 md:p-8" style={{ background: "#fafbff", borderColor: "#e2e8f0" }}>
          <div className="flex flex-col gap-4">
            {[
              { k: "Acum", v: "48.200 lei", pct: 33, color: C.gray400 },
              { k: "Buget curatat, acelasi randament", v: "96.400 lei", pct: 66, color: C.indigo },
              { k: "Buget curatat, marit de 5 ori", v: "241.000 lei", pct: 100, color: C.cyan },
            ].map((r) => (
              <div key={r.k}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-[13.5px]" style={{ color: C.gray600 }}>{r.k}</span>
                  <span className="text-[15px] font-bold" style={{ color: "#1e293b", fontVariantNumeric: "tabular-nums" }}>{r.v}</span>
                </div>
                <div className="overflow-hidden rounded-sm" style={{ height: 8, background: "#e9eef7" }}>
                  <div style={{ width: `${r.pct}%`, height: "100%", background: r.color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[12px] leading-relaxed" style={{ color: C.gray400 }}>
            Simulare, nu promisiune — un plafon optimist care presupune ca produsele bune tin acelasi randament la buget mai mare. E venit, nu profit: profitul depinde de marja ta, pe care ti-o cerem la pasul 2. Cifrele de mai sus sunt exemplu.
          </p>
        </div>
      </section>

      {/* 7 · CTA FINAL */}
      <section className="relative overflow-hidden px-8 py-24 text-center" style={{ background: brandGradient }}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-15"
          style={{ backgroundImage: "radial-gradient(circle at 2px 2px,white 1px,transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10">
          <h2 className="mx-auto mb-4 max-w-[660px] font-black text-white leading-[1.1] tracking-[-1.5px]"
            style={{ fontFamily: sora, fontSize: "clamp(28px,5vw,52px)" }}>
            Vezi ce produse iti ard bugetul
          </h2>
          <p className="mb-10 text-lg" style={{ color: "rgba(255,255,255,0.85)" }}>
            Gratuit, pe cifrele tale reale. Fara card si fara discutie de vanzare inainte.
          </p>
          <Link href={CONNECT_HREF}
            className="inline-flex items-center gap-2.5 rounded-[14px] bg-white px-10 py-[18px] text-[17px] font-extrabold transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            style={{ fontFamily: sora, color: C.indigo, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            Conecteaza contul Google Ads
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
          <p className="mt-5 text-[13px]" style={{ color: "rgba(255,255,255,0.75)" }}>
            Nu ai inca reclame pe Shopping?{" "}
            <Link href="/audit-seo" className="font-bold text-white underline underline-offset-2">
              Incearca auditul magazinului
            </Link>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="px-8 py-10 text-center" style={{ background: "#0f172a" }}>
        <div className="mb-4 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={30} height={30} className="h-[30px] w-[30px]" />
          <span className="text-base font-extrabold text-white">Devrika</span>
        </div>
        {/* Linkurile legale stau AICI, pe pagina declarata ca home page al aplicatiei, si
            trimit catre pagini de pe ACELASI host. Google respinge brandingul cand politica
            de confidentialitate lipseste de pe home page sau sta pe alt domeniu. */}
        <p className="mb-2 text-[13px]" style={{ color: "#475569" }}>
          <Link href="/confidentialitate" className="transition-colors hover:text-[#0ABECF]" style={{ color: C.cyan }}>
            Politica de confidentialitate
          </Link>
          {" · "}
          <Link href="/termeni" className="transition-colors hover:text-[#0ABECF]" style={{ color: C.cyan }}>
            Termeni si conditii
          </Link>
        </p>
        <p className="text-[13px]" style={{ color: "#475569" }}>
          © {new Date().getFullYear()} Devrika ·{" "}
          <Link href="/audit-seo" className="transition-colors hover:text-[#0ABECF]" style={{ color: C.cyan }}>Audit magazine online</Link>
          {" · "}
          <a href="https://devrika.ro" className="transition-colors hover:text-[#0ABECF]" style={{ color: C.cyan }}>devrika.ro</a>
        </p>
      </footer>

    </div>
  );
}
