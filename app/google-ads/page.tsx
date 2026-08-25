import Link from "next/link";
import { C, sora, inter, brandGradient } from "@/lib/theme";
import { AUDIT_WINDOW_LABEL } from "@/lib/gads-intake";
import { publicOAuthAttributes, publicOAuthProjection } from "@/lib/gads-public-oauth-contract";

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
  description: publicOAuthProjection.landingMetadata(AUDIT_WINDOW_LABEL),
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
      `Fiecare produs din Shopping care a cheltuit bani si a stat sub ROAS-ul tau minim, cu suma exacta pe ultimele ${AUDIT_WINDOW_LABEL}. `
      + "Adunate, iti dau banii dusi pe produse care nu ating targetul.",
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
    d: `Pe loc, pe cifrele tale din ultimele ${AUDIT_WINDOW_LABEL}. Fara asteptare si fara discutie de vanzare inainte.`,
  },
];

const safety = [
  {
    t: publicOAuthProjection.readsOnlyLabel,
    d: publicOAuthProjection.noAccountChanges,
    icon: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></>,
  },
  {
    t: "Datele necesare auditului",
    d: `${publicOAuthProjection.auditDataReadDisclosure} ${publicOAuthProjection.googleAdsPermission}`,
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
    <div {...publicOAuthAttributes("landing")} className="overflow-x-hidden" style={{ fontFamily: inter }}>

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

      <section className="relative overflow-hidden px-5 pb-20 pt-28 sm:px-8 sm:pb-24 sm:pt-36"
        style={{ background: "linear-gradient(145deg,#f7f7fd 0%,#ffffff 58%,#f1fbfc 100%)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-44 -top-52 h-[680px] w-[680px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(10,190,207,0.11) 0%,transparent 68%)" }} />
        <div className="relative mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-20">
          <div className="text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em]"
              style={{ borderColor: "rgba(71,73,158,0.15)", color: C.indigo, boxShadow: "0 8px 24px rgba(35,38,95,0.05)" }}>
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: C.green }} />
              Audit Google Ads · Gratuit
            </div>

            <h1 className="mb-7 max-w-[650px] font-black leading-[1.02] tracking-[-2.5px]"
              style={{ fontFamily: sora, fontSize: "clamp(42px,6vw,72px)", color: C.navy }}>
              Vezi cati bani pierzi in Google Shopping
            </h1>

            <p className="mb-5 max-w-[600px] text-xl leading-[1.55]" style={{ color: C.gray600 }}>
              Contul poate arata profitabil in total, in timp ce unele produse consuma buget fara sa atinga pragul tau de rentabilitate.
            </p>
            <p className="mb-9 max-w-[590px] text-base leading-relaxed" style={{ color: C.gray500 }}>
              Audit Devrika analizeaza performanta produselor din ultimele {AUDIT_WINDOW_LABEL}, identifica pierderile cu cea mai mare valoare si arata unde exista potential de crestere.
            </p>

            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link href={CONNECT_HREF}
                className="inline-flex min-h-14 items-center gap-2.5 rounded-xl px-7 text-base font-bold text-white transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                style={{ background: C.navy, boxShadow: "0 12px 30px rgba(19,22,58,0.2)", outlineColor: C.indigo }}>
                Vezi pierderile din contul tau
                <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <span className="flex items-center gap-2 text-sm" style={{ color: C.gray500 }}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                {publicOAuthProjection.noAccountChanges}
              </span>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t pt-6 text-sm" style={{ borderColor: C.border, color: C.gray600 }}>
              <span><b style={{ color: C.navy }}>{AUDIT_WINDOW_LABEL}</b> de date</span>
              <span><b style={{ color: C.navy }}>Top 10</b> pierderi</span>
              <span><b style={{ color: C.navy }}>PDF</b> salvat</span>
            </div>
          </div>

          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-5 rounded-[32px] opacity-60 blur-2xl"
              style={{ background: "linear-gradient(135deg,rgba(71,73,158,0.12),rgba(10,190,207,0.12))" }} />
            <div className="relative overflow-hidden rounded-[24px] border bg-white"
              style={{ borderColor: "rgba(71,73,158,0.12)", boxShadow: "0 32px 80px rgba(19,22,58,0.14)" }}>
              <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: C.border }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.indigo }}>Exemplu din raport</p>
                  <p className="mt-1 text-sm font-semibold" style={{ color: C.navy }}>Produse sub pragul de rentabilitate</p>
                </div>
                <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: C.greenBg, color: C.green }}>
                  Masurat din Google Ads
                </span>
              </div>

              <div className="grid grid-cols-2 border-b" style={{ borderColor: C.border }}>
                <div className="border-r p-5" style={{ borderColor: C.border }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.gray400 }}>Cost sub ROAS minim</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums" style={{ fontFamily: sora, color: C.red }}>10.565 lei</p>
                </div>
                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.gray400 }}>Produse afectate</p>
                  <p className="mt-2 text-3xl font-extrabold tabular-nums" style={{ fontFamily: sora, color: C.navy }}>37</p>
                </div>
              </div>

              <div className="px-5 py-2">
                {mockVillains.map((row, index) => (
                  <div key={row.p} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-b py-4 last:border-b-0"
                    style={{ borderColor: C.border }}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold" style={{ color: C.gray800 }}>{row.p}</p>
                      <p className="mt-1 text-xs" style={{ color: C.gray400 }}>Prioritatea {index + 1}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide" style={{ color: C.gray400 }}>Cost</p>
                      <p className="mt-1 text-sm font-semibold tabular-nums" style={{ color: C.gray800 }}>{row.cost}</p>
                    </div>
                    <span className="min-w-[58px] rounded-lg px-2.5 py-2 text-center text-sm font-extrabold tabular-nums"
                      style={{ background: C.redBg, color: C.red }}>
                      {row.roas}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mx-5 mb-5 flex items-start gap-3 rounded-xl p-4" style={{ background: "#f5f7ff" }}>
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: "#e8eaff" }}>
                  <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18" /><path d="m7 15 4-4 4 4 5-6" />
                  </svg>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: C.gray600 }}>
                  Raportul arata si produsele profitabile care primesc prea putin trafic, ordonate dupa potentialul pierdut.
                </p>
              </div>
            </div>
            <p className="mt-4 text-center text-xs" style={{ color: C.gray400 }}>
              Cifre demonstrative. Raportul tau foloseste exclusiv datele contului conectat.
            </p>
          </div>
        </div>
      </section>

      {/* 2 · SIGURANTA — sus, pentru ca aici e bariera reala */}
      <section className="bg-white px-8 py-16">
        {/* Paragraful asta are si un rol tehnic: reviewerul Google verifica daca pagina
            declarata ca home page explica ce face aplicatia si cu ce date lucreaza. */}
        <p className="mx-auto mb-10 max-w-[760px] text-center text-[15px] leading-relaxed" style={{ color: C.gray500 }}>
          <b style={{ color: "#0f172a" }}>Audit Devrika</b> este aplicatia care face aceasta analiza. Cu
          acordul tau, se conecteaza la contul tau de Google Ads si citeste <b>doar</b>
          {` ${publicOAuthProjection.auditDataCategories}. Nu stocam datele contului tau si nu facem nicio modificare in el.`}
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
