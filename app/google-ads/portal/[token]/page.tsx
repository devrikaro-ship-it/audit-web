import { notFound } from "next/navigation";
import { listPortalReports } from "@/lib/gads-leads";
import { openReportSnapshot } from "@/lib/gads-report-delivery";
import { readStoredReportSnapshot } from "@/lib/gads-report-snapshot";
import { publicOAuthAttributes } from "@/lib/gads-public-oauth-contract";
import ReportingDashboard from "@/app/google-ads/raport/ReportingDashboard";
import { reportViewFromSnapshot, reportTimestamp } from "@/lib/gads-saved-report-view";

export const dynamic = "force-dynamic";

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
  const report = reportViewFromSnapshot(selected.snapshot, selected.lead.createdAt);

  return (
    <main {...publicOAuthAttributes("client-portal")}>
      <ReportingDashboard
        report={report}
        periodSelector={{
          action: `/google-ads/portal/${encodeURIComponent(token)}`,
          selected: selected.lead.reportId!,
          options: reports.map(({ lead, snapshot }) => ({
            value: lead.reportId!,
            label: `Report generated in ${new Date(reportTimestamp(snapshot, lead.createdAt)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`,
          })),
        }}
      />
    </main>
  );
}
