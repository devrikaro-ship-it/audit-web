import {
  PortalReport,
  type PortalSearchParams,
} from "../portal-report";

export const dynamic = "force-dynamic";

const FITNESS_V2_PORTAL_TOKEN = "local-fitness-review-v2";
const FITNESS_PORTAL_TOKEN = "local-fitness-review";
const FITNESS_V2_PORTAL_PATH = "/google-ads/portal/local-fitness-review-v2";

export default async function LocalFitnessReportPortalV2({
  searchParams,
}: {
  searchParams: PortalSearchParams;
}) {
  return PortalReport({
    token: FITNESS_V2_PORTAL_TOKEN,
    presentation: "classic",
    portalPath: FITNESS_V2_PORTAL_PATH,
    searchParams,
    fallback: {
      token: FITNESS_PORTAL_TOKEN,
      presentation: "sidebar",
      portalPath: FITNESS_V2_PORTAL_PATH,
    },
  });
}
