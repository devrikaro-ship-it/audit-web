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

const steps = [
  {
    n: "1",
    t: "Conectezi contul",
    d: "Te autentifici direct la Google, ca la orice aplicatie. Parola ta nu trece prin noi.",
  },
  {
    n: "2",
    t: "Confirmi doua valori simple",
    d: "Valoarea medie a unei comenzi si cat te costa marfa din ea. Noi calculam pragul de rentabilitate.",
  },
  {
    n: "3",
    t: "Primesti raportul",
    d: `Pe loc, pe cifrele tale din ultimele ${AUDIT_WINDOW_LABEL}. Fara asteptare si fara discutie de vanzare inainte.`,
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

      <section data-landing-section="hero" className="relative overflow-hidden px-5 pb-20 pt-28 sm:px-8 sm:pb-24 sm:pt-36"
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
                      <p data-report-product-name="visible" className="break-words text-sm font-bold leading-snug" style={{ color: C.gray800 }}>{row.p}</p>
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

      <section data-landing-section="trust" className="bg-white px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-[1100px] border-y py-8" style={{ borderColor: C.border }}>
          <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>Controlul ramane la tine</p>
              <h2 className="max-w-[430px] text-2xl font-extrabold leading-tight tracking-[-0.6px] sm:text-3xl" style={{ fontFamily: sora, color: C.navy }}>
                Iti citim cifrele. Nu atingem campaniile.
              </h2>
            </div>
            <div>
              <div className="grid gap-5 sm:grid-cols-3">
                {[
                  [publicOAuthProjection.readsOnlyLabel, publicOAuthProjection.noAccountChanges],
                  ["Acces revocabil", "Il retragi oricand, direct din contul tau Google."],
                  ["Fara card", "Raportul este gratuit si nu porneste niciun abonament."],
                ].map(([title, body]) => (
                  <div key={title} className="border-t pt-4" style={{ borderColor: C.border }}>
                    <p className="text-sm font-bold" style={{ color: C.navy }}>{title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed" style={{ color: C.gray500 }}>{body}</p>
                  </div>
                ))}
              </div>
              <details data-oauth-disclosure="progressive" className="group mt-7 border-t pt-5" style={{ borderColor: C.border }}>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold" style={{ color: C.indigo }}>
                  Exact ce date citim
                  <span aria-hidden="true" className="text-lg transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 max-w-[760px] text-sm leading-relaxed" style={{ color: C.gray500 }}>
                  <b style={{ color: C.navy }}>Audit Devrika</b> se conecteaza numai cu acordul tau.
                  {` ${publicOAuthProjection.auditDataReadDisclosure} ${publicOAuthProjection.googleAdsPermission}`}
                  {` Nu stocam datele contului tau si nu facem nicio modificare in el.`}
                </p>
              </details>
            </div>
          </div>
        </div>
      </section>

      <section data-landing-section="proof" className="px-5 py-20 sm:px-8 sm:py-24" style={{ background: "#f6f7fc" }}>
        <div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center lg:gap-20">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>Ce primesti in raport</p>
            <h2 className="max-w-[480px] font-black leading-[1.08] tracking-[-1.4px]" style={{ fontFamily: sora, fontSize: "clamp(32px,4.5vw,52px)", color: C.navy }}>
              Nu o medie. Produsele, pe nume si in ordinea banilor.
            </h2>
            <p className="mt-6 max-w-[500px] text-lg leading-relaxed" style={{ color: C.gray500 }}>
              Raportul separa ce consuma sub prag de ce merita mai mult trafic. Fiecare cifra spune clar daca este masurata sau estimata.
            </p>
          </div>
          <div className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: "rgba(71,73,158,0.13)", boxShadow: "0 24px 60px rgba(19,22,58,0.09)" }}>
            <div className="flex items-center justify-between border-b px-6 py-5" style={{ borderColor: C.border }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.indigo }}>Prioritatea raportului</p>
                <p className="mt-1 text-sm font-semibold" style={{ color: C.navy }}>Banii cu cel mai mare impact, primii</p>
              </div>
              <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: C.greenBg, color: C.green }}>Masurat</span>
            </div>
            {[
              ["01", "Opresti pierderea cea mai mare", "Produsele sub prag, ordonate dupa cost", "10.565 lei"],
              ["02", "Recuperezi cresterea ratata", "Produsele profitabile cu prea putin trafic", "Top 10"],
              ["03", "Vezi contul dupa optimizare", "Aceeasi bani mutati spre produsele dovedite", "Simulare"],
            ].map(([number, title, body, value]) => (
              <div key={number} data-proof-row={number} className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-4 border-b px-6 py-5 last:border-b-0" style={{ borderColor: C.border }}>
                <span className="text-sm font-extrabold tabular-nums" style={{ color: C.indigo }}>{number}</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: C.navy }}>{title}</p>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: C.gray500 }}>{body}</p>
                </div>
                <span className="text-right text-sm font-extrabold" style={{ color: number === "01" ? C.red : C.navy }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-landing-section="steps" className="bg-white px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-[1100px] gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>Trei pasi</p>
            <h2 className="font-black leading-[1.08] tracking-[-1.2px]" style={{ fontFamily: sora, fontSize: "clamp(30px,4vw,46px)", color: C.navy }}>
              Sub un minut pana incepe analiza.
            </h2>
            <p className="mt-5 max-w-[420px] text-base leading-relaxed" style={{ color: C.gray500 }}>
              Nu exporti fisiere si nu trebuie sa cunosti termenii Google Ads.
            </p>
          </div>
          <div className="border-t" style={{ borderColor: C.border }}>
            {steps.map((step) => (
              <div key={step.n} data-process-step={step.n} className="grid grid-cols-[48px_minmax(0,1fr)] gap-5 border-b py-6 sm:grid-cols-[48px_190px_minmax(0,1fr)]" style={{ borderColor: C.border }}>
                <span className="text-base font-extrabold tabular-nums" style={{ fontFamily: sora, color: C.indigo }}>0{step.n}</span>
                <p className="text-base font-bold" style={{ color: C.navy }}>{step.t}</p>
                <p className="col-start-2 text-sm leading-relaxed sm:col-start-3" style={{ color: C.gray500 }}>{step.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section data-landing-section="cta" className="px-5 pb-8 sm:px-8 sm:pb-10">
        <div className="mx-auto grid max-w-[1160px] gap-9 overflow-hidden rounded-[28px] px-7 py-12 sm:px-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-16 lg:py-14" style={{ background: C.navy }}>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.cyan }}>Audit gratuit</p>
            <h2 className="max-w-[700px] font-black leading-[1.08] tracking-[-1.2px] text-white" style={{ fontFamily: sora, fontSize: "clamp(30px,4.5vw,48px)" }}>
              Vezi unde se opreste profitul din contul tau.
            </h2>
            <p className="mt-4 text-base" style={{ color: "rgba(255,255,255,0.72)" }}>Pe datele tale reale. Fara card. Fara modificari in Google Ads.</p>
          </div>
          <Link href={CONNECT_HREF} className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-xl bg-white px-7 text-base font-extrabold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none motion-reduce:hover:translate-y-0" style={{ color: C.navy }}>
            Conecteaza contul
            <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
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
