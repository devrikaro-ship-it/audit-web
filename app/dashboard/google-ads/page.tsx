import type { Metadata } from "next";
import { managerAccounts, requireManagerAccess } from "@/lib/gads-manager";
import ManagerTable from "./ManagerTable";
import styles from "./manager.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Reporting manager — Devrika", robots: { index: false, follow: false } };

export default async function DashboardGoogleAds() {
  await requireManagerAccess();
  const accounts = await managerAccounts();
  return <div className={styles.page}>
    <header className={styles.header}><div className={styles.headerInner}>
      <a className={styles.brand} href="/dashboard/google-ads">Devrika<span style={{ fontWeight: 400 }}> / Manager</span></a>
      <nav className={styles.nav} aria-label="Manager navigation">
        <a href="/dashboard/google-ads" aria-current="page">Reporting accounts</a>
        <a href="/dashboard">Website audits</a>
        <a href="/dashboard/cald">Agency clients</a>
        <form action="/dashboard/logout" method="post"><button type="submit" style={{ cursor: "pointer", font: "inherit", color: "inherit", background: "none", border: 0 }}>Sign out</button></form>
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
