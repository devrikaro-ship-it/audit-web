"use client";

import { useMemo, useState } from "react";
import { classifyReportProducts, type ProductPerformanceLabel } from "@/lib/gads-product-classification";
import type { GadsReportSnapshot } from "@/lib/gads-report-delivery";

const money = (value: number) => `${Math.round(value).toLocaleString("ro-RO")} RON`;
const number = (value: number) => Math.round(value).toLocaleString("ro-RO");
const ratio = (value: number | null) => value === null ? "—" : `${value.toFixed(2)}×`;
const percent = (value: number | null) => value === null ? "—" : `${(value * 100).toFixed(2)}%`;
const labelText: Record<ProductPerformanceLabel, string> = {
  LOSS_MAKER: "Loss maker", NOT_PROMOTED: "Not promoted", UNDERPROMOTED_POTENTIAL: "Underpromoted potential",
  PERFORMER: "Performer", INSUFFICIENT_DATA: "Insufficient data",
};

export default function ReportingDashboard({ snapshot, updatedAt }: { snapshot: GadsReportSnapshot; updatedAt?: string }) {
  const [query, setQuery] = useState("");
  const [label, setLabel] = useState<ProductPerformanceLabel | "ALL">("ALL");
  const [sort, setSort] = useState<"cost" | "revenue" | "roas" | "clicks">("cost");
  const products = useMemo(() => {
    const legacyRows = snapshot.productAnalysis ? [...snapshot.productAnalysis.losses, ...snapshot.productAnalysis.opportunities] : [];
    return classifyReportProducts(snapshot.reportProducts ?? legacyRows, snapshot.breakEvenRoas);
  }, [snapshot]);
  const visible = useMemo(() => products.filter((row) => (label === "ALL" || row.label === label) && `${row.title} ${row.productId}`.toLowerCase().includes(query.toLowerCase())).sort((left, right) => {
    if (sort === "revenue") return right.conversionValue - left.conversionValue;
    return right[sort] - left[sort];
  }), [products, query, label, sort]);
  const clicks = snapshot.current.clicks;
  const conversionRate = clicks && clicks > 0 ? snapshot.current.orders / clicks : null;
  const profitable = snapshot.current.roas >= snapshot.breakEvenRoas;
  const gap = snapshot.current.roas - snapshot.breakEvenRoas;

  return <section className="reportDashboard" data-report-dashboard="live">
    <header className="dashboardHeader">
      <div><span className="wordmark">DEVRIKA</span><h1>Google Ads performance</h1><p>{snapshot.accountName} · {snapshot.website} · Read-only audit · 12 months</p></div>
      <div className="refresh"><span>LAST REFRESH</span><strong>{updatedAt ? new Date(updatedAt).toLocaleString("ro-RO") : "Current report"}</strong></div>
    </header>
    <div className={`profitBanner ${profitable ? "isProfit" : "isLoss"}`}><span className="dot" /><strong>{profitable ? "Profitable" : "Below break-even"}</strong><span>ROAS {ratio(snapshot.current.roas)} versus {ratio(snapshot.breakEvenRoas)} break-even · {gap >= 0 ? "+" : ""}{gap.toFixed(2)}× gap</span></div>
    <div className="kpis">
      <Kpi label="Cost" value={money(snapshot.current.spend)} /><Kpi label="Sales" value={money(snapshot.current.revenue)} />
      <Kpi label="Clicks" value={clicks === undefined ? "—" : number(clicks)} /><Kpi label="Conversions" value={number(snapshot.current.orders)} />
      <Kpi label="Conv. rate" value={percent(conversionRate)} /><Kpi label="Cost / conv." value={snapshot.current.cpa === null ? "—" : money(snapshot.current.cpa)} />
      <Kpi label="ROAS" value={ratio(snapshot.current.roas)} accent={profitable ? "good" : "bad"} />
    </div>
    <div className="productHead"><div><h2>Products ({products.length})</h2><p>Measured product performance and profitability classification</p></div><div className="controls">
      <input aria-label="Search products" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products" />
      <select aria-label="Filter products" value={label} onChange={(event) => setLabel(event.target.value as ProductPerformanceLabel | "ALL")}><option value="ALL">All labels</option>{Object.entries(labelText).map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
      <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}><option value="cost">Sort by cost</option><option value="revenue">Sort by sales</option><option value="roas">Sort by ROAS</option><option value="clicks">Sort by clicks</option></select>
    </div></div>
    <div className="reportTable" role="region" aria-label="All product performance" tabIndex={0}><table><thead><tr><th>Product</th><th>Label</th><th>Impr.</th><th>Clicks</th><th>Cost</th><th>Conv.</th><th>Conv. rate</th><th>Clicks / sale</th><th>Sales</th><th>CPA</th><th>ROAS</th><th>ROAS gap</th></tr></thead><tbody>{visible.map((row) => <tr key={row.productId}><td><div className="productCell"><span>{row.title.slice(0, 2).toUpperCase()}</span><div><strong>{row.title}</strong><small>ID {row.productId}</small></div></div></td><td><span className={`productLabel ${row.label.toLowerCase()}`}>{labelText[row.label]}</span></td><td>{number(row.impressions)}</td><td>{number(row.clicks)}</td><td>{money(row.cost)}</td><td>{number(row.conversions)}</td><td>{percent(row.conversionRate)}</td><td>{row.clicksPerSale === null ? "—" : row.clicksPerSale.toFixed(1)}</td><td>{money(row.conversionValue)}</td><td>{row.cpa === null ? "—" : money(row.cpa)}</td><td className={row.profitabilityGap >= 0 ? "positive" : "negative"}>{ratio(row.roas)}</td><td className={row.profitabilityGap >= 0 ? "positive" : "negative"}>{row.profitabilityGap >= 0 ? "+" : ""}{row.profitabilityGap.toFixed(2)}×</td></tr>)}</tbody></table>{!visible.length && <div className="empty">No products match these filters.</div>}</div>
    <style jsx>{` .reportDashboard{font-family:Inter,Arial,sans-serif;color:#202124;background:#f5f7fa;border:1px solid #dadce0;border-radius:12px;overflow:hidden}.dashboardHeader{display:flex;justify-content:space-between;align-items:center;padding:22px 26px;background:#fff;border-bottom:1px solid #dadce0}.wordmark{font-size:11px;font-weight:800;letter-spacing:.18em;color:#1967d2}.dashboardHeader h1{font-size:24px;margin:5px 0 2px}.dashboardHeader p{margin:0;color:#5f6368;font-size:13px}.refresh{text-align:right;font-size:11px}.refresh span{display:block;color:#80868b;font-size:9px}.profitBanner{display:flex;gap:9px;align-items:center;padding:12px 26px;font-size:13px;border-bottom:1px solid #dadce0}.profitBanner .dot{width:9px;height:9px;border-radius:50%}.isProfit{background:#e6f4ea;color:#137333}.isProfit .dot{background:#1e8e3e}.isLoss{background:#fce8e6;color:#c5221f}.isLoss .dot{background:#d93025}.kpis{display:grid;grid-template-columns:repeat(7,minmax(125px,1fr));background:#fff;border-bottom:1px solid #dadce0;overflow:auto}.kpi{padding:18px 20px;border-right:1px solid #e8eaed}.kpi span{display:block;color:#5f6368;font-size:11px}.kpi strong{display:block;font-size:21px;margin-top:5px;white-space:nowrap}.kpi .good{color:#188038}.kpi .bad{color:#d93025}.productHead{display:flex;justify-content:space-between;gap:20px;align-items:end;padding:22px 26px 14px}.productHead h2{margin:0;font-size:20px}.productHead p{margin:4px 0 0;color:#5f6368;font-size:12px}.controls{display:flex;gap:8px;flex-wrap:wrap}.controls input,.controls select{height:38px;border:1px solid #dadce0;border-radius:4px;background:#fff;padding:0 11px;color:#3c4043}.controls input{min-width:220px}.reportTable{max-height:620px;overflow:auto;background:#fff;border-top:1px solid #dadce0}.reportTable table{width:100%;min-width:1320px;border-collapse:collapse;font-size:12px}.reportTable th{position:sticky;top:0;z-index:2;background:#f8f9fa;color:#5f6368;font-size:10px;text-transform:uppercase;letter-spacing:.04em;text-align:right;padding:12px;border-bottom:1px solid #dadce0}.reportTable th:first-child,.reportTable td:first-child{text-align:left}.reportTable td{text-align:right;padding:10px 12px;border-bottom:1px solid #e8eaed;font-variant-numeric:tabular-nums}.productCell{display:flex;align-items:center;gap:10px;min-width:270px}.productCell>span{width:34px;height:34px;display:grid;place-items:center;border:1px solid #dadce0;border-radius:4px;background:#f8f9fa;color:#1967d2;font-weight:700}.productCell strong,.productCell small{display:block;max-width:260px;text-align:left}.productCell small{color:#80868b;margin-top:2px}.productLabel{display:inline-flex;border-radius:12px;padding:4px 9px;white-space:nowrap;font-weight:700;background:#e8f0fe;color:#1967d2}.productLabel.loss_maker{background:#fce8e6;color:#c5221f}.productLabel.not_promoted{background:#f1f3f4;color:#5f6368}.productLabel.underpromoted_potential{background:#fef7e0;color:#b06000}.productLabel.performer{background:#e6f4ea;color:#137333}.positive{color:#188038;font-weight:700}.negative{color:#d93025;font-weight:700}.empty{padding:50px;text-align:center;color:#5f6368}@media(max-width:760px){.dashboardHeader,.productHead{align-items:flex-start;flex-direction:column}.refresh{text-align:left}.kpis{grid-template-columns:repeat(7,145px)}.controls{width:100%}.controls input,.controls select{width:100%}} `}</style>
  </section>;
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: "good" | "bad" }) { return <div className="kpi"><span>{label}</span><strong className={accent}>{value}</strong></div>; }
