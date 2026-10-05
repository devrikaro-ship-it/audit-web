import type { Metadata } from "next";
import { requireManagerAccess } from "@/modules/google-ads";
import type { AuditModule } from "@/shared/audit-contract";
import { listStatuses } from "@/modules/dashboard/model/data/status-store";
import { readObservations, summarizeByPlatform } from "@/modules/site-audit";
import { computeLearning, readApprovals } from "@/modules/site-audit";
import { PROFILES } from "@/modules/site-audit";
import { buildRows, dashboardKpis, type DashboardRow } from "@/modules/dashboard/model/rows";
import { isValidElement, type ReactElement } from "react";
import { DashboardView } from "@/modules/dashboard/view/dashboard";

async function loadKpis(rows: DashboardRow[]) {
  return dashboardKpis(rows, Date.now());
}

export async function loadDashboard({ searchParams, audits }: { searchParams: Promise<{ tip?: string }>; audits: AuditModule[] }) {
  await requireManagerAccess();
  const { tip } = await searchParams;
  const FILTERS = [{ id: "toate", label: "Toate" }, ...audits.map((a) => ({ id: a.filter, label: a.channel }))];
  const filter = FILTERS.some((f) => f.id === tip) ? (tip as string) : "toate";
  const [groups, statuses, observations] = await Promise.all([
    Promise.all(audits.map(async (a) => ({ filter: a.filter, rows: await a.prospects() }))), listStatuses(), readObservations()]);
  const platforms = summarizeByPlatform(observations);
  const learning = computeLearning(observations, PROFILES, await readApprovals());
  const curated = Object.fromEntries(PROFILES.map((p) => [p.platform, p.concurrency]));
  const all = buildRows(groups, statuses);
  const rows = buildRows(groups, statuses, filter);
  const kpis = await loadKpis(all);
  return { FILTERS, filter, platforms, learning, curated, rows, kpis };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type DashboardProps = Exclude<Awaited<ReturnType<typeof loadDashboard>>, ReactElement>;

export async function showDashboard(props: Parameters<typeof loadDashboard>[0]) {
  const loaded = await loadDashboard(props);
  return isValidElement(loaded) ? loaded : <DashboardView {...(loaded as DashboardProps)} />;
}

export const metadata: Metadata = { title: "Dashboard audituri — Devrika", robots: { index: false, follow: false } };
