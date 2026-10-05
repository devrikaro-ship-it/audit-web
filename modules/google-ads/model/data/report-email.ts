export type ReportEmailResult = { ok: true; messageId: string } | { ok: false; reason: string };

export type ReportEmailInput = {
  to: string;
  name: string;
  reportId: string;
  pdf: Buffer;
  portalPath?: string;
};

export type ReportEmailPayload = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments: Array<{ filename: string; content: string }>;
};

export type ReportEmailPayloadResult =
  | { ok: true; idempotencyKey: string; payload: ReportEmailPayload }
  | { ok: false; reason: "EMAIL_NOT_CONFIGURED" | "INVALID_PORTAL_PATH" };

type ReportEmailConfiguration = {
  from?: string;
  publicUrl?: string;
  redirectUri?: string;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function dashboardUrl(portalPath: string, configuredOrigin: string | undefined): string | null {
  if (!/^\/google-ads\/portal\/[A-Za-z0-9_-]+$/.test(portalPath)) return null;
  if (!configuredOrigin) return null;
  try {
    const configuredUrl = new URL(configuredOrigin);
    if (configuredUrl.protocol !== "https:" && configuredUrl.protocol !== "http:") return null;
    return new URL(portalPath, configuredUrl.origin).toString();
  } catch {
    return null;
  }
}

export function buildReportEmailPayload(
  input: ReportEmailInput,
  configuration: ReportEmailConfiguration,
): ReportEmailPayloadResult {
  const from = configuration.from?.trim();
  if (!from) return { ok: false, reason: "EMAIL_NOT_CONFIGURED" };
  const portalUrl = input.portalPath
    ? dashboardUrl(input.portalPath, configuration.publicUrl || configuration.redirectUri)
    : null;
  if (input.portalPath && !portalUrl) return { ok: false, reason: "INVALID_PORTAL_PATH" };

  return {
    ok: true,
    idempotencyKey: `gads-report-${input.reportId}`,
    payload: {
      from,
      to: [input.to],
      subject: "Your Google Ads profitability audit",
      html: `<p>Hello ${escapeHtml(input.name)},</p><p>Your Google Ads profitability audit is attached as a PDF.</p>${portalUrl ? `<p><a href="${escapeHtml(portalUrl)}">Open your live dashboard</a></p>` : ""}<p>Devrika</p>`,
      attachments: [{
        filename: `google-ads-audit-${input.reportId}.pdf`,
        content: input.pdf.toString("base64"),
      }],
    },
  };
}

export async function sendReportEmail(input: ReportEmailInput): Promise<ReportEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, reason: "EMAIL_NOT_CONFIGURED" };
  const built = buildReportEmailPayload(input, {
    from: process.env.GADS_REPORT_FROM_EMAIL,
    publicUrl: process.env.PUBLIC_URL,
    redirectUri: process.env.GADS_REDIRECT_URI,
  });
  if (!built.ok) return built;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": built.idempotencyKey },
      body: JSON.stringify(built.payload),
    });
    const body = await response.json().catch(() => ({})) as { id?: string };
    return response.ok && body.id ? { ok: true, messageId: body.id } : { ok: false, reason: `EMAIL_PROVIDER_${response.status}` };
  } catch {
    return { ok: false, reason: "EMAIL_PROVIDER_UNREACHABLE" };
  }
}
