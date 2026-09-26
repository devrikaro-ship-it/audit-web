import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { findChrome } from "./find-chrome";
import { RENDER, renderPages } from "./page-render";

// A tall page with named sections, like a real home page.
const sections = ["Hero cu beneficiul", "Categorii principale", "Produse populare", "Recenzii clienti", "Subsol cu contact"];
const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"];
const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>body{margin:0;font-family:Arial}section{height:800px;box-sizing:border-box}h2{margin:0}</style></head><body>${sections.map((s, i) => `<section style="background:${colors[i]}"><h2>${s}</h2></section>`).join("")}</body></html>`;

// The same page with a newsletter window over a dark backdrop, opening half a second after load, and a cookie banner.
const popup = html.replace("</body>", `<div id="cookie" style="position:fixed;bottom:0;left:0;right:0;height:300px;background:#fff">Folosim cookie-uri. <button onclick="this.parentNode.remove()">Accept</button></div><script>setTimeout(()=>{document.body.insertAdjacentHTML("beforeend",'<div style="position:fixed;inset:0;background:rgba(0,0,0,.6)"></div><div style="position:fixed;top:20%;left:10%;width:80%;height:60%;background:#00ffff">Inscrie-te la newsletter si primesti 10% reducere la prima comanda</div>')},500)</script></body>`);

// A cookie banner and an off-canvas menu parked left of the screen: neither is a window over the page.
const cookieOnly = html.replace("</body>", `<div style="position:fixed;bottom:0;left:0;right:0;height:300px;background:#fff">Folosim cookie-uri pentru a imbunatati experienta. <button onclick="this.parentNode.remove()">Accept</button></div><div style="position:fixed;top:0;left:-100%;width:100%;height:100%;background:#333">Servicii Locatii Preturi Despre noi Contact Programari</div></body>`);

let server: Server;
let base = "";
beforeAll(async () => {
  server = createServer((req, res) => { res.writeHead(200, { "Content-Type": "text/html" }); res.end(req.url === "/popup" ? popup : req.url === "/cookie" ? cookieOnly : html); });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((ok) => server.close(() => ok())));

// Width and height from a JPEG's start-of-frame marker.
function jpegSize(b: Buffer): { w: number; h: number } {
  let i = 2;
  while (i < b.length) {
    const marker = b[i + 1], len = b.readUInt16BE(i + 2);
    if (marker >= 0xc0 && marker <= 0xc2) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return { w: 0, h: 0 };
}

const chrome = findChrome();
describe.skipIf(!chrome)("renderPages", () => {
  it("gives the phone first screen, the desktop page in tiles and the page text; a dead page gives null", async () => {
    const [shots, dead] = await renderPages(chrome as string, [base + "/", "http://127.0.0.1:1/"], 8000);
    expect(shots).not.toBeNull();
    expect(jpegSize(shots!.phoneTop)).toEqual({ w: RENDER.phone.width * RENDER.phone.scale, h: RENDER.phone.height * RENDER.phone.scale });
    // 5 sections x 800 px = 4000 px: tiles of 1800, 1800 and 400 px.
    expect(shots!.desktopTiles.map(jpegSize)).toEqual([{ w: 1440, h: 1800 }, { w: 1440, h: 1800 }, { w: 1440, h: 400 }]);
    for (const s of sections) expect(shots!.text).toContain(s);
    // The last tile (3600-4000 px) is the last section, magenta: a tile cut from the wrong place shows another colour.
    const { chromium } = await import("playwright-core");
    const b = await chromium.launch({ executablePath: chrome as string, headless: true });
    const page = await b.newPage();
    const last = shots!.desktopTiles[2].toString("base64");
    const rgb = await page.evaluate(async (src: string) => {
      const img = new Image(); img.src = `data:image/jpeg;base64,${src}`; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0);
      return [...ctx.getImageData(Math.floor(img.width * 0.75), Math.floor(img.height / 2), 1, 1).data].slice(0, 3);
    }, last);
    await b.close();
    expect(rgb[0]).toBeGreaterThan(200); expect(rgb[1]).toBeLessThan(60); expect(rgb[2]).toBeGreaterThan(200);
    expect(dead).toBeNull();
    expect(shots!.popup).toBe(false);
    const [cookie] = await renderPages(chrome as string, [base + "/cookie"], 8000);
    expect(cookie!.popup).toBe(false);
  }, 120000);

  it("reports a window over the page, keeps it out of the desktop tiles, and does not count cookie consent", async () => {
    const [shots] = await renderPages(chrome as string, [base + "/popup"], 8000);
    expect(shots!.popup).toBe(true);
    const { chromium } = await import("playwright-core");
    const b = await chromium.launch({ executablePath: chrome as string, headless: true });
    const page = await b.newPage();
    const rgb = await page.evaluate(async (src: string) => {
      const img = new Image(); img.src = `data:image/jpeg;base64,${src}`; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
      const ctx = c.getContext("2d")!; ctx.drawImage(img, 0, 0);
      return [...ctx.getImageData(Math.floor(img.width / 2), 700, 1, 1).data].slice(0, 3);
    }, shots!.desktopTiles[0].toString("base64"));
    await b.close();
    // The first section is red: the cyan window and the dark backdrop are gone from the tile.
    expect(rgb[0]).toBeGreaterThan(200); expect(rgb[1]).toBeLessThan(60); expect(rgb[2]).toBeLessThan(60);
  }, 120000);
});
