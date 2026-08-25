"use client";

import { useMemo, useState } from "react";
import { C, sora } from "@/lib/theme";
import { simulateOptimizedBudget, type ProductAnalysis, type ProductAnalysisRow, type SimulatedProductRow } from "@/lib/gads-product-simulation";

const wholeMoney = (value: number) => `${Math.round(value).toLocaleString("ro-RO")} RON`;
const decimalMoney = (value: number | null) => value === null ? "—" : `${value.toFixed(2)} RON`;
const decimalRoas = (value: number | null) => value === null ? "—" : `${value.toFixed(2)}×`;

export default function ProfitabilitySimulator({ analysis, averageOrderValue }: { analysis: ProductAnalysis; averageOrderValue: number }) {
  const initialBudget = Math.min(Math.round(analysis.currentMonthlySpend), analysis.economicBudgetLimit);
  const [budget, setBudget] = useState(initialBudget);
  const simulation = useMemo(() => simulateOptimizedBudget(analysis, budget), [analysis, budget]);
  const profitableSales = simulation.products
    .filter((row) => row.strategy === "SCALE")
    .reduce((sum, row) => sum + row.simulatedRevenue, 0);

  return (
    <section className="mt-10 space-y-10">
      <MeasuredTable title="Products consuming your budget" rows={analysis.losses} tone="loss" />
      <MeasuredTable title="Profitable products receiving too little traffic" rows={analysis.opportunities} tone="gain" />

      <div className="rounded-2xl border bg-white p-6 sm:p-8" style={{ borderColor: C.border }}>
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[12px] font-extrabold uppercase tracking-[1.8px]" style={{ color: C.indigo }}>
              Interactive simulation · optimized account
            </p>
            <h2 className="text-[25px] font-black" style={{ fontFamily: sora, color: C.navy }}>
              See where every additional RON would be spent
            </h2>
            <span className="mt-3 inline-flex rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide" style={{ background: "#eef0ff", color: C.indigo }}>
              Future simulation
            </span>
          </div>
          <div className="text-right">
            <p className="text-[34px] font-black tabular-nums" style={{ fontFamily: sora, color: C.navy }}>{wholeMoney(simulation.budget)}</p>
            <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.gray400 }}>Simulated monthly budget</p>
          </div>
        </div>

        <input aria-label="Simulated monthly budget" type="range" min="0" max={analysis.economicBudgetLimit} step="1"
          value={simulation.budget} onChange={(event) => setBudget(Number(event.target.value))}
          className="w-full cursor-pointer" style={{ accentColor: C.indigo, minHeight: 44 }} />
        <div className="mb-6 flex justify-between text-[12px]" style={{ color: C.gray400 }}>
          <span>0 RON</span><span>Economic limit · {wholeMoney(analysis.economicBudgetLimit)}</span>
        </div>

        <div className="mb-7 grid gap-3 sm:grid-cols-3">
          <Metric testId="expected-revenue" label="Expected revenue" value={wholeMoney(simulation.expectedRevenue)} />
          <Metric testId="expected-orders" label="Expected orders" value={Math.round(simulation.expectedOrders).toLocaleString("ro-RO")} />
          <Metric testId="expected-roas" label="Expected ROAS" value={decimalRoas(simulation.expectedRoas)} />
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <Strategy title="1. Stop the loss" body="Cap products below minimum ROAS." />
          <Strategy title="2. Move the budget" body="Fund products with qualified profitable history." />
          <Strategy title="3. Grow under control" body="Scale only while expected ROAS stays above break-even." />
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-[1.6px]" style={{ color: C.indigo }}>After · optimized product promotion</p>
            <h3 className="text-[22px] font-black" style={{ fontFamily: sora, color: C.navy }}>How the same products would be promoted</h3>
          </div>
          <p className="rounded-xl px-4 py-3 text-right text-[13px]" style={{ background: "#eef9ff", color: "#126b91" }}>
            Estimated sales from profitable products<br /><b className="text-[22px]">{wholeMoney(profitableSales)}</b>
          </p>
        </div>
        <SimulationTable rows={simulation.products} averageOrderValue={averageOrderValue} />
        <p className="mt-4 text-[12px] leading-relaxed" style={{ color: C.gray500 }}>
          Future values are simulations, not promises. The CSS scenario assumes an estimated 20% CPC reduction. Diminishing returns reduce expected ROAS as budget grows.
        </p>
      </div>
    </section>
  );
}

function Metric({ testId, label, value }: { testId: string; label: string; value: string }) {
  return <div data-testid={testId} className="rounded-xl border p-4" style={{ borderColor: C.border, background: "#f8f9fc" }}>
    <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.gray400 }}>{label}</p>
    <p className="mt-1 text-[21px] font-black tabular-nums" style={{ fontFamily: sora, color: C.navy }}>{value}</p>
  </div>;
}

function Strategy({ title, body }: { title: string; body: string }) {
  return <div className="rounded-xl border p-4" style={{ borderColor: C.border }}>
    <p className="text-[12px] font-extrabold uppercase tracking-wide" style={{ color: C.indigo }}>{title}</p>
    <p className="mt-1 text-[13px]" style={{ color: C.gray600 }}>{body}</p>
  </div>;
}

function MeasuredTable({ title, rows, tone }: { title: string; rows: ProductAnalysisRow[]; tone: "loss" | "gain" }) {
  return <div>
    <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
      <h2 className="text-[23px] font-black" style={{ fontFamily: sora, color: C.navy }}>{title}</h2>
      <span className="rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide" style={{ background: C.greenBg, color: C.green }}>Measured from Google Ads</span>
    </div>
    <div className="overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: C.border }}>
      <table className="min-w-[900px] w-full text-left text-[13px]">
        <TableHeader finalLabel={tone === "loss" ? "Money at risk" : "Sales opportunity"} />
        <tbody>{rows.map((row) => <tr key={row.productId} className="border-t" style={{ borderColor: C.border }}>
          <td className="p-4 font-bold">{row.title}</td><td>{row.clicks}</td><td>{wholeMoney(row.monthlyCost)}</td>
          <td>{row.monthlyOrders.toFixed(1)}</td><td>{decimalMoney(row.monthlyOrders > 0 ? row.monthlyCost / row.monthlyOrders : null)}</td>
          <td>{wholeMoney(row.monthlyRevenue)}</td><td>{decimalRoas(row.roas)}</td>
          <td className="pr-4 font-bold" style={{ color: tone === "loss" ? C.red : C.green }}>
            {wholeMoney(tone === "loss" ? row.monthlyMoneyAtRisk : row.estimatedSalesOpportunity)}
          </td>
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}

function SimulationTable({ rows, averageOrderValue }: { rows: SimulatedProductRow[]; averageOrderValue: number }) {
  return <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: C.border }}>
    <table className="min-w-[900px] w-full text-left text-[13px]">
      <TableHeader finalLabel="Strategy" />
      <tbody>{rows.map((row) => <tr key={`${row.strategy}-${row.productId}`} className="border-t" style={{ borderColor: C.border }}>
        <td className="p-4 font-bold">{row.title}</td>
        <td>{row.simulatedCost > 0 && row.cost > 0 ? Math.round(row.clicks * 12 * row.simulatedCost / row.cost / 0.8) : 0}</td>
        <td>{wholeMoney(row.simulatedCost)}</td><td>{row.simulatedOrders.toFixed(1)}</td><td>{decimalMoney(row.simulatedCpa)}</td>
        <td>{wholeMoney(row.simulatedRevenue || row.simulatedOrders * averageOrderValue)}</td><td>{decimalRoas(row.simulatedRoas)}</td>
        <td className="pr-4 font-extrabold" style={{ color: row.strategy === "SCALE" ? C.green : C.red }}>{row.strategy}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function TableHeader({ finalLabel }: { finalLabel: string }) {
  return <thead><tr className="text-[10px] uppercase tracking-wide" style={{ color: C.gray400, background: "#f8f9fc" }}>
    {['Product', 'Clicks', 'Cost', 'Orders', 'CPA', 'Sales', 'ROAS', finalLabel].map((label) => <th key={label} className="p-4">{label}</th>)}
  </tr></thead>;
}
