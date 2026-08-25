import { createHmac, timingSafeEqual } from "node:crypto";

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

export type DeliveryTotals = { spend: number; revenue: number; orders: number; cpa: number | null; roas: number };

export type GadsReportSnapshot = {
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
};

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
  return (
    typeof item.website === "string" &&
    typeof item.accountName === "string" &&
    Number.isFinite(item.breakEvenCpa) &&
    Number.isFinite(item.breakEvenRoas) &&
    Array.isArray(item.losses) && item.losses.length <= 20 &&
    Array.isArray(item.opportunities) && item.opportunities.length <= 20
  );
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
const metric = (value: number | null, suffix = "") => value === null ? "—" : `${value.toFixed(2)}${suffix}`;

function productRows(rows: DeliveryProduct[], _amountLabel: string): string {
  void _amountLabel;
  return rows.map((row) => `<tr><td>${escapeHtml(row.title)}</td><td>${money(row.cost)}</td><td>${row.orders.toFixed(1)}</td><td>${metric(row.cpa, " RON")}</td><td>${money(row.revenue)}</td><td>${metric(row.roas, "×")}</td><td>${money(row.amount)}</td></tr>`).join("");
}

export function renderReportHtml(report: GadsReportSnapshot): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#13163a;margin:0}h1{font-size:28px}h2{margin-top:28px;color:#47499e}.badge{display:inline-block;padding:5px 9px;border-radius:99px;background:#e9fbf4;color:#16734a;font-size:11px;font-weight:700}.sim{background:#eef0ff;color:#47499e}.cards{display:grid;grid-template-columns:1fr 1fr;gap:12px}.card{border:1px solid #dfe5ef;border-radius:12px;padding:14px}.value{font-size:22px;font-weight:800}table{width:100%;border-collapse:collapse;font-size:10px}th,td{padding:8px 5px;border-bottom:1px solid #e6ebf4;text-align:right}th:first-child,td:first-child{text-align:left}.note{font-size:11px;color:#64748b;line-height:1.5}</style></head><body><p class="badge">Measured from Google Ads</p><h1>Google Ads profitability audit</h1><p>${escapeHtml(report.accountName)} · ${escapeHtml(report.website)}</p><div class="cards"><div class="card"><b>Break-even CPA</b><div class="value">${money(report.breakEvenCpa)}</div></div><div class="card"><b>Break-even ROAS</b><div class="value">${metric(report.breakEvenRoas, "×")}</div></div></div><h2>Current account vs optimized + CSS</h2><table><thead><tr><th>Metric</th><th>Current · measured</th><th>Optimized + CSS · simulation</th></tr></thead><tbody><tr><td>Advertising cost</td><td>${money(report.current.spend)}</td><td>${money(report.optimized.spend)}</td></tr><tr><td>Orders</td><td>${report.current.orders.toFixed(1)}</td><td>${report.optimized.orders.toFixed(1)}</td></tr><tr><td>CPA</td><td>${metric(report.current.cpa, " RON")}</td><td>${metric(report.optimized.cpa, " RON")}</td></tr><tr><td>Sales</td><td>${money(report.current.revenue)}</td><td>${money(report.optimized.revenue)}</td></tr><tr><td>ROAS</td><td>${metric(report.current.roas, "×")}</td><td>${metric(report.optimized.roas, "×")}</td></tr></tbody></table><h2>Products consuming budget</h2><p class="badge">Measured from Google Ads</p><table><thead><tr><th>Product</th><th>Cost</th><th>Orders</th><th>CPA</th><th>Sales</th><th>ROAS</th><th>Money at risk</th></tr></thead><tbody>${productRows(report.losses, "Money at risk")}</tbody></table><h2>Profitable products receiving too little traffic</h2><p class="badge">Measured from Google Ads</p><table><thead><tr><th>Product</th><th>Cost</th><th>Orders</th><th>CPA</th><th>Sales</th><th>ROAS</th><th>Opportunity</th></tr></thead><tbody>${productRows(report.opportunities, "Opportunity")}</tbody></table><h2>How the account could look after optimization</h2><p class="badge sim">Future simulation, not a promise</p><p>1. Stop the loss. 2. Move budget to proven profitable products. 3. Grow only while expected ROAS remains above break-even.</p><p class="note">The optimized scenario includes a 20% estimated CSS CPC reduction and diminishing returns as budget grows. It is a simulation, not a guarantee. Operating costs are modeled at a fixed 20% of sales.</p></body></html>`;
}
