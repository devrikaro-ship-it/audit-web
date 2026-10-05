import { notFound } from "next/navigation";
import { listPortalReports } from "@/modules/google-ads/model/data/leads";
import { openReportSnapshot, type GadsReportSnapshot } from "@/modules/google-ads/model/data/report-delivery";
import { readStoredReportSnapshot } from "@/modules/google-ads/model/data/report-snapshot";
import { buildGoogleAdsReportV2, type GoogleAdsReportV2ViewModel, type ReportProductInputV2 } from "@/modules/google-ads/model/report-metrics";
import { isValidElement, type ReactElement } from "react";
import { PortalView } from "@/modules/google-ads/view/portal";

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
export const reportTimestamp = (snapshot: GadsReportSnapshot, legacyCreatedAt: number) => snapshot.generatedAt ?? new Date(legacyCreatedAt).toISOString();
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

export async function loadPortal({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ report?: string }> }) {
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
  return { token, reports, selected, report };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type PortalProps = Exclude<Awaited<ReturnType<typeof loadPortal>>, ReactElement>;

export async function showPortal(props: Parameters<typeof loadPortal>[0]) {
  const loaded = await loadPortal(props);
  return isValidElement(loaded) ? loaded : <PortalView {...(loaded as PortalProps)} />;
}
