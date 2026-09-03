import { createHmac, timingSafeEqual } from "node:crypto";
import type { ProductAnalysis, ProductAnalysisRow } from "@/lib/gads-product-simulation";
import type { ProductPerformanceLabel, ReportProductInput } from "@/lib/gads-product-classification";
import type {
  ClassificationDiagnostic,
  ProductPopulationStatus,
  ReportPeriodInput,
  ReportProductInputV2,
  V2ProductLabel,
} from "@/lib/gads-report-metrics";
import { comparisonRanges, type ReportDateRange } from "@/lib/gads-report-periods";
import { validateCurrencyCode } from "@/lib/gads-session";

export type DeliveryProduct = {
  productId: string;
  title: string;
  cost: number;
  revenue: number;
  orders: number;
  cpa: number | null;
  roas: number;
  amount: number;
};

export type DeliveryTotals = { spend: number; revenue: number; orders: number; cpa: number | null; roas: number; clicks?: number; impressions?: number };

export type DeliveryCampaign = {
  name: string;
  channel: string;
  spend: number;
  revenue: number;
  roas: number;
  status: string;
};

export type GadsReportSnapshotV2 = {
  version: 2;
  currencyCode: string;
  periods: {
    selected: ReportPeriodInput;
    previous: ReportPeriodInput | null;
    previousYear: ReportPeriodInput | null;
  };
  products: ReportProductInputV2[];
  productPopulationStatus: ProductPopulationStatus;
  classificationDiagnostics: ClassificationDiagnostic[];
};

export type GadsReportSnapshot = {
  generatedAt?: string;
  evidenceMonths?: number;
  website: string;
  accountName: string;
  averageOrderValue: number;
  goodsCost: number;
  breakEvenCpa: number;
  breakEvenRoas: number;
  current: DeliveryTotals;
  optimized: DeliveryTotals;
  losses: DeliveryProduct[];
  opportunities: DeliveryProduct[];
  campaigns?: DeliveryCampaign[];
  productAnalysis?: ProductAnalysis;
  reportProducts?: ReportProductInput[];
  reportV2?: GadsReportSnapshotV2;
};

export function normalizeReportProductsToPeriod(products: ReportProductInput[], periodCount: number): ReportProductInput[] {
  if (!Number.isFinite(periodCount) || periodCount <= 0) throw new Error("periodCount must be positive");
  return products.map((product) => ({
    ...product,
    cost: product.cost / periodCount,
    conversionValue: product.conversionValue / periodCount,
    conversions: product.conversions / periodCount,
    clicks: product.clicks / periodCount,
    impressions: product.impressions / periodCount,
  }));
}

function signingSecret(): string {
  const value = process.env.GADS_REPORT_SIGNING_SECRET || process.env.GADS_SESSION_SECRET;
  if (!value) {
    if (process.env.NODE_ENV === "production") throw new Error("GADS_REPORT_SIGNING_SECRET is required");
    return "development-report-signing-secret";
  }
  return value;
}

function signature(payload: string): string {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

export function sealReportSnapshot(snapshot: GadsReportSnapshot): string {
  const payload = Buffer.from(JSON.stringify(snapshot)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

function validSnapshot(value: unknown): value is GadsReportSnapshot {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<GadsReportSnapshot>;
  const campaignsValid = item.campaigns === undefined || (
    Array.isArray(item.campaigns) &&
    item.campaigns.length <= 10 &&
    item.campaigns.every((campaign) =>
      campaign &&
      typeof campaign.name === "string" &&
      typeof campaign.channel === "string" &&
      Number.isFinite(campaign.spend) &&
      Number.isFinite(campaign.revenue) &&
      Number.isFinite(campaign.roas) &&
      typeof campaign.status === "string"
    )
  );
  const productAnalysisValid = item.productAnalysis === undefined || validProductAnalysis(item.productAnalysis);
  const reportProductsValid = item.reportProducts === undefined || (Array.isArray(item.reportProducts) && item.reportProducts.length <= 10000 && item.reportProducts.every(validReportProduct));
  const generatedAtValid = item.generatedAt === undefined || (typeof item.generatedAt === "string" && Number.isFinite(Date.parse(item.generatedAt)));
  const evidenceMonthsValid = item.evidenceMonths === undefined || (typeof item.evidenceMonths === "number" && Number.isInteger(item.evidenceMonths) && item.evidenceMonths > 0);
  const reportV2Valid = item.reportV2 === undefined || validReportV2(item.reportV2);
  return (
    typeof item.website === "string" &&
    typeof item.accountName === "string" &&
    Number.isFinite(item.breakEvenCpa) &&
    Number.isFinite(item.breakEvenRoas) &&
    Array.isArray(item.losses) && item.losses.length <= 20 &&
    Array.isArray(item.opportunities) && item.opportunities.length <= 20 &&
    campaignsValid &&
    productAnalysisValid && reportProductsValid && generatedAtValid && evidenceMonthsValid && reportV2Valid
  );
}

const V2_PRODUCT_LABELS = new Set<V2ProductLabel>([
  "LOSS_MAKER",
  "NOT_PROMOTED",
  "UNDERPROMOTED_POTENTIAL",
  "PERFORMER",
]);
const SOURCE_PRODUCT_LABELS = new Set<ProductPerformanceLabel>([
  ...V2_PRODUCT_LABELS,
  "INSUFFICIENT_DATA",
]);

function validDateRange(value: unknown): value is ReportDateRange {
  if (!value || typeof value !== "object") return false;
  const range = value as Partial<ReportDateRange>;
  if (typeof range.from !== "string" || typeof range.to !== "string") return false;
  try {
    const selected = comparisonRanges({ from: range.from, to: range.to }).selected;
    return selected.from === range.from && selected.to === range.to;
  } catch {
    return false;
  }
}

function validPeriodInput(value: unknown): value is ReportPeriodInput {
  if (!value || typeof value !== "object") return false;
  const period = value as Partial<ReportPeriodInput>;
  return validDateRange(period.range)
    && [period.spend, period.salesVolume, period.numberOfSales]
      .every((metric) => Number.isFinite(metric) && Number(metric) >= 0);
}

function validReportV2Product(value: unknown): value is ReportProductInputV2 {
  if (!validReportProduct(value)) return false;
  const product = value as ReportProductInputV2;
  return product.sourceLabel === undefined || SOURCE_PRODUCT_LABELS.has(product.sourceLabel);
}

function validClassificationDiagnostic(value: unknown): value is ClassificationDiagnostic {
  if (!value || typeof value !== "object") return false;
  const diagnostic = value as Partial<ClassificationDiagnostic>;
  return typeof diagnostic.productId === "string"
    && (diagnostic.sourceLabel === null || (
      typeof diagnostic.sourceLabel === "string"
      && SOURCE_PRODUCT_LABELS.has(diagnostic.sourceLabel as ProductPerformanceLabel)
    ))
    && typeof diagnostic.assignedGroupKey === "string"
    && V2_PRODUCT_LABELS.has(diagnostic.assignedGroupKey as V2ProductLabel)
    && typeof diagnostic.reason === "string";
}

function validReportV2(value: unknown): value is GadsReportSnapshotV2 {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<GadsReportSnapshotV2>;
  let currencyValid = false;
  try {
    currencyValid = validateCurrencyCode(report.currencyCode) === report.currencyCode;
  } catch {
    currencyValid = false;
  }
  if (!currencyValid || report.version !== 2 || !report.periods || typeof report.periods !== "object") return false;
  if (!validPeriodInput(report.periods.selected)) return false;
  if (report.periods.previous !== null && !validPeriodInput(report.periods.previous)) return false;
  if (report.periods.previousYear !== null && !validPeriodInput(report.periods.previousYear)) return false;
  if (!Array.isArray(report.products) || report.products.length > 10_000 || !report.products.every(validReportV2Product)) return false;
  if (new Set(report.products.map((product) => product.productId)).size !== report.products.length) return false;
  if (report.productPopulationStatus !== "COMPLETE" && report.productPopulationStatus !== "PARTIAL") return false;
  return Array.isArray(report.classificationDiagnostics)
    && report.classificationDiagnostics.length <= 10_000
    && report.classificationDiagnostics.every(validClassificationDiagnostic);
}

function validReportProduct(value: unknown): value is ReportProductInput {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ReportProductInput>;
  return typeof row.productId === "string" && typeof row.title === "string" &&
    [row.cost, row.conversionValue, row.conversions, row.clicks, row.impressions].every(Number.isFinite) &&
    (row.catalogEligible === undefined || typeof row.catalogEligible === "boolean");
}

function validProductAnalysis(value: unknown): value is ProductAnalysis {
  if (!value || typeof value !== "object") return false;
  const analysis = value as Partial<ProductAnalysis>;
  return (
    Number.isFinite(analysis.breakEvenRoas) &&
    Number.isFinite(analysis.months) &&
    Number.isFinite(analysis.currentMonthlySpend) &&
    Number.isFinite(analysis.lossProductMonthlyCap) &&
    Number.isFinite(analysis.economicBudgetLimit) &&
    Array.isArray(analysis.losses) && analysis.losses.length <= 20 && analysis.losses.every(validProductRow) &&
    Array.isArray(analysis.opportunities) && analysis.opportunities.length <= 20 && analysis.opportunities.every(validProductRow)
  );
}

function validProductRow(value: unknown): value is ProductAnalysisRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<ProductAnalysisRow>;
  return (
    typeof row.productId === "string" &&
    typeof row.title === "string" &&
    [row.cost, row.conversionValue, row.conversions, row.clicks, row.impressions, row.monthlyCost, row.monthlyRevenue, row.monthlyOrders, row.roas, row.monthlyMoneyAtRisk, row.estimatedSalesOpportunity].every(Number.isFinite) &&
    (row.cpa === null || Number.isFinite(row.cpa))
  );
}

export function productAnalysisFromSnapshot(snapshot: GadsReportSnapshot): ProductAnalysis {
  if (snapshot.productAnalysis) return snapshot.productAnalysis;
  const months = 12;
  const convert = (row: DeliveryProduct): ProductAnalysisRow => ({
    productId: row.productId,
    title: row.title,
    cost: row.cost * months,
    conversionValue: row.revenue * months,
    conversions: row.orders * months,
    clicks: 0,
    impressions: 0,
    monthlyCost: row.cost,
    monthlyRevenue: row.revenue,
    monthlyOrders: row.orders,
    roas: row.roas,
    cpa: row.cpa,
    monthlyMoneyAtRisk: row.amount,
    estimatedSalesOpportunity: row.amount,
  });
  const losses = snapshot.losses.map(convert);
  const opportunities = snapshot.opportunities.map(convert);
  return {
    breakEvenRoas: snapshot.breakEvenRoas,
    months,
    currentMonthlySpend: snapshot.current.spend,
    lossProductMonthlyCap: losses.reduce((sum, row) => sum + row.monthlyCost, 0) * 0.1,
    economicBudgetLimit: snapshot.current.spend,
    losses,
    opportunities,
  };
}

export function openReportSnapshot(raw: string): GadsReportSnapshot | null {
  const index = raw.lastIndexOf(".");
  if (index < 1) return null;
  const payload = raw.slice(0, index);
  const received = Buffer.from(raw.slice(index + 1));
  const expected = Buffer.from(signature(payload));
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    return validSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
const money = (value: number) => `${Math.round(value).toLocaleString("ro-RO")} RON`;
const metric = (value: number | null, suffix = "") => value === null ? "—" : `${Math.round(value).toLocaleString("ro-RO")}${suffix}`;

function productRows(rows: DeliveryProduct[], _amountLabel: string): string {
  void _amountLabel;
  return rows.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td>${money(row.cost)}</td><td>${Math.round(row.orders).toLocaleString("ro-RO")}</td><td>${metric(row.cpa, " RON")}</td><td>${money(row.revenue)}</td><td>${metric(row.roas, "×")}</td><td>${money(row.amount)}</td></tr>`).join("");
}

function campaignRows(rows: DeliveryCampaign[]): string {
  return rows.map((row) => `<tr><td>${escapeHtml(row.name)}</td><td>${escapeHtml(row.channel.replaceAll("_", " "))}</td><td>${money(row.spend)}</td><td>${money(row.revenue)}</td><td>${metric(row.roas, "×")}</td></tr>`).join("");
}

export function renderReportHtml(report: GadsReportSnapshot): string {
  const campaigns = report.campaigns?.length ? `<h2>Cum sunt organizate campaniile acum</h2><p class="badge">Măsurat din Google Ads · ultimele 30 de zile</p><table><thead><tr><th>Campanie</th><th>Tip</th><th>Cost</th><th>Vânzări</th><th>ROAS</th></tr></thead><tbody>${campaignRows(report.campaigns)}</tbody></table>` : "";
  const recommended = `<h2>Cum trebuie organizat contul</h2><p class="badge sim">Recomandare Devrika</p><div class="cards"><div class="card"><b>Search · protecție brand</b><p class="note">Apără căutările după numele magazinului și rămâne mereu activă.</p></div><div class="card"><b>Performance Max · produse profitabile</b><p class="note">Primește produsele dovedite peste ROAS-ul minim și bugetul principal de creștere.</p></div><div class="card"><b>Standard Shopping · control</b><p class="note">Controlează produsele și căutările; produsele sub prag sunt limitate.</p></div></div>`;
  return `<!doctype html><html lang="ro"><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#13163a;margin:0}h1{font-size:28px}h2{margin-top:28px;color:#47499e}.badge{display:inline-block;padding:5px 9px;border-radius:99px;background:#e9fbf4;color:#16734a;font-size:11px;font-weight:700}.sim{background:#eef0ff;color:#47499e}.cards{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{border:1px solid #dfe5ef;border-radius:12px;padding:14px}.value{font-size:22px;font-weight:800}table{width:100%;border-collapse:collapse;font-size:10px}th,td{padding:8px 5px;border-bottom:1px solid #e6ebf4;text-align:right}th:first-child,td:first-child{text-align:left}.note{font-size:11px;color:#64748b;line-height:1.5}</style></head><body><p class="badge">Măsurat din Google Ads</p><h1>Audit de profitabilitate Google Ads</h1><p>${escapeHtml(report.accountName)} · ${escapeHtml(report.website)}</p><div class="cards"><div class="card"><b>CPA maxim</b><div class="value">${money(report.breakEvenCpa)}</div></div><div class="card"><b>ROAS minim</b><div class="value">${metric(report.breakEvenRoas, "×")}</div></div></div><h2>Cont actual vs optimizat + CSS</h2><table><thead><tr><th>Indicator</th><th>Actual · măsurat</th><th>Optimizat + CSS · simulare</th></tr></thead><tbody><tr><td>Cost publicitate</td><td>${money(report.current.spend)}</td><td>${money(report.optimized.spend)}</td></tr><tr><td>Comenzi</td><td>${Math.round(report.current.orders).toLocaleString("ro-RO")}</td><td>${Math.round(report.optimized.orders).toLocaleString("ro-RO")}</td></tr><tr><td>CPA</td><td>${metric(report.current.cpa, " RON")}</td><td>${metric(report.optimized.cpa, " RON")}</td></tr><tr><td>Vânzări</td><td>${money(report.current.revenue)}</td><td>${money(report.optimized.revenue)}</td></tr><tr><td>ROAS</td><td>${metric(report.current.roas, "×")}</td><td>${metric(report.optimized.roas, "×")}</td></tr></tbody></table><h2>Produse care îți consumă bugetul</h2><p class="badge">Măsurat din Google Ads</p><table><thead><tr><th>Produs</th><th>Cost</th><th>Comenzi</th><th>CPA</th><th>Vânzări</th><th>ROAS</th><th>Bani în risc</th></tr></thead><tbody>${productRows(report.losses, "Bani în risc")}</tbody></table><h2>Produse profitabile care primesc prea puțin trafic</h2><p class="badge">Măsurat din Google Ads</p><table><thead><tr><th>Produs</th><th>Cost</th><th>Comenzi</th><th>CPA</th><th>Vânzări</th><th>ROAS</th><th>Oportunitate</th></tr></thead><tbody>${productRows(report.opportunities, "Oportunitate")}</tbody></table><h2>Cum ar putea arăta contul după optimizare</h2><p class="badge sim">Simulare viitoare, nu promisiune</p><p>1. Oprește pierderile. 2. Mută bugetul spre produsele profitabile dovedite. 3. Crește doar cât timp ROAS-ul estimat rămâne peste prag.</p>${campaigns}${recommended}<p class="note">Scenariul optimizat include o reducere estimată de 20% a CPC-ului prin CSS și randamente descrescătoare pe măsură ce bugetul crește. Este o simulare, nu o garanție. Costurile operaționale sunt estimate la 20% din vânzări.</p></body></html>`;
}
