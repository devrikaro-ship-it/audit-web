import { href } from "@/shared/route-table";
import { publicOAuthAttributes } from "@/shared/public-contract/oauth-contract";
import ReportingDashboard from "@/modules/google-ads/view/reporting-dashboard";
import { reportTimestamp } from "@/modules/google-ads/controller/show-portal";
import type { PortalProps } from "@/modules/google-ads/controller/show-portal";


export function PortalView({ token, reports, selected, report }: PortalProps) {
  return (
    <main {...publicOAuthAttributes("client-portal")}>
      <ReportingDashboard
        report={report}
        periodSelector={{
          action: href("gadsPortal", { token }),
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
