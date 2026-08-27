import { notFound } from "next/navigation";
import { C, brandGradient, inter, sora } from "@/lib/theme";
import { listPortalReports } from "@/lib/gads-leads";
import { openReportSnapshot } from "@/lib/gads-report-delivery";
import { readStoredReportSnapshot } from "@/lib/gads-report-snapshot";
import { publicOAuthAttributes } from "@/lib/gads-public-oauth-contract";
import ReportingDashboard from "@/app/google-ads/raport/ReportingDashboard";

export const dynamic = "force-dynamic";

const money = (value: number) => `${Math.round(value).toLocaleString("ro-RO")} RON`;
const metric = (value: number | null, suffix = "") => value === null ? "—" : `${Math.round(value).toLocaleString("ro-RO")}${suffix}`;

export default async function ClientReportPortal({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ report?: string }> }) {
  const { token } = await params;
  const { report: requestedReportId } = await searchParams;
  const leads = await listPortalReports(token);
  if (!leads.length) notFound();

  const reports = (await Promise.all(leads.map(async (lead) => {
    if (!lead.snapshotPath || !lead.reportId || !lead.reportToken) return null;
    try {
      const snapshot = openReportSnapshot(await readStoredReportSnapshot(lead.snapshotPath));
      return snapshot ? { lead, snapshot } : null;
    } catch {
      return null;
    }
  }))).filter((report): report is NonNullable<typeof report> => report !== null);

  const latest = reports[0];
  if (!latest) notFound();
  const selected = reports.find(({ lead }) => lead.reportId === requestedReportId) ?? latest;

  return <main {...publicOAuthAttributes("client-portal")} style={{ minHeight: "100vh", background: C.slate, color: C.navy, fontFamily: inter }}>
    <section style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.indigo})`, color: C.white }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px" }}>
        <p style={{ margin: 0, color: C.cyan, fontFamily: sora, fontWeight: 800, letterSpacing: "0.14em", fontSize: 13 }}>DEVRIKA · GOOGLE ADS</p>
        <h1 style={{ margin: "12px 0 8px", fontFamily: sora, fontSize: "clamp(30px,5vw,52px)", lineHeight: 1.05 }}>Profitability dashboard</h1>
        <p style={{ margin: 0, color: "#D8E1F2", fontSize: 17 }}>{selected.snapshot.accountName} · updated {new Date(selected.lead.createdAt).toLocaleDateString("ro-RO")}</p>
      </div>
    </section>

    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "28px 24px 64px" }}>
      <section style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 18, overflow: "hidden" }}>
        <div style={{ padding: "22px 24px", borderBottom: `1px solid ${C.border}` }}>
          <h2 style={{ margin: 0, fontFamily: sora, fontSize: 22 }}>Monthly reports</h2>
        </div>
        {reports.map(({ lead, snapshot }) => <a key={lead.id} href={`/google-ads/portal/${encodeURIComponent(token)}?report=${encodeURIComponent(lead.reportId!)}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, padding: "18px 24px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap", textDecoration: "none", color: C.navy, background: lead.reportId === selected.lead.reportId ? "#F5F6FF" : C.white }}>
          <div>
            <strong style={{ fontFamily: sora }}>{new Date(lead.createdAt).toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}</strong>
            <div style={{ marginTop: 5, color: C.gray500, fontSize: 14 }}>{money(snapshot.current.spend)} cost · {money(snapshot.current.revenue)} sales · ROAS {metric(snapshot.current.roas, "×")}</div>
          </div>
          <span style={{ background: lead.reportId === selected.lead.reportId ? brandGradient : C.slate, color: lead.reportId === selected.lead.reportId ? C.white : C.indigo, padding: "11px 16px", borderRadius: 11, fontFamily: sora, fontWeight: 700 }}>{lead.reportId === selected.lead.reportId ? "Current live report" : "View live report"}</span>
        </a>)}
      </section>

      <section style={{ marginTop: 28 }}>
        <ReportingDashboard snapshot={selected.snapshot} updatedAt={new Date(selected.lead.createdAt).toISOString()} />
      </section>
    </div>
  </main>;
}
