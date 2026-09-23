import Link from "next/link";
import type { Metadata } from "next";
import { listAudits } from "@/lib/leads-store";
import { managerAccounts, requireManagerAccess } from "@/lib/gads-manager";
import { listStatuses } from "@/lib/dashboard-status";
import { buildRows, dashboardKpis, type DashboardRow } from "@/lib/dashboard-rows";
import StatusSelect from "./StatusSelect";
import "../dvk.css";
import "./dashboard.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard audituri — Devrika", robots: { index: false, follow: false } };

const FILTERS = [
  { id: "toate", label: "Toate" },
  { id: "site", label: "Audit site" },
  { id: "gads", label: "Audit Google Ads" },
] as const;
type FilterId = (typeof FILTERS)[number]["id"];

function fmtDate(t: number) {
  return t ? new Date(t).toLocaleString("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
}

async function loadKpis(rows: DashboardRow[]) {
  return dashboardKpis(rows, Date.now());
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ tip?: string }> }) {
  await requireManagerAccess();
  const { tip } = await searchParams;
  const filter: FilterId = FILTERS.some((f) => f.id === tip) ? (tip as FilterId) : "toate";
  const [audits, accounts, statuses] = await Promise.all([listAudits(), managerAccounts(), listStatuses()]);
  const all = buildRows(audits, accounts, statuses);
  const rows = buildRows(audits, accounts, statuses, filter);
  const kpis = await loadKpis(all);

  return (
    <div className="dvk">
      <header className="top">
        <div className="wrap">
          <Link href="/dashboard" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/devrika-logo.svg" alt="Devrika" width={142} height={34} />
            <span>Dashboard audituri</span>
          </Link>
          <nav className="nav" aria-label="Dashboard">
            <Link href="/dashboard/google-ads">Detalii Google Ads</Link>
          </nav>
          <div className="right">
            <form action="/dashboard/logout" method="post"><button type="submit" className="logout">Iesire</button></form>
          </div>
        </div>
      </header>

      <main className="wrap dash-main">
        <div className="eyebrow">Toate auditurile</div>
        <h1 className="dash-title">Prospecti din audituri</h1>
        <p className="dash-intro">Fiecare audit terminat apare aici, cu datele de contact, rezultatul si raportul. Statusul il schimbi direct din tabel.</p>

        <div className="kpis">{kpis.map((k) => <div key={k.l} className="kpi"><strong>{k.n}</strong><span>{k.l}</span></div>)}</div>

        <div className="filters">
          {FILTERS.map((f) => (
            <Link key={f.id} href={f.id === "toate" ? "/dashboard" : `/dashboard?tip=${f.id}`} aria-current={filter === f.id ? "page" : undefined}>{f.label}</Link>
          ))}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Data</th><th>Tip</th><th>Status</th><th>Canal</th><th>Site</th><th>Nume</th><th>Email</th><th>Telefon</th><th>Observatii</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="muted">Niciun audit inca.</td></tr>}
              {rows.map((r) => (
                <tr key={r.key}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.createdAt)}</td>
                  <td>{r.tip}</td>
                  <td><StatusSelect rowKey={r.key} status={r.status} /></td>
                  <td><span className={`canal ${r.canal === "Audit site" ? "site" : "gads"}`}>{r.canal}</span></td>
                  <td>{r.site}</td>
                  <td>{r.nume || <span className="muted">—</span>}</td>
                  <td>{r.email ? <a href={`mailto:${r.email}`}>{r.email}</a> : <span className="muted">—</span>}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{r.telefon ? <a href={`tel:${r.telefon}`}>{r.telefon}</a> : <span className="muted">—</span>}</td>
                  <td className="obs">
                    <b>{r.observatii.rezultat}</b>
                    {r.observatii.preocupare && <span className="muted">{r.observatii.preocupare}</span>}
                    <div><a href={r.observatii.raport} target="_blank" rel="noopener noreferrer">Deschide raportul →</a></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
