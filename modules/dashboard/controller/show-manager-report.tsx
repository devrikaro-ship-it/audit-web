import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { managerAccountKey, readManagerReport, registeredReports, requireManagerAccess } from "@/modules/google-ads";
import { isValidElement, type ReactElement } from "react";
import { ManagerReportView } from "@/modules/dashboard/view/manager-report";


export async function loadManagerReport({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ report?: string }>;
}) {
  await requireManagerAccess();
  const { id } = await params;
  const { report: requestedId } = await searchParams;
  const leads = await registeredReports();
  const anchor = leads.find((lead) => lead.id === id);
  if (!anchor) notFound();
  const history = leads.filter((lead) => managerAccountKey(lead) === managerAccountKey(anchor));
  const selected = history.find((lead) => lead.id === (requestedId ?? id));
  if (!selected) notFound();
  const saved = await readManagerReport(selected);
  return { id, history, selected, saved };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type ManagerReportProps = Exclude<Awaited<ReturnType<typeof loadManagerReport>>, ReactElement>;

export async function showManagerReport(props: Parameters<typeof loadManagerReport>[0]) {
  const loaded = await loadManagerReport(props);
  return isValidElement(loaded) ? loaded : <ManagerReportView {...(loaded as ManagerReportProps)} />;
}

export const metadata: Metadata = { title: "Client report — Devrika Manager", robots: { index: false, follow: false } };
