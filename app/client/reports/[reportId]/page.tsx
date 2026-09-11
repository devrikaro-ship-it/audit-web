import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ReportingDashboard from "@/app/google-ads/raport/ReportingDashboard";
import { beforeAfterSourceFromSnapshot } from "@/lib/gads-product-simulation";
import { trackingObservationFromSnapshot } from "@/lib/gads-report-delivery";
import { readOwnedReport } from "@/lib/client-report-access";
import { clientReportView } from "@/lib/client-report-access/report-view";
import { CLIENT_SESSION_COOKIE } from "@/lib/client-session";

export const dynamic = "force-dynamic";

export default async function ClientReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const cookieStore = await cookies();
  let owned;
  try {
    owned = await readOwnedReport({
      reportId,
      sessionToken: cookieStore.get(CLIENT_SESSION_COOKIE)?.value,
    });
  } catch {
    notFound();
  }
  if (!owned) notFound();

  return (
    <main>
      <ReportingDashboard
        report={clientReportView(owned.snapshot, owned.report.createdAt)}
        presentation="sidebar"
        sourceSnapshot={beforeAfterSourceFromSnapshot(owned.snapshot)}
        tracking={trackingObservationFromSnapshot(owned.snapshot)}
      />
    </main>
  );
}

