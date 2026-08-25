import { afterEach, describe, expect, it, vi } from "vitest";
import { sendReportEmail } from "./gads-report-email";

describe("Google Ads report email delivery", () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY;
    delete process.env.GADS_REPORT_FROM_EMAIL;
    vi.unstubAllGlobals();
  });

  it("reports missing configuration without calling an external provider", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    await expect(sendReportEmail({ to: "owner@example.com", name: "Owner", reportId: "r1", pdf: Buffer.from("pdf") })).resolves.toEqual({ ok: false, reason: "EMAIL_NOT_CONFIGURED" });
    expect(request).not.toHaveBeenCalled();
  });

  it("sends a base64 PDF attachment with an idempotency key", async () => {
    process.env.RESEND_API_KEY = "resend-key";
    process.env.GADS_REPORT_FROM_EMAIL = "Devrika <reports@devrika.ro>";
    const request = vi.fn(async () => new Response(JSON.stringify({ id: "message-1" }), { status: 200 }));
    vi.stubGlobal("fetch", request);
    await expect(sendReportEmail({ to: "owner@example.com", name: "Owner", reportId: "r1", pdf: Buffer.from("pdf") })).resolves.toEqual({ ok: true, messageId: "message-1" });
    const [, options] = request.mock.calls[0];
    expect(options.headers["Idempotency-Key"]).toBe("gads-report-r1");
    expect(JSON.parse(options.body).attachments[0]).toMatchObject({ filename: "google-ads-audit-r1.pdf", content: Buffer.from("pdf").toString("base64") });
  });
});
