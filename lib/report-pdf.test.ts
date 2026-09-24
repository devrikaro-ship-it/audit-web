import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findChrome } from "./find-chrome";
import { printReportPdf } from "./report-pdf";

// A page like the report: its slides appear only after a client-side delay, and its font answers slowly.
const html = `<!doctype html><html><head><style>
@font-face{font-family:'Barlow';font-weight:400;src:url(/slow-font.woff2) format('woff2')}
@page{size:600px 400px;margin:0} body{margin:0;font-family:'Barlow',Arial,sans-serif}
</style></head><body><div id="root"></div><script>
setTimeout(() => { document.getElementById("root").innerHTML = '<div class="deck"><section class="slide">Raport de audit pentru magazin</section></div>'; }, 800);
</script></body></html>`;
const font = readFileSync("public/fonts/barlow-400.woff2");

let server: Server;
let base = "";
beforeAll(async () => {
  server = createServer((req, res) => {
    if (req.url === "/slow-font.woff2") { setTimeout(() => { res.writeHead(200, { "Content-Type": "font/woff2" }); res.end(font); }, 2500); return; }
    res.writeHead(200, { "Content-Type": "text/html" }); res.end(html);
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((ok) => server.close(() => ok())));

const chrome = findChrome();
describe.skipIf(!chrome)("printReportPdf", () => {
  it("prints the late slides in the slow web font, not a fallback", async () => {
    const pdf = (await printReportPdf(chrome as string, `${base}/r/x?print=1`)).toString("latin1");
    const fonts = [...pdf.matchAll(/\/BaseFont\s*\/([A-Za-z0-9+_-]+)/g)].map((m) => m[1].split("+").pop());
    expect(fonts).toContain("Barlow-Regular");
  }, 60000);
});
