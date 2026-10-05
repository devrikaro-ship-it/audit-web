import { href } from "@/shared/route-table";
import { ReportingDashboard } from "@/modules/google-ads";
import styles from "@/modules/dashboard/view/manager.module.css";
import type { ManagerReportProps } from "@/modules/dashboard/controller/show-manager-report";


export function ManagerReportView({ id, history, selected, saved }: ManagerReportProps) {
  return <div className={styles.page}>
    <header className={styles.header}><div className={styles.headerInner}>
      <a className={styles.brand} href={href("dashboardGads")}>← Reporting manager</a>
      <span>{selected.customerName || saved?.snapshot.accountName || "Saved report"}</span>
    </div></header>
    <div className={styles.main}>
      <form className={styles.history} action={href("dashboardGadsReport", { id })}>
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
