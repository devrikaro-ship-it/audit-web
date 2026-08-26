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

export type DeliveryCampaign = {
  name: string;
  channel: string;
  spend: number;
  revenue: number;
  roas: number;
  status: string;
};

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
  campaigns?: DeliveryCampaign[];
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
  return (
    typeof item.website === "string" &&
    typeof item.accountName === "string" &&
    Number.isFinite(item.breakEvenCpa) &&
    Number.isFinite(item.breakEvenRoas) &&
    Array.isArray(item.losses) && item.losses.length <= 20 &&
    Array.isArray(item.opportunities) && item.opportunities.length <= 20 &&
    campaignsValid
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
