export type ReportEmailResult = { ok: true; messageId: string } | { ok: false; reason: string };

export async function sendReportEmail(input: { to: string; name: string; reportId: string; pdf: Buffer }): Promise<ReportEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.GADS_REPORT_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, reason: "EMAIL_NOT_CONFIGURED" };
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `gads-report-${input.reportId}` },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: "Your Google Ads profitability audit",
        html: `<p>Hello ${input.name.replace(/[<>&"']/g, "")},</p><p>Your Google Ads profitability audit is attached as a PDF.</p><p>Devrika</p>`,
        attachments: [{ filename: `google-ads-audit-${input.reportId}.pdf`, content: input.pdf.toString("base64") }],
      }),
    });
    const body = await response.json().catch(() => ({})) as { id?: string };
    return response.ok && body.id ? { ok: true, messageId: body.id } : { ok: false, reason: `EMAIL_PROVIDER_${response.status}` };
  } catch {
    return { ok: false, reason: "EMAIL_PROVIDER_UNREACHABLE" };
  }
}
