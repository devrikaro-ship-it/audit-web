"use client";

import { useMemo, useState } from "react";
import { C, sora } from "@/lib/theme";
import { simulateOptimizedBudget, type ProductAnalysis, type ProductAnalysisRow, type SimulatedProductRow } from "@/lib/gads-product-simulation";
import type { GadsReportSnapshot } from "@/lib/gads-report-delivery";

const wholeMoney = (value: number) => `${Math.round(value).toLocaleString("ro-RO")} RON`;
const decimalMoney = (value: number | null) => value === null ? "—" : `${value.toFixed(2)} RON`;
const decimalRoas = (value: number | null) => value === null ? "—" : `${value.toFixed(2)}×`;
const orders = (value: number) => value.toLocaleString("ro-RO", { maximumFractionDigits: 1 });

export default function ProfitabilitySimulator({ analysis, averageOrderValue, snapshot }: { analysis: ProductAnalysis; averageOrderValue: number; snapshot: GadsReportSnapshot }) {
  const initialBudget = Math.min(Math.round(analysis.currentMonthlySpend), analysis.economicBudgetLimit);
  const [budget, setBudget] = useState(initialBudget);
  const simulation = useMemo(() => simulateOptimizedBudget(analysis, budget), [analysis, budget]);
  const profitableSales = simulation.products.filter((row) => row.strategy === "SCALE").reduce((sum, row) => sum + row.simulatedRevenue, 0);

  return (
    <section data-profitability-layout="wide-v1" className="mt-10 space-y-14 pb-6">
      <ScenarioComparison snapshot={snapshot} />
      <MeasuredTable eyebrow="Priority 1 · Stop the loss" title="Products consuming your budget" note={`Ranked by money at risk. Showing ${analysis.losses.length} of the top 20.`} rows={analysis.losses} tone="loss" />
      <MeasuredTable eyebrow="Priority 2 · Recover growth" title="Profitable products receiving too little traffic" note="Only products with enough evidence are included. A single accidental order never qualifies." rows={analysis.opportunities} tone="gain" />

      <div className="rounded-[28px] border bg-white p-6 sm:p-10 lg:p-12" style={{ borderColor: "#dbe2f0" }}>
        <div className="mb-8 flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-[760px]">
            <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[1.9px]" style={{ color: C.indigo }}>Interactive simulation · optimized account</p>
            <h2 className="text-[clamp(25px,3vw,36px)] font-black leading-tight" style={{ fontFamily: sora, color: C.navy }}>See where every additional RON would be spent</h2>
            <span className="mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide" style={{ background: "#eef0ff", color: C.indigo }}>Future simulation</span>
            <p className="mt-3 max-w-[760px] text-[14px] leading-relaxed" style={{ color: C.gray500 }}>Profitable products receive controlled growth. Loss-making products remain capped. The model reduces expected ROAS as the budget grows.</p>
          </div>
          <div className="text-right">
            <p className="text-[clamp(34px,5vw,54px)] font-black leading-none tabular-nums" style={{ fontFamily: sora, color: "#251f73" }}>{wholeMoney(simulation.budget)}</p>
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[1.5px]" style={{ color: C.gray400 }}>Simulated monthly budget</p>
          </div>
        </div>

        <input aria-label="Simulated monthly budget" type="range" min="0" max={analysis.economicBudgetLimit} step="1" value={simulation.budget} onChange={(event) => setBudget(Number(event.target.value))} className="w-full cursor-pointer" style={{ accentColor: C.indigo, minHeight: 44 }} />
        <div className="mb-8 flex justify-between text-[12px] font-semibold" style={{ color: C.gray400 }}><span>0 RON</span><span>Economic limit · {wholeMoney(analysis.economicBudgetLimit)}</span></div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Metric testId="expected-revenue" label="Expected revenue" value={wholeMoney(simulation.expectedRevenue)} />
          <Metric testId="expected-orders" label="Expected orders" value={orders(simulation.expectedOrders)} />
          <Metric testId="expected-roas" label="Expected ROAS" value={decimalRoas(simulation.expectedRoas)} />
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Strategy number="1" title="Stop the loss" body="Cap products below minimum ROAS" detail="More budget no longer deepens the same losses." />
          <Strategy number="2" title="Move the budget" body="Fund proven profitable products" detail="High-ROAS products receive the traffic they are missing." />
          <Strategy number="3" title="Grow under control" body="Apply CSS and scale to the limit" detail="Budget grows only while expected ROAS stays above break-even." />
        </div>

        <p className="mb-8 text-center text-[12px] font-extrabold uppercase tracking-wide" style={{ color: C.indigo }}>Before: measured products → After: optimized promotion</p>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[1.7px]" style={{ color: C.indigo }}>After · optimized product promotion</p>
            <h3 className="mt-2 text-[clamp(24px,3vw,34px)] font-black" style={{ fontFamily: sora, color: C.navy }}>How the same products would be promoted</h3>
          </div>
          <span className="rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide" style={{ background: "#eef0ff", color: C.indigo }}>Future simulation</span>
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-5" style={{ background: "#eef9ff", borderColor: "#c6e8fb", color: "#126b91" }}>
          <p className="text-[11px] font-extrabold uppercase tracking-[1.3px]">Estimated sales generated by the profitable products shown below</p>
          <b className="text-[clamp(25px,4vw,38px)] tabular-nums">{wholeMoney(profitableSales)}</b>
        </div>
        <SimulationTable rows={simulation.products} averageOrderValue={averageOrderValue} />
        <p className="mt-5 text-[12px] leading-relaxed" style={{ color: C.gray500 }}>Future values are simulations, not promises. The CSS scenario assumes an estimated 20% CPC reduction. Diminishing returns reduce expected ROAS as budget grows.</p>
      </div>
    </section>
  );
}

function ScenarioComparison({ snapshot }: { snapshot: GadsReportSnapshot }) {
  const optimizedLift = snapshot.current.roas > 0 ? Math.round((snapshot.optimized.roas / snapshot.current.roas - 1) * 100) : 0;
  const maxRoas = Math.max(snapshot.current.roas, snapshot.optimized.roas, 1);
  const rows = [
    ["Advertising cost", wholeMoney(snapshot.current.spend), wholeMoney(snapshot.optimized.spend)],
    ["Average CPC", "Measured in account", "Estimated −20% with CSS"],
    ["Orders", orders(snapshot.current.orders), orders(snapshot.optimized.orders)],
    ["CPA", decimalMoney(snapshot.current.cpa), decimalMoney(snapshot.optimized.cpa)],
    ["Sales", wholeMoney(snapshot.current.revenue), wholeMoney(snapshot.optimized.revenue)],
    ["ROAS", decimalRoas(snapshot.current.roas), decimalRoas(snapshot.optimized.roas)],
  ];

  return <section role="region" aria-label="Account profitability comparison" className="rounded-[28px] border p-6 sm:p-10 lg:p-12" style={{ borderColor: "#d7def0", background: "#f4f5ff" }}>
    <p className="mb-3 text-[12px] font-extrabold uppercase tracking-[2px]" style={{ color: C.indigo }}>Scenario, not a promise</p>
    <h1 className="text-[clamp(28px,4vw,42px)] font-black leading-tight" style={{ fontFamily: sora, color: C.navy }}>How the account could look after optimization</h1>
    <div className="mt-8 inline-grid grid-cols-2 gap-1 rounded-2xl p-1.5" style={{ background: "#e7e9f7" }}><span className="rounded-xl px-5 py-3 text-[13px] font-bold" style={{ color: C.gray600 }}>Current account</span><span className="rounded-xl bg-white px-5 py-3 text-[13px] font-extrabold shadow-sm" style={{ color: "#251f73" }}>Optimized + CSS</span></div>
    <div className="mt-8 grid items-center gap-8 lg:grid-cols-[0.9fr_1.3fr]">
      <div><p className="text-[clamp(46px,7vw,72px)] font-black leading-none tracking-[-3px]" style={{ fontFamily: sora, color: "#171b59" }}>{snapshot.optimized.roas.toFixed(1)}× ROAS</p><p className="mt-3 text-[15px]" style={{ color: C.gray500 }}>optimization plus the estimated CSS click-cost advantage</p><span className="mt-5 inline-flex rounded-full px-4 py-2 text-[13px] font-extrabold" style={{ background: optimizedLift >= 0 ? "#e5f8ef" : "#fff0f1", color: optimizedLift >= 0 ? C.green : "#e2454f" }}>{optimizedLift >= 0 ? "+" : ""}{optimizedLift}% vs current account</span></div>
      <div className="space-y-5"><RoasBar label="Current" value={snapshot.current.roas} max={maxRoas} muted /><RoasBar label="Optimized + CSS" value={snapshot.optimized.roas} max={maxRoas} /></div>
    </div>
    <div className="mt-9 overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: C.border }}><table className="min-w-[720px] w-full text-[13px]"><thead><tr className="text-left text-[10px] uppercase tracking-[1.2px]" style={{ color: C.gray400, background: "#f8f9fc" }}><th className="p-4 sm:px-6">Metric</th><th className="p-4 text-right sm:px-6">Current · measured</th><th className="p-4 text-right sm:px-6" style={{ color: "#251f73", background: "#eeecff" }}>Optimized + CSS · simulation</th></tr></thead><tbody>{rows.map(([label, current, optimized]) => <tr key={label} className="border-t" style={{ borderColor: C.border }}><td className="p-4 font-semibold sm:px-6">{label}</td><td className="p-4 text-right tabular-nums sm:px-6">{current}</td><td className="p-4 text-right font-bold tabular-nums sm:px-6" style={{ color: "#30287e", background: "#f3f1ff" }}>{optimized}</td></tr>)}</tbody></table></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><Metric testId="break-even-cpa" label="Break-even CPA" value={decimalMoney(snapshot.breakEvenCpa)} /><Metric testId="break-even-roas" label="Break-even ROAS" value={decimalRoas(snapshot.breakEvenRoas)} /></div>
    <p className="mt-5 text-[12px] leading-relaxed" style={{ color: C.gray500 }}>Current values are measured from the connected Google Ads account. Future values are simulations. The CSS scenario assumes an estimated 20% CPC reduction and is not guaranteed.</p>
  </section>;
}

function RoasBar({ label, value, max, muted = false }: { label: string; value: number; max: number; muted?: boolean }) {
  return <div className="grid grid-cols-[120px_1fr_58px] items-center gap-3 text-[13px] font-semibold" style={{ color: C.gray500 }}><span>{label}</span><div className="h-4 overflow-hidden rounded-full" style={{ background: "#dfe3ef" }}><div className="h-full rounded-full" style={{ width: `${Math.max(3, value / max * 100)}%`, background: muted ? "#929aaf" : "linear-gradient(90deg,#5647c7,#12bfd0)" }} /></div><b className="text-right tabular-nums">{value.toFixed(1)}×</b></div>;
}

function Metric({ testId, label, value }: { testId: string; label: string; value: string }) {
  return <div data-testid={testId} className="rounded-2xl border p-5" style={{ borderColor: C.border, background: "#f8f9fc" }}><p className="text-[11px] font-bold uppercase tracking-[1.2px]" style={{ color: C.gray400 }}>{label}</p><p className="mt-2 text-[clamp(20px,3vw,29px)] font-black tabular-nums" style={{ fontFamily: sora, color: C.navy }}>{value}</p></div>;
}

function Strategy({ number, title, body, detail }: { number: string; title: string; body: string; detail: string }) {
  return <div className="rounded-2xl border p-5" style={{ borderColor: C.border, background: "#fafbff" }}><p className="text-[11px] font-extrabold uppercase tracking-[1.3px]" style={{ color: C.indigo }}>{number} · {title}</p><p className="mt-2 text-[15px] font-bold" style={{ color: C.navy }}>{body}</p><p className="mt-2 text-[12px] leading-relaxed" style={{ color: C.gray500 }}>{detail}</p></div>;
}

function MeasuredTable({ eyebrow, title, note, rows, tone }: { eyebrow: string; title: string; note: string; rows: ProductAnalysisRow[]; tone: "loss" | "gain" }) {
  return <section><div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.8px]" style={{ color: C.indigo }}>{eyebrow}</p><h2 className="text-[clamp(24px,3vw,34px)] font-black" style={{ fontFamily: sora, color: C.navy }}>{title}</h2></div><div className="max-w-[390px] text-right"><span className="rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide" style={{ background: C.greenBg, color: C.green }}>Measured from Google Ads</span><p className="mt-2 text-[12px] leading-relaxed" style={{ color: C.gray400 }}>{note}</p></div></div><div className="overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: C.border }}><table className="min-w-[1000px] w-full text-left text-[13px]"><TableHeader finalLabel={tone === "loss" ? "Loss ↓" : "Estimated sales ↓"} /><tbody>{rows.map((row) => <tr key={row.productId} className="border-t" style={{ borderColor: C.border }}><ProductCell row={row} /><td>{row.clicks.toLocaleString("ro-RO")}</td><td>{wholeMoney(row.monthlyCost)}</td><td>{orders(row.monthlyOrders)}</td><td className="font-bold" style={{ color: tone === "loss" ? "#e2454f" : C.green }}>{decimalMoney(row.monthlyOrders > 0 ? row.monthlyCost / row.monthlyOrders : null)}</td><td>{wholeMoney(row.monthlyRevenue)}</td><td className="font-bold" style={{ color: tone === "loss" ? "#e2454f" : C.green }}>{decimalRoas(row.roas)}</td><td className="pr-5 text-right"><span className="rounded-lg px-3 py-1.5 font-bold" style={{ background: tone === "loss" ? "#fff0f1" : "#e8f9f2", color: tone === "loss" ? "#e2454f" : C.green }}>{tone === "loss" ? "−" : "+"}{wholeMoney(tone === "loss" ? row.monthlyMoneyAtRisk : row.estimatedSalesOpportunity)}</span></td></tr>)}</tbody></table></div></section>;
}

function ProductCell({ row }: { row: ProductAnalysisRow }) {
  const initials = row.title.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return <td className="p-4 sm:px-5"><div className="flex items-center gap-3"><span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-[11px] font-black" style={{ borderColor: C.border, background: "#f8f9fc", color: C.indigo }}>{initials}</span><div><p className="max-w-[280px] font-bold leading-snug">{row.title}</p><p className="mt-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.gray400 }}>ID {row.productId}</p></div></div></td>;
}

function SimulationTable({ rows, averageOrderValue }: { rows: SimulatedProductRow[]; averageOrderValue: number }) {
  return <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: C.border }}><table className="min-w-[1000px] w-full text-left text-[13px]"><TableHeader finalLabel="Strategy" /><tbody>{rows.map((row) => <tr key={`${row.strategy}-${row.productId}`} className="border-t" style={{ borderColor: C.border }}><ProductCell row={row} /><td>{row.simulatedCost > 0 && row.cost > 0 ? Math.round(row.clicks * 12 * row.simulatedCost / row.cost / 0.8).toLocaleString("ro-RO") : 0}</td><td>{wholeMoney(row.simulatedCost)}</td><td>{orders(row.simulatedOrders)}</td><td>{decimalMoney(row.simulatedCpa)}</td><td>{wholeMoney(row.simulatedRevenue || row.simulatedOrders * averageOrderValue)}</td><td>{decimalRoas(row.simulatedRoas)}</td><td className="pr-5 text-right"><span className="rounded-lg px-3 py-1.5 text-[11px] font-extrabold" style={{ background: row.strategy === "SCALE" ? "#e8f9f2" : "#fff0f1", color: row.strategy === "SCALE" ? C.green : "#e2454f" }}>{row.strategy === "SCALE" ? "MORE BUDGET" : "HARD LIMIT"}</span></td></tr>)}</tbody></table></div>;
}

function TableHeader({ finalLabel }: { finalLabel: string }) {
  return <thead><tr className="text-[10px] uppercase tracking-[1.2px]" style={{ color: C.gray400, background: "#f8f9fc" }}>{["Product", "Clicks", "Cost", "Orders", "CPA", "Sales", "ROAS", finalLabel].map((label, index) => <th key={label} className={`p-4 sm:px-5 ${index === 7 ? "text-right" : ""}`}>{label}</th>)}</tr></thead>;
}
