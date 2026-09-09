"use client";

import { useState } from "react";
import type { ManagerAccount } from "@/lib/gads-manager";
import styles from "./manager.module.css";

function comparison(actual: number | null, target: number | null, maximum = false) {
  if (actual === null || target === null) return { label: "Unavailable", tone: "neutral" };
  if (actual === target) return { label: "At target", tone: "positive" };
  const good = maximum ? actual < target : actual > target;
  return { label: maximum ? (good ? "Within target" : "Over target") : (good ? "Above target" : "Below target"), tone: good ? "positive" : "negative" };
}

const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const ratio = (amount: number | null) => amount === null ? "—" : `${amount.toFixed(2)}×`;
const amount = (value: number | null, currency: string | null) => value === null ? "—" : `${value.toLocaleString("en-GB", { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${currency || "currency unavailable"}`;

export default function ManagerTable({ accounts }: { accounts: ManagerAccount[] }) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLocaleLowerCase();
  const rows = accounts.filter((row) => [row.name, row.website, row.customerId, row.contact.name, row.contact.email, row.contact.phone].some((field) => field?.toLocaleLowerCase().includes(needle)));
  const active = accounts.filter((row) => row.reporting === "Active").length;
  const below = accounts.filter((row) => comparison(row.roas, row.minimumRoas).tone === "negative").length;

  return <>
    <section className={styles.stats} aria-label="Reporting overview">
      <div><span>Stores with reports</span><strong>{accounts.length}</strong></div>
      <div><span>Recurring reporting active</span><strong>{active}</strong></div>
      <div><span>Below ROAS target</span><strong className={below ? styles.negativeText : undefined}>{below}</strong></div>
    </section>
    <section className={styles.panel} aria-label="Registered reporting accounts">
      <div className={styles.toolbar}>
        <div><h2>Client reports</h2><p>Latest saved report for each store.</p></div>
        <label className={styles.search}>Search stores or contacts<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Store, account ID, name or email" /></label>
      </div>
      {accounts.length === 0 ? <div className={styles.empty}><h3>No saved reports yet</h3><p>Stores appear here after a report is saved through the reporting form.</p><a href="/google-ads">Open reporting</a></div> : <>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Registered stores and their latest report. Select a store to open its report.</caption>
            <thead><tr><th>Store</th><th>Contact</th><th>Reporting</th><th>Latest report</th><th>ROAS vs target</th><th>CPA vs target</th><th><span className={styles.srOnly}>Open report</span></th></tr></thead>
            <tbody>{rows.map((row) => {
              const href = `/dashboard/google-ads/reports/${encodeURIComponent(row.id)}`;
              const roas = comparison(row.roas, row.minimumRoas);
              const cpa = comparison(row.cpa, row.maximumCpa, true);
              return <tr key={row.id} onClick={(event) => {
                if ((event.target as HTMLElement).closest("a,button,input,select") || window.getSelection()?.toString()) return;
                window.location.assign(href);
              }}>
                <td><a className={styles.storeLink} href={href}>{row.name}</a><small>{row.website || "Website not provided"}</small><small>{row.customerId || "Account ID unavailable"}</small></td>
                <td><span className={styles.contactName}>{row.contact.name || "Name not provided"}</span><small>{row.contact.email || "Email not provided"}</small><small>{row.contact.phone || "Phone not provided"}</small></td>
                <td><span className={`${styles.badge} ${row.reporting === "Active" ? styles.positive : styles.neutral}`}>{row.reporting}</span><small>Recurring reporting</small></td>
                <td><span className={`${styles.badge} ${row.available ? styles.neutral : styles.negative}`}>{row.available ? "Available" : "Unavailable"}</span><small>{date(row.generatedAt)}</small><small>{row.period ? `${row.period.from} – ${row.period.to}` : "Period unavailable"}</small><small>{row.reportCount} saved {row.reportCount === 1 ? "report" : "reports"}</small></td>
                <td><strong className={styles.metric}>{ratio(row.roas)}</strong><small>Target ≥ {ratio(row.minimumRoas)}</small><span className={`${styles.badge} ${styles[roas.tone]}`}>{roas.label}</span></td>
                <td><strong className={styles.metric}>{amount(row.cpa, row.currency)}</strong><small>Target ≤ {amount(row.maximumCpa, row.currency)}</small><span className={`${styles.badge} ${styles[cpa.tone]}`}>{cpa.label}</span></td>
                <td><a className={styles.openLink} href={href} aria-label={`Open report for ${row.name}`}>↗</a></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        {rows.length === 0 && <div className={styles.empty}><h3>No matching stores</h3><p>Try another store name, account ID or contact.</p><button onClick={() => setQuery("")}>Clear search</button></div>}
        <div className={styles.footer} aria-live="polite">Showing {rows.length} of {accounts.length} stores · Saved report figures, not a live account refresh</div>
      </>}
    </section>
  </>;
}
