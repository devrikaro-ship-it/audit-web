import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReportEmailPayload } from "../../../../lib/gads-report-email.ts";

const previewDirectory = path.dirname(fileURLToPath(import.meta.url));
const pdf = Buffer.from("%PDF-1.4\nsynthetic audit preview\n%%EOF");
const built = buildReportEmailPayload({
  to: "owner@example.com",
  name: `Mara <Owner> & "Co" O'Reilly`,
  reportId: "preview-report-2026-09-08",
  pdf,
  portalPath: "/google-ads/portal/preview-token_2026",
}, {
  from: "Devrika <reports@devrika.ro>",
  publicUrl: "https://audit.devrika.ro",
});

if (!built.ok) throw new Error(`Preview payload was refused: ${built.reason}`);

const previewHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${built.payload.subject} — local preview</title>
  <style>
    body { margin: 0; padding: 40px 20px; background: #f5f7fb; color: #172033; font: 16px/1.55 Arial, sans-serif; }
    main { max-width: 680px; margin: 0 auto; }
    .meta, .email { border: 1px solid #dce3ed; border-radius: 14px; background: #fff; box-shadow: 0 10px 30px rgba(23, 32, 51, .08); }
    .meta { margin-bottom: 18px; padding: 18px 22px; font-size: 14px; }
    .meta p { margin: 4px 0; }
    .email { padding: 28px; }
    a { color: #47499e; font-weight: 700; }
    .notice { color: #58677d; font-size: 13px; }
  </style>
</head>
<body>
  <main>
    <section class="meta" aria-label="Message metadata">
      <p><strong>Local preview — no email was sent</strong></p>
      <p>From: Devrika &lt;reports@devrika.ro&gt;</p>
      <p>To: owner@example.com</p>
      <p>Subject: ${built.payload.subject}</p>
      <p>Attachment: ${built.payload.attachments[0].filename} (${pdf.length} exact synthetic bytes)</p>
    </section>
    <article class="email" aria-label="Exact production email HTML">${built.payload.html}</article>
    <p class="notice">Generated from the same pure payload constructor used by the production transport.</p>
  </main>
</body>
</html>
`;

await Promise.all([
  writeFile(path.join(previewDirectory, "email-preview.html"), previewHtml, "utf8"),
  writeFile(path.join(previewDirectory, "email-preview-payload.json"), `${JSON.stringify({
    transportInvoked: false,
    idempotencyKey: built.idempotencyKey,
    payload: built.payload,
  }, null, 2)}\n`, "utf8"),
]);

console.log(JSON.stringify({
  outcome: "PREVIEW_GENERATED",
  transportInvoked: false,
  html: path.join(previewDirectory, "email-preview.html"),
  payload: path.join(previewDirectory, "email-preview-payload.json"),
}));
