import Link from "next/link";
import { C, sora, inter, brandGradient } from "@/lib/theme";
import { AUDIT_WINDOW_LABEL } from "@/lib/gads-intake";
import { publicOAuthAttributes, publicOAuthProjection } from "@/lib/gads-public-oauth-contract";

const CONNECT_HREF = "/google-ads/connect";

export const metadata = {
  title: "Audit Google Ads gratuit — Devrika",
  description: publicOAuthProjection.landingMetadata(AUDIT_WINDOW_LABEL),
};

const losingProducts = [
  { product: "Rochie office bleumarin", cost: "4.820 lei", sales: "2.110 lei", roas: "0,8×", loss: "-2.710 lei" },
  { product: "Set 3 tricouri bumbac", cost: "3.140 lei", sales: "2.760 lei", roas: "1,2×", loss: "-1.390 lei" },
  { product: "Geanta piele ecologica", cost: "2.605 lei", sales: "0 lei", roas: "0,0×", loss: "-2.605 lei" },
];

const growthProducts = [
  { product: "Pantofi sport barbati", sales: "5.460 lei", roas: "13,0×", opportunity: "+8.190 lei" },
  { product: "Geaca dama impermeabila", sales: "3.720 lei", roas: "12,0×", opportunity: "+5.580 lei" },
  { product: "Rucsac urban premium", sales: "2.090 lei", roas: "11,0×", opportunity: "+3.135 lei" },
];

const steps = [
  ["01", "Conectezi contul Google Ads", "Te autentifici direct la Google. Parola ta nu trece prin noi, iar aplicatia nu modifica reclame, campanii sau bugete."],
  ["02", "Stabilim pragul tau de rentabilitate", "Confirmi valoarea medie a unei comenzi si costul marfii. Calculam automat CPA-ul maxim si ROAS-ul minim pentru magazinul tau."],
  ["03", "Vezi performanta fiecarui produs", `Analizam ultimele ${AUDIT_WINDOW_LABEL}, ordonam pierderile si oportunitatile dupa bani si iti salvam raportul ca PDF.`],
];

function ArrowIcon() {
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}

function PrimaryButton({ light = false }: { light?: boolean }) {
  return (
    <Link href={CONNECT_HREF} className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-xl px-7 text-base font-extrabold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={light ? { background: "white", color: C.navy } : { background: C.navy, color: "white", boxShadow: "0 12px 30px rgba(19,22,58,0.2)" }}>
      Analizeaza contul meu <ArrowIcon />
    </Link>
  );
}

function LossRows({ detailed = false }: { detailed?: boolean }) {
  return (
    <div className="px-5 py-2">
      {losingProducts.map((row) => (
        <div key={row.product} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b py-4 last:border-b-0" style={{ borderColor: C.border }}>
          <div className="min-w-0">
            <p data-report-product-name={detailed ? "visible" : undefined} className="break-words text-sm font-bold leading-snug" style={{ color: C.gray800 }}>{row.product}</p>
            <p className="mt-1 text-xs" style={{ color: C.gray400 }}>Cost {row.cost} · {detailed ? `Vanzari ${row.sales} · ` : ""}ROAS {row.roas}</p>
          </div>
          <span className="self-center rounded-lg px-2.5 py-2 text-sm font-extrabold tabular-nums" style={{ background: C.redBg, color: C.red }}>{row.loss}</span>
        </div>
      ))}
    </div>
  );
}

export default function GoogleAdsLanding() {
  return (
    <div {...publicOAuthAttributes("landing")} className="overflow-x-hidden" style={{ fontFamily: inter }}>
      <nav className="fixed inset-x-0 top-0 z-50 border-b px-5 sm:px-8" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", borderColor: "rgba(71,73,158,0.08)" }}>
        <div className="mx-auto flex h-16 max-w-[1160px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-devrika.png" alt="Audit Devrika" width={36} height={36} className="h-9 w-9" />
            <span className="text-base font-extrabold" style={{ color: C.navy }}>Audit Devrika</span>
          </Link>
          <Link href={CONNECT_HREF} className="flex min-h-11 items-center rounded-lg px-4 text-sm font-bold text-white sm:px-5" style={{ background: brandGradient }}>Conecteaza contul →</Link>
        </div>
      </nav>

      <section data-landing-section="hero" className="relative overflow-hidden px-5 pb-20 pt-28 sm:px-8 sm:pb-24 sm:pt-36" style={{ background: "linear-gradient(145deg,#f7f7fd 0%,#ffffff 58%,#f1fbfc 100%)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-44 -top-52 h-[680px] w-[680px] rounded-full" style={{ background: "radial-gradient(circle,rgba(10,190,207,0.11) 0%,transparent 68%)" }} />
        <div className="relative mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ borderColor: "rgba(71,73,158,0.15)", color: C.indigo }}>
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: C.green }} /> Audit Google Ads · Gratuit
            </div>
            <h1 className="mb-7 max-w-[680px] font-black leading-[1.02] tracking-[-2.5px]" style={{ fontFamily: sora, fontSize: "clamp(40px,5.6vw,68px)", color: C.navy }}>
              Stii ce produse din Google Shopping iti aduc bani si care iti consuma bugetul?
            </h1>
            <p className="mb-9 max-w-[630px] text-xl leading-[1.55]" style={{ color: C.gray600 }}>
              Primesti o analiza produs cu produs. Vezi ce produse iti consuma bugetul fara sa aduca suficiente vanzari si ce produse au rezultate bune, dar sunt promovate prea putin. Astfel, stii ce produse trebuie limitate si in care merita sa investesti mai mult.
            </p>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <PrimaryButton />
              <a href="#report-preview" className="inline-flex min-h-14 items-center text-sm font-extrabold underline decoration-2 underline-offset-4" style={{ color: C.indigo }}>Vezi un exemplu de raport</a>
              <span className="flex items-center gap-2 text-sm" style={{ color: C.gray500 }}><span aria-hidden="true" style={{ color: C.green }}>✓</span>{publicOAuthProjection.noAccountChanges}</span>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t pt-6 text-sm" style={{ borderColor: C.border, color: C.gray600 }}>
              <span><b style={{ color: C.navy }}>{AUDIT_WINDOW_LABEL}</b> de date</span><span><b style={{ color: C.navy }}>Produs cu produs</b></span><span><b style={{ color: C.navy }}>PDF</b> salvat</span>
            </div>
          </div>

          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-5 rounded-[32px] opacity-60 blur-2xl" style={{ background: "linear-gradient(135deg,rgba(71,73,158,0.12),rgba(10,190,207,0.12))" }} />
            <div className="relative overflow-hidden rounded-[24px] border bg-white" style={{ borderColor: "rgba(71,73,158,0.12)", boxShadow: "0 32px 80px rgba(19,22,58,0.14)" }}>
              <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: C.border }}>
                <div><p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.indigo }}>Exemplu din raport</p><p className="mt-1 text-sm font-semibold" style={{ color: C.navy }}>Produse care au consumat buget si au produs pierderi</p></div>
                <span className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: C.greenBg, color: C.green }}>Model de raport</span>
              </div>
              <div className="grid grid-cols-2 border-b" style={{ borderColor: C.border }}>
                <div className="border-r p-5" style={{ borderColor: C.border }}><p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.gray400 }}>Buget consumat</p><p className="mt-2 text-3xl font-extrabold" style={{ fontFamily: sora, color: C.red }}>10.565 lei</p></div>
                <div className="p-5"><p className="text-xs font-semibold uppercase tracking-wide" style={{ color: C.gray400 }}>Pierdere estimata</p><p className="mt-2 text-3xl font-extrabold" style={{ fontFamily: sora, color: C.red }}>-6.705 lei</p></div>
              </div>
              <LossRows detailed />
            </div>
            <p className="mt-4 text-center text-xs" style={{ color: C.gray400 }}>Exemplu demonstrativ. Raportul tau foloseste datele reale din contul conectat.</p>
          </div>
        </div>
      </section>

      <section data-landing-section="problems" className="bg-white px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1160px]">
          <div className="mx-auto mb-14 max-w-[780px] text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>Problema ascunsa de media contului</p>
            <h2 className="font-black leading-[1.08] tracking-[-1.4px]" style={{ fontFamily: sora, fontSize: "clamp(32px,4.5vw,52px)", color: C.navy }}>De ce poti pierde bani chiar daca ROAS-ul contului pare bun</h2>
            <p className="mx-auto mt-6 max-w-[680px] text-lg leading-relaxed" style={{ color: C.gray500 }}>Google optimizeaza pentru vanzari, dar nu stie automat cat profit iti ramane din fiecare produs.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <article data-problem-example="shared-budget" className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: C.border }}>
              <div className="p-6"><span className="text-xs font-extrabold" style={{ color: C.indigo }}>01</span><h3 className="mt-3 text-xl font-extrabold leading-tight" style={{ fontFamily: sora, color: C.navy }}>Toate produsele concureaza pentru acelasi buget</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>Google distribuie bugetul dupa sansele de vanzare, nu dupa profitul real pe care ti-l lasa fiecare produs.</p></div>
              <div className="border-t p-6" style={{ borderColor: C.border, background: "#f7f8fc" }}>
                <p className="mb-4 text-xs font-bold uppercase tracking-wide" style={{ color: C.gray400 }}>Unde s-a dus bugetul</p>
                {[["Produs foarte cautat", "72%", C.red], ["Produs profitabil", "18%", C.green], ["Restul catalogului", "10%", C.gray400]].map(([name, value, color]) => <div key={name} className="mb-4 last:mb-0"><div className="mb-1.5 flex justify-between gap-3 text-xs"><span style={{ color: C.gray600 }}>{name}</span><b style={{ color }}>{value}</b></div><div className="h-2 overflow-hidden rounded-full" style={{ background: "#e8ebf2" }}><div className="h-full rounded-full" style={{ width: value, background: color }} /></div></div>)}
                <p className="mt-5 text-xs" style={{ color: C.gray400 }}>Exemplu demonstrativ</p>
              </div>
            </article>

            <article data-problem-example="traffic-without-profit" className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: C.border }}>
              <div className="p-6"><span className="text-xs font-extrabold" style={{ color: C.indigo }}>02</span><h3 className="mt-3 text-xl font-extrabold leading-tight" style={{ fontFamily: sora, color: C.navy }}>Traficul mare nu inseamna profit</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>Un produs poate primi foarte multe clickuri si poate consuma cea mai mare parte din buget, dar sa fie extrem de neprofitabil.</p></div>
              <div className="border-t p-6" style={{ borderColor: C.border, background: "#fff8f8" }}>
                <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold" style={{ color: C.navy }}>Produs cu trafic mare</p><p className="mt-1 text-xs" style={{ color: C.gray400 }}>3.840 clickuri</p></div><span className="rounded-lg px-3 py-2 text-sm font-extrabold" style={{ background: C.redBg, color: C.red }}>ROAS 1,1×</span></div>
                <div className="mt-6 grid grid-cols-2 gap-3"><div><p className="text-xs" style={{ color: C.gray400 }}>Cost reclame</p><p className="mt-1 font-bold" style={{ color: C.navy }}>6.200 lei</p></div><div><p className="text-xs" style={{ color: C.gray400 }}>Pierdere estimata</p><p className="mt-1 font-bold" style={{ color: C.red }}>-3.450 lei</p></div></div>
                <p className="mt-5 text-xs" style={{ color: C.gray400 }}>Exemplu demonstrativ</p>
              </div>
            </article>

            <article data-problem-example="css-cost" className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: C.border }}>
              <div className="p-6"><span className="text-xs font-extrabold" style={{ color: C.indigo }}>03</span><h3 className="mt-3 text-xl font-extrabold leading-tight" style={{ fontFamily: sora, color: C.navy }}>Fara un CSS partener, platesti cu aproximativ 20% mai mult per click</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>Un cost per click mai mic inseamna mai mult trafic, mai multe vanzari si un ROAS mai mare din acelasi buget.</p></div>
              <div className="border-t p-5" style={{ borderColor: C.border, background: "#f6fbfb" }}>
                <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-white" style={{ borderColor: C.border }}>
                  <div className="border-r p-3" style={{ borderColor: C.border }}><p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.red }}>De la Google</p><p className="mt-2 text-lg font-extrabold" style={{ color: C.navy }}>1 leu / click</p><p className="mt-3 text-xs" style={{ color: C.gray500 }}>Vanzari 5.000 lei</p><p className="mt-1 text-xs font-bold" style={{ color: C.navy }}>ROAS 5×</p></div>
                  <div className="p-3"><p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: C.green }}>De la CSS partener</p><p className="mt-2 text-lg font-extrabold" style={{ color: C.navy }}>0,80 lei / click</p><p className="mt-3 text-xs" style={{ color: C.gray500 }}>Vanzari 6.250 lei</p><p className="mt-1 text-xs font-bold" style={{ color: C.green }}>ROAS 6,25×</p></div>
                </div>
                <p className="mt-4 text-center text-sm font-extrabold" style={{ color: C.green }}>+1.250 lei in vanzari estimate</p><p className="mt-2 text-center text-[11px] leading-relaxed" style={{ color: C.gray400 }}>Simulare la acelasi buget, aceeasi rata de conversie si aceeasi comanda medie.</p>
              </div>
            </article>
          </div>
          <p className="mt-10 text-center text-lg font-bold" style={{ color: C.navy }}>Media contului ascunde problema. Auditul iti arata fiecare produs in parte.</p>
        </div>
      </section>

      <section id="report-preview" data-landing-section="evidence" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24" style={{ background: "#f6f7fc" }}>
        <div className="mx-auto max-w-[1160px]">
          <div className="mx-auto mb-14 max-w-[760px] text-center"><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>Cifre reale, nu concluzii vagi</p><h2 className="font-black leading-[1.08] tracking-[-1.4px]" style={{ fontFamily: sora, fontSize: "clamp(32px,4.5vw,52px)", color: C.navy }}>Vezi cu ochii tai unde se duc banii</h2><p className="mx-auto mt-6 max-w-[680px] text-lg leading-relaxed" style={{ color: C.gray500 }}>Raportul foloseste datele din contul tau si separa clar produsele care consuma buget de cele in care merita sa investesti mai mult.</p></div>
          <div className="grid gap-7 lg:grid-cols-2">
            <article data-evidence-example="losses" className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: C.border }}>
              <div className="border-b p-6" style={{ borderColor: C.border }}><p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.red }}>Opresti risipa</p><h3 className="mt-2 text-2xl font-extrabold" style={{ fontFamily: sora, color: C.navy }}>Produse care iti consuma bugetul</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>Au primit trafic si au cheltuit bani, dar nu au generat suficiente vanzari. Cea mai mare pierdere apare prima.</p></div><LossRows />
            </article>
            <article data-evidence-example="growth" className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: C.border }}>
              <div className="border-b p-6" style={{ borderColor: C.border }}><p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.green }}>Recuperezi cresterea</p><h3 className="mt-2 text-2xl font-extrabold" style={{ fontFamily: sora, color: C.navy }}>Produse care merita promovate mai mult</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>Au demonstrat ca pot genera vanzari profitabile, dar primesc prea putin trafic. Cea mai mare oportunitate apare prima.</p></div>
              <div className="px-5 py-2">{growthProducts.map((row) => <div key={row.product} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 border-b py-4 last:border-b-0" style={{ borderColor: C.border }}><div><p className="break-words text-sm font-bold" style={{ color: C.navy }}>{row.product}</p><p className="mt-1 text-xs" style={{ color: C.gray400 }}>Vanzari {row.sales} · ROAS {row.roas}</p></div><span className="self-center rounded-lg px-2.5 py-2 text-sm font-extrabold" style={{ background: C.greenBg, color: C.green }}>{row.opportunity}</span></div>)}</div>
            </article>
          </div>
          <p className="mt-6 text-center text-xs" style={{ color: C.gray400 }}>Exemple demonstrative. In raport, valorile istorice sunt masurate din Google Ads, iar estimarile sunt etichetate separat.</p>
        </div>
      </section>

      <section data-landing-section="steps" className="bg-white px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
            <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>Trei pasi simpli</p><h2 className="font-black leading-[1.08] tracking-[-1.2px]" style={{ fontFamily: sora, fontSize: "clamp(30px,4vw,46px)", color: C.navy }}>De la conectare la raport</h2><p className="mt-5 max-w-[420px] text-base leading-relaxed" style={{ color: C.gray500 }}>Nu exporti fisiere si nu trebuie sa cunosti termenii Google Ads.</p></div>
            <div className="border-t" style={{ borderColor: C.border }}>{steps.map(([number, title, body]) => <div key={number} data-process-step={number} className="grid grid-cols-[48px_minmax(0,1fr)] gap-5 border-b py-6 sm:grid-cols-[48px_210px_minmax(0,1fr)]" style={{ borderColor: C.border }}><span className="text-base font-extrabold" style={{ fontFamily: sora, color: C.indigo }}>{number}</span><p className="text-base font-bold" style={{ color: C.navy }}>{title}</p><p className="col-start-2 text-sm leading-relaxed sm:col-start-3" style={{ color: C.gray500 }}>{body}</p></div>)}</div>
          </div>
          <div className="mt-14 grid gap-7 border-y py-8 lg:grid-cols-[0.78fr_1.22fr]" style={{ borderColor: C.border }}>
            <div><p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>Controlul ramane la tine</p><h3 className="mt-2 text-2xl font-extrabold" style={{ fontFamily: sora, color: C.navy }}>Iti citim cifrele. Nu atingem campaniile.</h3></div>
            <div>
              <div className="grid gap-5 sm:grid-cols-3">{[[publicOAuthProjection.readsOnlyLabel, publicOAuthProjection.noAccountChanges], ["Acces revocabil", "Il retragi oricand, direct din contul tau Google."], ["Fara card", "Raportul este gratuit si nu porneste niciun abonament."]].map(([title, body]) => <div key={title} className="border-t pt-4" style={{ borderColor: C.border }}><p className="text-sm font-bold" style={{ color: C.navy }}>{title}</p><p className="mt-1.5 text-sm leading-relaxed" style={{ color: C.gray500 }}>{body}</p></div>)}</div>
              <details data-oauth-disclosure="progressive" className="group mt-7 border-t pt-5" style={{ borderColor: C.border }}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold" style={{ color: C.indigo }}>Exact ce date citim<span aria-hidden="true" className="text-lg transition-transform group-open:rotate-45">+</span></summary><p className="mt-4 max-w-[760px] text-sm leading-relaxed" style={{ color: C.gray500 }}><b style={{ color: C.navy }}>Audit Devrika</b> se conecteaza numai cu acordul tau.{` ${publicOAuthProjection.auditDataReadDisclosure} ${publicOAuthProjection.googleAdsPermission}`} Nu stocam datele contului tau si nu facem nicio modificare in el.</p></details>
            </div>
          </div>
        </div>
      </section>

      <section data-landing-section="cta" className="px-5 pb-8 sm:px-8 sm:pb-10">
        <div className="mx-auto grid max-w-[1160px] gap-9 overflow-hidden rounded-[28px] px-7 py-12 sm:px-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-16 lg:py-14" style={{ background: C.navy }}>
          <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.cyan }}>Raport gratuit</p><h2 className="max-w-[720px] font-black leading-[1.08] tracking-[-1.2px] text-white" style={{ fontFamily: sora, fontSize: "clamp(30px,4.5vw,48px)" }}>Vezi ce produse trebuie limitate si in care merita sa investesti mai mult.</h2><p className="mt-4 text-base" style={{ color: "rgba(255,255,255,0.72)" }}>Pe datele tale reale. Fara card. Fara modificari in Google Ads.</p></div><PrimaryButton light />
        </div>
      </section>

      <footer className="px-8 py-10 text-center" style={{ background: "#0f172a" }}>
        <div className="mb-4 flex items-center justify-center gap-2.5">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo-devrika.png" alt="Devrika" width={30} height={30} className="h-[30px] w-[30px]" /><span className="text-base font-extrabold text-white">Devrika</span></div>
        <p className="mb-2 text-[13px]" style={{ color: "#475569" }}><Link href="/confidentialitate" style={{ color: C.cyan }}>Politica de confidentialitate</Link>{" · "}<Link href="/termeni" style={{ color: C.cyan }}>Termeni si conditii</Link></p>
        <p className="text-[13px]" style={{ color: "#475569" }}>© {new Date().getFullYear()} Devrika · <a href="https://devrika.ro" style={{ color: C.cyan }}>devrika.ro</a></p>
      </footer>
    </div>
  );
}
