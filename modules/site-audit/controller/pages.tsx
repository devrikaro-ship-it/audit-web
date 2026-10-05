// The site-audit pages: each address shows its view. The funnel, waiting screen and report read their data in the
// browser through the audit API (controller/audit-api.ts).
import { Landing } from "@/modules/site-audit/view/landing";
import { Funnel } from "@/modules/site-audit/view/funnel";
import { Processing } from "@/modules/site-audit/view/processing";
import { ReportPage } from "@/modules/site-audit/view/report-page";
import { ReportPreview } from "@/modules/site-audit/view/report-preview";

export const showLanding = () => <Landing />;
export const showFunnel = () => <Funnel />;
export const showProcessing = () => <Processing />;
export const showReport = () => <ReportPage />;
export const showReportPreview = () => <ReportPreview />;
