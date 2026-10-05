import { href } from "@/shared/route-table";
import ManagerTable from "@/modules/dashboard/view/manager-table";
import styles from "@/modules/dashboard/view/manager.module.css";
import type { ManagerAccountsProps } from "@/modules/dashboard/controller/show-manager-accounts";


export function ManagerAccountsView({ accounts }: ManagerAccountsProps) {
  return <div className={styles.page}>
    <header className={styles.header}><div className={styles.headerInner}>
      <a className={styles.brand} href={href("dashboardGads")}>Devrika<span style={{ fontWeight: 400 }}> / Manager</span></a>
      <nav className={styles.nav} aria-label="Manager navigation">
        <a href={href("dashboardGads")} aria-current="page">Reporting accounts</a>
        <a href={href("dashboardHome")}>Website audits</a>
        <form action={href("dashboardLogout")} method="post"><button type="submit" style={{ cursor: "pointer", font: "inherit", color: "inherit", background: "none", border: 0 }}>Sign out</button></form>
      </nav>
    </div></header>
    <main className={styles.main}>
      <div className={styles.eyebrow}>Reporting workspace</div>
      <h1 className={styles.title}>Your clients, at a glance.</h1>
      <p className={styles.intro}>Find a store, check its latest results and open its report.</p>
      <ManagerTable accounts={accounts} />
    </main>
  </div>;
}
