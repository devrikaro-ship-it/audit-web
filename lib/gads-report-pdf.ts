import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import type { DeliveryCampaign, DeliveryProduct, GadsReportSnapshot } from "./gads-report-delivery";

const NAVY = "#171A4A";
const PURPLE = "#4F46B5";
const MUTED = "#64748B";
const BORDER = "#DFE5EF";
const RED = "#DC3F4E";
const GREEN = "#148458";

function reportsDirectory(): string {
  return process.env.GADS_REPORTS_DIR || path.join(path.dirname(process.env.GADS_LEADS_FILE || path.join(process.cwd(), "data", "gads-leads.json")), "gads-reports");
}

const money = (value: number) => `${Math.round(value).toLocaleString("en-US")} RON`;
const metric = (value: number | null, suffix = "") => value === null ? "-" : `${Math.round(value).toLocaleString("ro-RO")}${suffix}`;

function addPageTitle(doc: PDFKit.PDFDocument, title: string, badge: string): void {
  const y = doc.y;
  doc.fillColor(PURPLE).font("Helvetica-Bold").fontSize(9).text(badge.toUpperCase(), 40, y, { width: 515 });
  doc.fillColor(NAVY).fontSize(22).text(title, 40, y + 16, { width: 515 });
  doc.x = 40;
  doc.y = y + 48;
}

function metricCard(doc: PDFKit.PDFDocument, x: number, y: number, width: number, label: string, value: string): void {
  doc.roundedRect(x, y, width, 62, 9).lineWidth(1).strokeColor(BORDER).stroke();
  doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(8).text(label.toUpperCase(), x + 12, y + 12, { width: width - 24 });
  doc.fillColor(NAVY).fontSize(18).text(value, x + 12, y + 31, { width: width - 24 });
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number): void {
  if (doc.y + height > doc.page.height - 50) doc.addPage();
}

function comparisonTable(doc: PDFKit.PDFDocument, report: GadsReportSnapshot): void {
  const rows = [
    ["Advertising cost", money(report.current.spend), money(report.optimized.spend)],
    ["Orders", Math.round(report.current.orders).toLocaleString("ro-RO"), Math.round(report.optimized.orders).toLocaleString("ro-RO")],
    ["CPA", metric(report.current.cpa, " RON"), metric(report.optimized.cpa, " RON")],
    ["Sales", money(report.current.revenue), money(report.optimized.revenue)],
    ["ROAS", metric(report.current.roas, "x"), metric(report.optimized.roas, "x")],
  ];
  const widths = [165, 165, 185];
  const x = 40;
  let y = doc.y;
  const drawRow = (values: string[], header = false) => {
    const height = header ? 28 : 25;
    let cellX = x;
    doc.rect(x, y, 515, height).fill(header ? "#F2F4FB" : "#FFFFFF");
    values.forEach((value, index) => {
      doc.fillColor(header ? MUTED : NAVY).font(header ? "Helvetica-Bold" : "Helvetica").fontSize(header ? 7.5 : 9)
        .text(value, cellX + 7, y + 8, { width: widths[index] - 14, align: index === 0 ? "left" : "right", lineBreak: false });
      cellX += widths[index];
    });
    doc.moveTo(x, y + height).lineTo(x + 515, y + height).strokeColor(BORDER).lineWidth(0.6).stroke();
    y += height;
  };
  drawRow(["METRIC", "CURRENT - MEASURED", "OPTIMIZED + CSS - SIMULATION"], true);
  rows.forEach((row) => drawRow(row));
  doc.y = y + 10;
}

function productTable(doc: PDFKit.PDFDocument, rows: DeliveryProduct[], amountLabel: string, amountColor: string): void {
  const headers = ["PRODUCT", "COST", "ORDERS", "CPA", "SALES", "ROAS", amountLabel];
  const widths = [170, 60, 45, 55, 65, 45, 75];
  const x = 40;
  let y = doc.y;
  doc.rect(x, y, 515, 26).fill("#F2F4FB");
  let cellX = x;
  headers.forEach((header, index) => {
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(6.5).text(header, cellX + 5, y + 9, { width: widths[index] - 10, align: index === 0 ? "left" : "right", lineBreak: false });
    cellX += widths[index];
  });
  y += 26;
  rows.forEach((row) => {
    if (y + 34 > doc.page.height - 45) {
      doc.addPage();
      y = 45;
    }
    const values = [row.title, money(row.cost), Math.round(row.orders).toLocaleString("ro-RO"), metric(row.cpa, " RON"), money(row.revenue), metric(row.roas, "x"), money(row.amount)];
    cellX = x;
    values.forEach((value, index) => {
      doc.fillColor(index === 6 ? amountColor : NAVY).font(index === 0 || index === 6 ? "Helvetica-Bold" : "Helvetica").fontSize(index === 0 ? 8.5 : 7.5)
        .text(value, cellX + 5, y + 9, { width: widths[index] - 10, align: index === 0 ? "left" : "right", height: 18, ellipsis: true });
      cellX += widths[index];
    });
    doc.moveTo(x, y + 34).lineTo(x + 515, y + 34).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 34;
  });
  doc.y = y + 12;
}

function campaignTable(doc: PDFKit.PDFDocument, rows: DeliveryCampaign[]): void {
  const headers = ["CAMPANIE", "TIP", "COST", "VANZARI", "ROAS"];
  const widths = [205, 105, 70, 75, 60];
  const x = 40;
  let y = doc.y;
  doc.rect(x, y, 515, 26).fill("#F2F4FB");
  let cellX = x;
  headers.forEach((header, index) => {
    doc.fillColor(MUTED).font("Helvetica-Bold").fontSize(6.5).text(header, cellX + 5, y + 9, { width: widths[index] - 10, align: index < 2 ? "left" : "right", lineBreak: false });
    cellX += widths[index];
  });
  y += 26;
  rows.forEach((row) => {
    const values = [row.name, row.channel.replaceAll("_", " "), money(row.spend), money(row.revenue), metric(row.roas, "x")];
    cellX = x;
    values.forEach((value, index) => {
      doc.fillColor(NAVY).font(index === 0 ? "Helvetica-Bold" : "Helvetica").fontSize(index === 0 ? 8 : 7.5)
        .text(value, cellX + 5, y + 9, { width: widths[index] - 10, align: index < 2 ? "left" : "right", height: 18, ellipsis: true });
      cellX += widths[index];
    });
    doc.moveTo(x, y + 34).lineTo(x + 515, y + 34).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 34;
  });
  doc.y = y + 12;
}

function buildPdf(report: GadsReportSnapshot): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40, info: { Title: `Google Ads profitability audit - ${report.accountName}`, Author: "Devrika" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    addPageTitle(doc, "Google Ads profitability audit", "Measured from Google Ads");
    doc.fillColor(MUTED).font("Helvetica").fontSize(10).text(`${report.accountName}  |  ${report.website}`);
    doc.moveDown(1.2);
    const cardsY = doc.y;
    metricCard(doc, 40, cardsY, 250, "Break-even CPA", money(report.breakEvenCpa));
    metricCard(doc, 305, cardsY, 250, "Break-even ROAS", metric(report.breakEvenRoas, "x"));
    doc.y = cardsY + 82;

    addPageTitle(doc, "Current account vs optimized + CSS", "Measured vs future simulation");
    comparisonTable(doc, report);
    doc.fillColor(MUTED).font("Helvetica").fontSize(8).text("The optimized scenario includes an estimated 20% CSS CPC reduction and diminishing returns as budget grows. It is a simulation, not a guarantee.", 40, doc.y, { width: 515 });
    doc.moveDown(1.3);

    ensureSpace(doc, 120);
    addPageTitle(doc, "Products consuming your budget", "Measured from Google Ads - ranked by cost");
    productTable(doc, report.losses, "MONEY AT RISK", RED);

    ensureSpace(doc, 120);
    addPageTitle(doc, "Profitable products receiving too little traffic", "Measured from Google Ads - ranked by opportunity");
    productTable(doc, report.opportunities, "OPPORTUNITY", GREEN);

    ensureSpace(doc, 130);
    addPageTitle(doc, "How the account could look after optimization", "Future simulation - not a promise");
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text("1. Stop the loss");
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Limit products that stay below minimum ROAS.");
    doc.moveDown(0.7).fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text("2. Move the budget");
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Give controlled growth to products already proven profitable.");
    doc.moveDown(0.7).fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text("3. Grow under control");
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Increase spend only while simulated ROAS remains above break-even.");
    doc.moveDown(1.2).fontSize(8).text("Operating costs are modeled at a fixed 20% of sales. All current-account figures come from the connected Google Ads account; future figures are simulations.");

    if (report.campaigns?.length) {
      ensureSpace(doc, 150);
      addPageTitle(doc, "Cum sunt organizate campaniile acum", "Masurat din Google Ads - ultimele 30 de zile");
      campaignTable(doc, report.campaigns);
    }

    ensureSpace(doc, 190);
    addPageTitle(doc, "Cum trebuie organizat contul", "Recomandare Devrika");
    doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text("1. Search - protectie brand");
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Doar cautarile dupa numele magazinului. Mereu activa, cu buget mic si controlat.");
    doc.moveDown(0.7).fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text("2. Performance Max - produse profitabile");
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Produsele dovedite peste ROAS-ul minim primesc bugetul principal de crestere.");
    doc.moveDown(0.7).fillColor(NAVY).font("Helvetica-Bold").fontSize(11).text("3. Standard Shopping - control");
    doc.fillColor(MUTED).font("Helvetica").fontSize(9).text("Produsele si cautarile sunt controlate separat; produsele sub prag sunt limitate.");
    doc.end();
  });
}

export async function generateStoredReportPdf(reportId: string, report: GadsReportSnapshot): Promise<{ path: string; buffer: Buffer }> {
  if (!/^[a-zA-Z0-9-]+$/.test(reportId)) throw new Error("Invalid report id");
  const directory = reportsDirectory();
  await mkdir(directory, { recursive: true });
  const pdfPath = path.join(directory, `${reportId}.pdf`);
  const buffer = await buildPdf(report);
  await writeFile(pdfPath, buffer);
  return { path: pdfPath, buffer };
}
