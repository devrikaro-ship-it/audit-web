import { notFound } from "next/navigation";
import { listPortalReports } from "@/lib/gads-leads";
import { openReportSnapshot, type GadsReportSnapshot } from "@/lib/gads-report-delivery";
import { readStoredReportSnapshot } from "@/lib/gads-report-snapshot";
import { publicOAuthAttributes } from "@/lib/gads-public-oauth-contract";
import ReportingDashboard from "@/app/google-ads/raport/ReportingDashboard";
import {
  buildGoogleAdsReportV2,
  type GoogleAdsReportV2ViewModel,
  type ReportProductInputV2,
} from "@/lib/gads-report-metrics";

export const dynamic = "force-dynamic";

const reportTimestamp = (snapshot: GadsReportSnapshot, legacyCreatedAt: number) => snapshot.generatedAt ?? new Date(legacyCreatedAt).toISOString();

function legacyProducts(snapshot: GadsReportSnapshot): ReportProductInputV2[] {
  const lossIds = new Set(snapshot.losses.map((product) => product.productId));
  const opportunityIds = new Set(snapshot.opportunities.map((product) => product.productId));
  return (snapshot.reportProducts ?? []).map((product) => ({
    ...product,
    sourceLabel: lossIds.has(product.productId)
      ? "LOSS_MAKER"
      : opportunityIds.has(product.productId)
        ? "UNDERPROMOTED_POTENTIAL"
        : undefined,
  }));
}

function reportViewFromSnapshot(
  snapshot: GadsReportSnapshot,
  legacyCreatedAt: number,
): GoogleAdsReportV2ViewModel {
  if (snapshot.reportV2) {
    return buildGoogleAdsReportV2({
      currencyCode: snapshot.reportV2.currencyCode,
      minimumRoasTarget: snapshot.breakEvenRoas,
      maximumCpaTarget: snapshot.breakEvenCpa,
      periods: snapshot.reportV2.periods,
      products: snapshot.reportV2.products,
      productPopulationStatus: snapshot.reportV2.productPopulationStatus,
    });
  }

  const unavailableDate = reportTimestamp(snapshot, legacyCreatedAt).slice(0, 10);
  const report = buildGoogleAdsReportV2({
    minimumRoasTarget: snapshot.breakEvenRoas,
    maximumCpaTarget: snapshot.breakEvenCpa,
    periods: {
      selected: {
        range: { from: unavailableDate, to: unavailableDate },
        spend: snapshot.current.spend,
        salesVolume: snapshot.current.revenue,
        numberOfSales: snapshot.current.orders,
      },
      previous: null,
      previousYear: null,
    },
    products: legacyProducts(snapshot),
    productPopulationStatus: "PARTIAL",
  });

  return {
    ...report,
    periods: {
      selected: {
        status: "UNAVAILABLE",
        key: "SELECTED",
        reason: "Exact selected-period boundaries are unavailable in this legacy report",
      },
      previous: report.periods.previous,
      previousYear: report.periods.previousYear,
    },
  };
}

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
            label: `Raport generat la ${new Date(reportTimestamp(snapshot, lead.createdAt)).toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}`,
          })),
        }}
      />
    </main>
  );
}
