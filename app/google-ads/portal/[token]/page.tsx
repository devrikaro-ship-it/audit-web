import {
  PortalReport,
  type PortalSearchParams,
} from "../portal-report";
import { publicOAuthAttributes } from "@/lib/gads-public-oauth-contract";

export const dynamic = "force-dynamic";

export default async function ClientReportPortal({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: PortalSearchParams;
}) {
  const { token } = await params;
  return PortalReport({
    token,
    presentation: "classic",
    portalPath: `/google-ads/portal/${encodeURIComponent(token)}`,
    searchParams,
    surfaceAttributes: publicOAuthAttributes("client-portal"),
  });
}
