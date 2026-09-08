import Link from "next/link";
import Image from "next/image";
import { C, sora, inter, brandGradient } from "@/lib/theme";
import { AUDIT_WINDOW_LABEL } from "@/lib/gads-intake";
import { publicOAuthAttributes, publicOAuthProjection } from "@/lib/gads-public-oauth-contract";

const CONNECT_HREF = "/google-ads/connect";

export const metadata = {
  title: "Free Google Ads audit — Devrika",
  description: publicOAuthProjection.landingMetadata(AUDIT_WINDOW_LABEL),
};

const DEMO_BREAK_EVEN_ROAS = 5;
const DEMO_BREAK_EVEN_CPA = 60;

type DemoProduct = {
  product: string;
  clicks: number;
  cost: number;
  orders: number;
  sales: number;
};

const losingProducts: DemoProduct[] = [
  { product: "Navy office dress", clicks: 3840, cost: 4820, orders: 7, sales: 2110 },
  { product: "Set of 3 cotton T-shirts", clicks: 2460, cost: 3140, orders: 12, sales: 2760 },
  { product: "Faux leather bag", clicks: 1930, cost: 2605, orders: 0, sales: 0 },
];

const growthProducts: DemoProduct[] = [
  { product: "Men's sports shoes", clicks: 420, cost: 420, orders: 14, sales: 5460 },
  { product: "Women's waterproof jacket", clicks: 310, cost: 310, orders: 10, sales: 3720 },
  { product: "Premium urban backpack", clicks: 190, cost: 190, orders: 6, sales: 2090 },
];

const number = (value: number, decimals = 0) => new Intl.NumberFormat("en-US", {
  minimumFractionDigits: decimals,
  maximumFractionDigits: decimals,
}).format(value);
const money = (value: number, decimals = 0) => `${number(value, decimals)} RON`;
const roasFor = (row: DemoProduct) => row.cost > 0 ? row.sales / row.cost : 0;
const cpaFor = (row: DemoProduct) => row.orders > 0 ? row.cost / row.orders : null;
const lossFor = (row: DemoProduct) => Math.max(0, row.cost - row.sales / DEMO_BREAK_EVEN_ROAS);
const opportunityFor = (row: DemoProduct) => row.sales * Math.max(0, roasFor(row) / DEMO_BREAK_EVEN_ROAS - 1);

const steps = [
  ["01", "Connect your Google Ads account", "Sign in directly with Google. Your password never passes through us, and the application does not change ads, campaigns, or budgets."],
  ["02", "Set your break-even threshold", "Confirm your average order value and cost of goods. We automatically calculate your store's maximum CPA and minimum ROAS."],
  ["03", "See every product's performance", `We analyze the last ${AUDIT_WINDOW_LABEL}, rank losses and opportunities by money at stake, and save your report as a PDF.`],
];

function ArrowIcon() {
  return <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>;
}

function PrimaryButton({ light = false }: { light?: boolean }) {
  return (
    <Link href={CONNECT_HREF} className="inline-flex min-h-14 items-center justify-center gap-2.5 rounded-xl px-7 text-base font-extrabold transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={light ? { background: "white", color: C.navy } : { background: C.navy, color: "white", boxShadow: "0 12px 30px rgba(19,22,58,0.2)" }}>
      Analyze my account <ArrowIcon />
    </Link>
  );
}

function ProductEconomicsTable({ rows, kind, compact = false, markNames = false }: {
  rows: DemoProduct[];
  kind: "loss" | "opportunity";
  compact?: boolean;
  markNames?: boolean;
}) {
  const amountLabel = kind === "loss" ? "Loss" : "Potential";
  return (
    <div data-product-economics-table={kind} className="min-w-0 max-w-full">
      <table className={`${compact ? "text-[8px] sm:text-[10px]" : "text-[9px] sm:text-[11px]"} w-full max-w-full table-fixed border-collapse`}>
        <thead><tr className="border-b text-left uppercase tracking-wide" style={{ borderColor: C.border, color: C.gray400 }}>
          {['Product', 'Clicks', 'Spend', 'Orders', 'CPA', 'Sales', 'ROAS', amountLabel].map((header, index) => <th key={header} className={`${index === 0 ? "w-[25%]" : ""} break-all px-1 py-3 font-bold sm:px-2 first:pl-2 sm:first:pl-5 last:pr-2 sm:last:pr-5`}>{header}</th>)}
        </tr></thead>
        <tbody>{rows.map((row) => {
          const cpa = cpaFor(row);
          const amount = kind === "loss" ? lossFor(row) : opportunityFor(row);
          const accent = kind === "loss" ? C.red : C.green;
          const background = kind === "loss" ? C.redBg : C.greenBg;
          return <tr key={row.product} className="border-b last:border-b-0" style={{ borderColor: C.border }}>
            <td className="break-all px-1 py-3 pl-2 font-bold leading-snug sm:px-2 sm:pl-5" style={{ color: C.navy }}><span data-report-product-name={markNames ? "visible" : undefined} className="break-words">{row.product}</span></td>
            <td className="break-all px-1 py-3 tabular-nums sm:px-2">{number(row.clicks)}</td>
            <td className="break-all px-1 py-3 tabular-nums sm:px-2">{money(row.cost)}</td>
            <td className="break-all px-1 py-3 tabular-nums sm:px-2">{number(row.orders)}</td>
            <td className="break-all px-1 py-3 font-bold tabular-nums sm:px-2" style={{ color: cpa && cpa > DEMO_BREAK_EVEN_CPA ? C.red : C.green }}>{cpa === null ? "—" : money(cpa)}</td>
            <td className="break-all px-1 py-3 tabular-nums sm:px-2">{money(row.sales)}</td>
            <td className="break-all px-1 py-3 font-bold tabular-nums sm:px-2" style={{ color: roasFor(row) < DEMO_BREAK_EVEN_ROAS ? C.red : C.green }}>{number(roasFor(row))}×</td>
            <td className="break-all px-1 py-3 pr-2 sm:px-2 sm:pr-5"><span className="inline-block max-w-full break-all rounded-lg px-1 py-1.5 font-extrabold tabular-nums sm:px-2" style={{ background, color: accent }}>{kind === "loss" ? "−" : "+"}{money(amount)}</span></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function CalculationNote({ kind }: { kind: "loss" | "opportunity" }) {
  return (
    <div className="border-t px-5 py-3 text-[11px] leading-relaxed" style={{ borderColor: C.border, background: "#fafbfe", color: C.gray500 }}>
      <b style={{ color: C.navy }}>{kind === "loss" ? "Loss = spend − sales ÷ minimum ROAS" : "Potential = sales × (ROAS ÷ minimum ROAS − 1)"}</b>
      <span> · Minimum ROAS {number(DEMO_BREAK_EVEN_ROAS)}× · Maximum CPA {money(DEMO_BREAK_EVEN_CPA)}</span>
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
          <Link href={CONNECT_HREF} className="flex min-h-11 items-center rounded-lg px-4 text-sm font-bold text-white sm:px-5" style={{ background: brandGradient }}>Connect account →</Link>
        </div>
      </nav>

      <section data-landing-section="hero" className="relative overflow-hidden px-5 pb-20 pt-28 sm:px-8 sm:pb-24 sm:pt-36" style={{ background: "linear-gradient(145deg,#f7f7fd 0%,#ffffff 58%,#f1fbfc 100%)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute -right-44 -top-52 h-[680px] w-[680px] rounded-full" style={{ background: "radial-gradient(circle,rgba(10,190,207,0.11) 0%,transparent 68%)" }} />
        <div className="relative mx-auto grid max-w-[1160px] items-center gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ borderColor: "rgba(71,73,158,0.15)", color: C.indigo }}>
              <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: C.green }} /> Google Ads audit · Free
            </div>
            <h1 className="mb-7 max-w-[680px] font-black leading-[1.02] tracking-[-2.5px]" style={{ fontFamily: sora, fontSize: "clamp(40px,5.6vw,68px)", color: C.navy }}>
              Do you know which Google Shopping products make money and which consume your budget?
            </h1>
            <p className="mb-9 max-w-[630px] text-xl leading-[1.55]" style={{ color: C.gray600 }}>
              Get a product-by-product analysis. See which products consume budget without enough sales and which perform well but receive too little promotion. You will know what to limit and where to invest more.
            </p>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <PrimaryButton />
              <a href="#report-preview" className="inline-flex min-h-14 items-center text-sm font-extrabold underline decoration-2 underline-offset-4" style={{ color: C.indigo }}>See a sample report</a>
              <span className="flex items-center gap-2 text-sm" style={{ color: C.gray500 }}><span aria-hidden="true" style={{ color: C.green }}>✓</span>{publicOAuthProjection.noAccountChanges}</span>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 border-t pt-6 text-sm" style={{ borderColor: C.border, color: C.gray600 }}>
              <span><b style={{ color: C.navy }}>{AUDIT_WINDOW_LABEL}</b> of data</span><span><b style={{ color: C.navy }}>Product by product</b></span><span>Saved <b style={{ color: C.navy }}>PDF</b></span>
            </div>
          </div>

          <div className="relative">
            <div aria-hidden="true" className="absolute -inset-5 rounded-[32px] opacity-60 blur-2xl" style={{ background: "linear-gradient(135deg,rgba(71,73,158,0.12),rgba(10,190,207,0.12))" }} />
            <div className="relative overflow-hidden rounded-[24px] border bg-white" style={{ borderColor: "rgba(71,73,158,0.12)", boxShadow: "0 32px 80px rgba(19,22,58,0.14)" }}>
              <div className="flex items-start justify-between gap-4 border-b px-5 py-4" style={{ borderColor: C.border }}>
                <div><p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.indigo }}>Sample from the report</p><p className="mt-1 text-sm font-semibold" style={{ color: C.navy }}>Products that spent budget and generated losses</p></div>
                <span className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: C.greenBg, color: C.green }}>Sample report</span>
              </div>
              <ProductEconomicsTable rows={losingProducts} kind="loss" markNames />
              <CalculationNote kind="loss" />
            </div>
            <p className="mt-4 text-center text-xs" style={{ color: C.gray400 }}>Illustrative example. Your report uses real data from the connected account.</p>
          </div>
        </div>
      </section>

      <section data-landing-section="problems" className="bg-white px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1160px]">
          <div className="mx-auto mb-14 max-w-[780px] text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>The problem hidden by the account average</p>
            <h2 className="font-black leading-[1.08] tracking-[-1.4px]" style={{ fontFamily: sora, fontSize: "clamp(32px,4.5vw,52px)", color: C.navy }}>Why you can lose money even when account ROAS looks good</h2>
            <p className="mx-auto mt-6 max-w-[680px] text-lg leading-relaxed" style={{ color: C.gray500 }}>Google optimizes for sales, but it does not automatically know the profit each product leaves you.</p>
          </div>
          <div className="grid gap-6">
            <article data-problem-example="shared-budget" className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: C.border }}>
              <div className="p-6"><span className="text-xs font-extrabold" style={{ color: C.indigo }}>01</span><h3 className="mt-3 text-xl font-extrabold leading-tight" style={{ fontFamily: sora, color: C.navy }}>All products compete for the same budget</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>Google distributes budget by likelihood of a sale, not by the real profit each product leaves you.</p></div>
              <div className="border-t" style={{ borderColor: C.border, background: "#f7f8fc" }}><ProductEconomicsTable rows={losingProducts} kind="loss" compact /><CalculationNote kind="loss" /></div>
            </article>

            <article data-problem-example="traffic-without-profit" className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: C.border }}>
              <div className="p-6"><span className="text-xs font-extrabold" style={{ color: C.indigo }}>02</span><h3 className="mt-3 text-xl font-extrabold leading-tight" style={{ fontFamily: sora, color: C.navy }}>High traffic does not mean profit</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>A product can receive many clicks and consume most of the budget while remaining deeply unprofitable.</p></div>
              <div className="border-t" style={{ borderColor: C.border, background: "#fff8f8" }}><ProductEconomicsTable rows={losingProducts} kind="loss" compact /><CalculationNote kind="loss" /></div>
            </article>

            <article data-problem-example="css-cost" className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: C.border }}>
              <div className="p-6"><span className="text-xs font-extrabold" style={{ color: C.indigo }}>03</span><h3 className="mt-3 text-xl font-extrabold leading-tight" style={{ fontFamily: sora, color: C.navy }}>Without a CSS partner, you pay approximately 20% more per click</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>A lower cost per click means more traffic, more sales, and a higher ROAS from the same budget.</p></div>
              <div className="min-w-0 max-w-full border-t" data-product-economics-table="css" style={{ borderColor: C.border, background: "#f6fbfb" }}><p className="px-5 pt-4 text-[11px] font-bold" style={{ color: C.navy }}>Direct Google → CSS partner, with the same budget</p><table className="w-full max-w-full table-fixed border-collapse text-[8px] sm:text-[10px]"><thead><tr className="border-b text-left uppercase tracking-wide" style={{ borderColor: C.border, color: C.gray400 }}>{["Product", "Clicks", "Spend", "Orders", "CPA", "Sales", "ROAS", "CSS gain"].map((header, index) => <th key={header} className={`${index === 0 ? "w-[25%]" : ""} break-all px-1 py-3 font-bold sm:px-2 first:pl-2 sm:first:pl-5 last:pr-2 sm:last:pr-5`}>{header}</th>)}</tr></thead><tbody>{[["Navy office dress", "1,000 → 1,250", 1000, "20 → 25", "50 → 40 RON", "5,000 → 6,250 RON", "5.00 → 6.25×", "+1,250 RON"], ["Set of 3 cotton T-shirts", "800 → 1,000", 800, "16 → 20", "50 → 40 RON", "4,000 → 5,000 RON", "5.00 → 6.25×", "+1,000 RON"], ["Faux leather bag", "600 → 750", 600, "12 → 15", "50 → 40 RON", "3,000 → 3,750 RON", "5.00 → 6.25×", "+750 RON"]].map(([label, clicks, cost, orders, cpa, sales, productRoas, difference]) => <tr key={String(label)} className="border-b last:border-b-0" style={{ borderColor: C.border }}><td className="break-all px-1 py-3 pl-2 font-bold sm:px-2 sm:pl-5" style={{ color: C.navy }}>{label}</td><td className="break-all px-1 py-3 sm:px-2">{clicks}</td><td className="break-all px-1 py-3 sm:px-2">{money(Number(cost))}</td><td className="break-all px-1 py-3 sm:px-2">{orders}</td><td className="break-all px-1 py-3 sm:px-2">{cpa}</td><td className="break-all px-1 py-3 sm:px-2">{sales}</td><td className="break-all px-1 py-3 font-bold sm:px-2">{productRoas}</td><td className="break-all px-1 py-3 pr-2 font-extrabold sm:px-2 sm:pr-5" style={{ color: C.green }}>{difference}</td></tr>)}</tbody></table><p className="border-t px-5 py-3 text-[11px]" style={{ borderColor: C.border, color: C.gray500 }}>Same budgets and conversion rate: CPC 1 RON → 0.80 RON. Each product receives 25% more clicks, orders, and sales.</p></div>
            </article>
          </div>
          <p className="mt-10 text-center text-lg font-bold" style={{ color: C.navy }}>The account average hides the problem. The audit shows each product separately.</p>
        </div>
      </section>

      <section id="report-preview" data-landing-section="evidence" className="scroll-mt-20 px-5 py-20 sm:px-8 sm:py-24" style={{ background: "#f6f7fc" }}>
        <div className="mx-auto max-w-[1160px]">
          <div className="mx-auto mb-14 max-w-[760px] text-center"><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>Real figures, not vague conclusions</p><h2 className="font-black leading-[1.08] tracking-[-1.4px]" style={{ fontFamily: sora, fontSize: "clamp(32px,4.5vw,52px)", color: C.navy }}>See exactly where the money goes</h2><p className="mx-auto mt-6 max-w-[680px] text-lg leading-relaxed" style={{ color: C.gray500 }}>The report uses your account data and clearly separates products that consume budget from those that deserve more investment.</p></div>
          <div className="grid gap-7">
            <article data-evidence-example="losses" className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: C.border }}>
              <div className="border-b p-6" style={{ borderColor: C.border }}><p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.red }}>Stop wasted spend</p><h3 className="mt-2 text-2xl font-extrabold" style={{ fontFamily: sora, color: C.navy }}>Products consuming your budget</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>They received traffic and spent money without generating enough sales. The largest loss appears first.</p></div><ProductEconomicsTable rows={losingProducts} kind="loss" /><CalculationNote kind="loss" />
            </article>
            <article data-evidence-example="growth" className="overflow-hidden rounded-[22px] border bg-white" style={{ borderColor: C.border }}>
              <div className="border-b p-6" style={{ borderColor: C.border }}><p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: C.green }}>Recover growth</p><h3 className="mt-2 text-2xl font-extrabold" style={{ fontFamily: sora, color: C.navy }}>Products worth promoting more</h3><p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>They have demonstrated profitable sales but receive too little traffic. The largest opportunity appears first.</p></div>
              <ProductEconomicsTable rows={growthProducts} kind="opportunity" /><CalculationNote kind="opportunity" />
            </article>
          </div>
          <p className="mt-6 text-center text-xs" style={{ color: C.gray400 }}>Illustrative examples. Historical values in the report are measured from Google Ads, and estimates are labeled separately.</p>
        </div>
      </section>

      <section data-landing-section="steps" className="bg-white px-5 py-20 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24">
            <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>Three simple steps</p><h2 className="font-black leading-[1.08] tracking-[-1.2px]" style={{ fontFamily: sora, fontSize: "clamp(30px,4vw,46px)", color: C.navy }}>From connection to report</h2><p className="mt-5 max-w-[420px] text-base leading-relaxed" style={{ color: C.gray500 }}>No file exports and no Google Ads expertise required.</p></div>
            <div className="border-t" style={{ borderColor: C.border }}>{steps.map(([number, title, body]) => <div key={number} data-process-step={number} className="grid grid-cols-[48px_minmax(0,1fr)] gap-5 border-b py-6 sm:grid-cols-[48px_210px_minmax(0,1fr)]" style={{ borderColor: C.border }}><span className="text-base font-extrabold" style={{ fontFamily: sora, color: C.indigo }}>{number}</span><p className="text-base font-bold" style={{ color: C.navy }}>{title}</p><p className="col-start-2 text-sm leading-relaxed sm:col-start-3" style={{ color: C.gray500 }}>{body}</p></div>)}</div>
          </div>
          <div className="mt-14 grid gap-7 border-y py-8 lg:grid-cols-[0.78fr_1.22fr]" style={{ borderColor: C.border }}>
            <div><p className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>You remain in control</p><h3 className="mt-2 text-2xl font-extrabold" style={{ fontFamily: sora, color: C.navy }}>We read your figures. We do not touch campaigns.</h3></div>
            <div>
              <div className="grid gap-5 sm:grid-cols-3">{[[publicOAuthProjection.readsOnlyLabel, publicOAuthProjection.noAccountChanges], ["Revocable access", "Revoke it at any time from your Google account."], ["No payment card", "The report is free and starts no subscription."]].map(([title, body]) => <div key={title} className="border-t pt-4" style={{ borderColor: C.border }}><p className="text-sm font-bold" style={{ color: C.navy }}>{title}</p><p className="mt-1.5 text-sm leading-relaxed" style={{ color: C.gray500 }}>{body}</p></div>)}</div>
              <details data-oauth-disclosure="progressive" className="group mt-7 border-t pt-5" style={{ borderColor: C.border }}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold" style={{ color: C.indigo }}>Exactly what we read<span aria-hidden="true" className="text-lg transition-transform group-open:rotate-45">+</span></summary><p className="mt-4 max-w-[760px] text-sm leading-relaxed" style={{ color: C.gray500 }}><b style={{ color: C.navy }}>Audit Devrika</b> connects only with your consent.{` ${publicOAuthProjection.auditDataReadDisclosure} ${publicOAuthProjection.googleAdsPermission}`} Your signed Google authorization expires after one hour and is not stored with your contact record. Requested reports are retained only for delivery and support. We make no changes to your account.</p></details>
            </div>
          </div>
        </div>
      </section>

      <section data-landing-section="cta" className="px-5 pb-8 sm:px-8 sm:pb-10">
        <div className="mx-auto grid max-w-[1160px] gap-9 overflow-hidden rounded-[28px] px-7 py-12 sm:px-12 lg:grid-cols-[1fr_auto] lg:items-center lg:px-16 lg:py-14" style={{ background: C.navy }}>
          <div><p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: C.cyan }}>Free report</p><h2 className="max-w-[720px] font-black leading-[1.08] tracking-[-1.2px] text-white" style={{ fontFamily: sora, fontSize: "clamp(30px,4.5vw,48px)" }}>See which products to limit and which deserve more investment.</h2><p className="mt-4 text-base" style={{ color: "rgba(255,255,255,0.72)" }}>Your real data. No payment card. No Google Ads changes.</p></div><PrimaryButton light />
        </div>
      </section>

      <footer className="px-8 py-10 text-center" style={{ background: "#0f172a" }}>
        <div className="mb-4 flex items-center justify-center gap-2.5"><Image src="/logo-devrika.png" alt="Devrika" width={30} height={30} className="h-[30px] w-[30px]" /><span className="text-base font-extrabold text-white">Devrika</span></div>
        <p className="mb-2 text-[13px]" style={{ color: "#475569" }}><Link href="/confidentialitate" style={{ color: C.cyan }}>Privacy Policy</Link>{" · "}<Link href="/termeni" style={{ color: C.cyan }}>Terms and Conditions</Link></p>
        <p className="text-[13px]" style={{ color: "#475569" }}>© {new Date().getFullYear()} Devrika · <a href="https://devrika.ro" style={{ color: C.cyan }}>devrika.ro</a></p>
      </footer>
    </div>
  );
}
