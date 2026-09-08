import { afterEach, describe, expect, it, vi } from "vitest";
import { buildReportEmailPayload, sendReportEmail } from "./gads-report-email";

describe("Google Ads report email delivery", () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.GADS_REPORT_FROM_EMAIL;
    delete process.env.PUBLIC_URL;
    vi.unstubAllGlobals();
  });

  it("reports missing configuration without calling an external provider", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(sendReportEmail({ to: "owner@example.com", name: "Owner", reportId: "r1", pdf: Buffer.from("pdf") })).resolves.toEqual({ ok: false, reason: "EMAIL_NOT_CONFIGURED" });
    expect(request).not.toHaveBeenCalled();
  });

  it("builds the exact English payload with an escaped visible name, portal link, and PDF", () => {
    const pdf = Buffer.from("%PDF-1.4\nsynthetic audit\n%%EOF");
    const result = buildReportEmailPayload({
      to: "owner@example.com",
      name: `Mara <Owner> & "Co" O'Reilly`,
      reportId: "r1",
      pdf,
      portalPath: "/google-ads/portal/secure-token",
    }, {
      from: "Devrika <reports@devrika.ro>",
      publicUrl: "https://audit.devrika.ro",
    });

    expect(result).toEqual({
      ok: true,
      idempotencyKey: "gads-report-r1",
      payload: {
        from: "Devrika <reports@devrika.ro>",
        to: ["owner@example.com"],
        subject: "Your Google Ads profitability audit",
        html: `<p>Hello Mara &lt;Owner&gt; &amp; &quot;Co&quot; O&#39;Reilly,</p><p>Your Google Ads profitability audit is attached as a PDF.</p><p><a href="https://audit.devrika.ro/google-ads/portal/secure-token">Open your live dashboard</a></p><p>Devrika</p>`,
        attachments: [{ filename: "google-ads-audit-r1.pdf", content: pdf.toString("base64") }],
      },
    });
  });

  it("sends the constructed payload with an idempotency key", async () => {
    process.env.RESEND_API_KEY = "resend-key";
    process.env.GADS_REPORT_FROM_EMAIL = "Devrika <reports@devrika.ro>";
    process.env.PUBLIC_URL = "https://audit.devrika.ro";
    const request = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ id: "message-1" }), { status: 200 }));
    vi.stubGlobal("fetch", request);
    await expect(sendReportEmail({ to: "owner@example.com", name: "Owner", reportId: "r1", pdf: Buffer.from("pdf"), portalPath: "/google-ads/portal/secure-token" })).resolves.toEqual({ ok: true, messageId: "message-1" });
    const [, options] = request.mock.calls[0];
    expect(options).toBeDefined();
    if (!options || typeof options.body !== "string") throw new Error("Expected a JSON request body");
    expect(new Headers(options.headers).get("Idempotency-Key")).toBe("gads-report-r1");
    const body = JSON.parse(options.body) as { attachments: Array<{ filename: string; content: string }>; html: string };
    expect(body.attachments[0]).toMatchObject({ filename: "google-ads-audit-r1.pdf", content: Buffer.from("pdf").toString("base64") });
    expect(body.html).toContain('href="https://audit.devrika.ro/google-ads/portal/secure-token"');
  });

  it("refuses an external portal URL before contacting the email provider", async () => {
    process.env.RESEND_API_KEY = "resend-key";
    process.env.GADS_REPORT_FROM_EMAIL = "Devrika <reports@devrika.ro>";
    process.env.PUBLIC_URL = "https://audit.devrika.ro";
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(sendReportEmail({ to: "owner@example.com", name: "Owner", reportId: "r1", pdf: Buffer.from("pdf"), portalPath: "https://example.com/steal" })).resolves.toEqual({ ok: false, reason: "INVALID_PORTAL_PATH" });
    expect(request).not.toHaveBeenCalled();
  });
});
