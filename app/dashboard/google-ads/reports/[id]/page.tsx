import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { managerAccountKey, readManagerReport, registeredReports, requireManagerAccess } from "@/lib/gads-manager";
import ReportingDashboard from "@/app/google-ads/raport/ReportingDashboard";
import styles from "../../manager.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Client report — Devrika Manager", robots: { index: false, follow: false } };

export default async function ManagerReportPage({ params, searchParams }: {
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
  return <div className={styles.page}>
    <header className={styles.header}><div className={styles.headerInner}>
      <a className={styles.brand} href="/dashboard/google-ads">← Reporting manager</a>
      <span>{selected.customerName || saved?.snapshot.accountName || "Saved report"}</span>
    </div></header>
    <div className={styles.main}>
      <form className={styles.history} action={`/dashboard/google-ads/reports/${encodeURIComponent(id)}`}>
        <label htmlFor="saved-report">Saved report</label>
        <select id="saved-report" name="report" defaultValue={selected.id}>
          {history.map((lead) => <option key={lead.id} value={lead.id}>{new Date(lead.createdAt).toLocaleString("en-GB", { timeZone: "UTC" })} UTC · {lead.reportId}</option>)}
        </select>
        <button type="submit">Open report</button>
      </form>
      {!saved && <section className={styles.panel}><div className={styles.empty}><h1>Report unavailable</h1><p>This saved report could not be opened. Select another saved report or return to the manager.</p></div></section>}
    </div>
    {saved && <ReportingDashboard report={saved.report} />}
  </div>;
}
