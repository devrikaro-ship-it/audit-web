import { headers } from "next/headers";
import path from "node:path";
import { notFound } from "next/navigation";
import { basicAuthOk, dashCredentials } from "./dash-auth";
import { listLeads, type GadsLead } from "./gads-leads";
import { openReportSnapshot } from "./gads-report-delivery";
import { readStoredReportSnapshot, reportStorageDirectory } from "./gads-report-snapshot";
import { reportViewFromSnapshot, reportTimestamp } from "./gads-saved-report-view";
import type { ReportMetric } from "./gads-report-metrics";

export async function requireManagerAccess(): Promise<void> {
  if (!basicAuthOk((await headers()).get("authorization"), dashCredentials())) notFound();
}

export function managerAccountKey(lead: GadsLead): string {
  const id = lead.customerId?.replace(/[\s-]/g, "");
  return id && /^\d+$/.test(id) ? `account:${id}` : `record:${lead.id}`;
}

export async function registeredReports(): Promise<GadsLead[]> {
  return (await listLeads()).filter((lead) => Boolean(lead.reportId));
}

export async function readManagerReport(lead: GadsLead) {
  if (!lead.reportId || !lead.snapshotPath) return null;
  if (!/^[a-zA-Z0-9-]+$/.test(lead.reportId)) return null;
  const expectedPath = path.join(path.resolve(reportStorageDirectory()), `${lead.reportId}.snapshot`);
  if (path.resolve(lead.snapshotPath) !== expectedPath) return null;
  try {
    const snapshot = openReportSnapshot(await readStoredReportSnapshot(lead.snapshotPath));
    if (!snapshot) return null;
    return { snapshot, report: reportViewFromSnapshot(snapshot, lead.createdAt), generatedAt: reportTimestamp(snapshot, lead.createdAt) };
  } catch {
    return null;
  }
}

const value = <T,>(metric: ReportMetric<T> | undefined): T | null => metric?.status === "AVAILABLE" ? metric.value : null;

export type ManagerAccount = {
  id: string;
  customerId: string | null;
  name: string;
  website: string;
  contact: { name: string; email: string; phone: string };
  reporting: "Active" | "Inactive" | "Unknown";
  reportCount: number;
  available: boolean;
  generatedAt: string;
  period: { from: string; to: string } | null;
  currency: string | null;
  roas: number | null;
  minimumRoas: number | null;
  cpa: number | null;
  maximumCpa: number | null;
};

export async function managerAccounts(): Promise<ManagerAccount[]> {
  const grouped = new Map<string, GadsLead[]>();
  for (const lead of await registeredReports()) {
    const key = managerAccountKey(lead);
    const group = grouped.get(key) ?? [];
    group.push(lead);
    grouped.set(key, group);
  }
  const accounts: ManagerAccount[] = [];
  // Read one latest snapshot at a time; product populations never enter the client directory payload.
  for (const group of grouped.values()) {
    const lead = group[0];
    const saved = await readManagerReport(lead);
    const selected = saved?.report.periods.selected;
    const exactPeriod = selected?.status === "AVAILABLE";
    accounts.push({
      id: lead.id, customerId: lead.customerId || null,
      name: lead.customerName || saved?.snapshot.accountName || lead.website || "Unnamed store",
      website: lead.website || saved?.snapshot.website || "",
      contact: { name: lead.nume || "", email: lead.email || "", phone: lead.telefon || "" },
      reporting: lead.serviceReportsEnabled === true ? "Active" : lead.serviceReportsEnabled === false ? "Inactive" : "Unknown",
      reportCount: group.length, available: saved !== null,
      generatedAt: saved?.generatedAt || new Date(lead.createdAt).toISOString(),
      period: exactPeriod ? selected.range : null,
      currency: value(saved?.report.currencyCode),
      roas: exactPeriod ? value(saved?.report.targets.currentRoas) : null,
      minimumRoas: value(saved?.report.targets.minimumRoas),
      cpa: exactPeriod ? value(saved?.report.targets.currentCpa) : null,
      maximumCpa: value(saved?.report.targets.maximumCpa),
    });
  }
  return accounts;
}
