// Screenshots of one page per type for the AI evaluation of structure, design and content (spec 2026-09-26 §4):
// the phone first screen, and the desktop page in up to three tiles so every section is visible at a readable size.
// popup: a window that covered part of the page (a newsletter, a wheel of fortune), cookie consent excepted.
export type PageShots = { url: string; phoneTop: Buffer; desktopTiles: Buffer[]; text: string; popup: boolean };

export const RENDER = {
  phone: { width: 390, height: 844, scale: 2 },
  desktop: { width: 1440, height: 900 },
  tileHeight: 1800,      // desktop px per tile; the API scales images to about 1568 px on the long edge
  maxTiles: 3,
  textChars: 8000,       // readable text sent with the screenshots
  settleMs: 3000,        // after the page is parsed: third-party scripts can hold "load" back for long; this lets the
                         // first screen, sliders and images settle
} as const;

// A cookie banner covers the page a visitor sees after consenting: accept it, or hide it when no button is found.
const CONSENT = String.raw`accept|permite toate|permite|sunt de acord|de acord|am inteles|ok|allow all|agree|inchide`;
async function clearConsent(page: import("playwright-core").Page): Promise<void> {
  await page.evaluate((words: string) => {
    const said = new RegExp(`^\s*(${words})\b`, "i");
    const banners = [...document.querySelectorAll<HTMLElement>("body *")].filter((el) => {
      const st = getComputedStyle(el);
      return (st.position === "fixed" || st.position === "sticky" || st.position === "absolute") && /cookie|gdpr|consim|confidential/i.test(el.innerText ?? "") && el.getBoundingClientRect().height > 40;
    });
    for (const b of banners) {
      const button = [...b.querySelectorAll<HTMLElement>("button, a, [role=button], input[type=button], input[type=submit]")].find((x) => said.test(x.innerText || (x as HTMLInputElement).value || ""));
      if (button) button.click(); else b.style.setProperty("display", "none", "important");
    }
  }, CONSENT).catch(() => {});
  await page.waitForTimeout(600);
}

// Layers fixed over the page: the header and a bottom bar stay; a layer covering a fifth of the screen or more is an
// overlay. Empty ones (a dark backdrop) are always hidden; ones with text (a newsletter window) only when asked, and
// their presence is reported.
async function hideOverlays(page: import("playwright-core").Page, withText: boolean): Promise<boolean> {
  return page.evaluate((all: boolean) => {
    const vw = window.innerWidth, vh = window.innerHeight;
    let found = false;
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      const st = getComputedStyle(el);
      if (st.position !== "fixed" || st.display === "none" || st.visibility === "hidden" || Number(st.opacity) === 0) continue;
      // Only the part on screen counts: an off-canvas menu parked beside the page (dentalview.ro) covers nothing.
      const r = el.getBoundingClientRect();
      const visible = Math.max(0, Math.min(r.right, vw) - Math.max(r.left, 0)) * Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      if (visible < vw * vh * 0.2) continue;
      if (r.top <= 0 && r.height < 240) continue;
      const text = (el.innerText ?? "").trim();
      if (text.length < 20) { el.style.setProperty("display", "none", "important"); continue; }
      found = true;
      if (all) el.style.setProperty("display", "none", "important");
    }
    return found;
  }, withText).catch(() => false);
}

const PHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

// Every page is rendered in its own context, one after the other, in one browser. A page that fails yields null and
// its evaluated rows become "de verificat".
export async function renderPages(chromePath: string, urls: string[], timeoutMs = 30000): Promise<(PageShots | null)[]> {
  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] });
  try {
    const out: (PageShots | null)[] = [];
    for (const url of urls) {
      try {
        const phone = await browser.newContext({ viewport: { width: RENDER.phone.width, height: RENDER.phone.height }, deviceScaleFactor: RENDER.phone.scale, isMobile: true, hasTouch: true, userAgent: PHONE_UA });
        const p = await phone.newPage();
        await p.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
        await p.waitForTimeout(RENDER.settleMs);
        await clearConsent(p);
        const popupOnPhone = await hideOverlays(p, false);
        const phoneTop = await p.screenshot({ type: "jpeg", quality: 70 });
        await phone.close();

        // The desktop page is photographed one tile at a time, scrolled into view, so lazy images and reveal
        // animations have run, as they have for a visitor.
        const desktop = await browser.newContext({ viewport: { width: RENDER.desktop.width, height: RENDER.tileHeight } });
        const d = await desktop.newPage();
        await d.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
        await d.waitForTimeout(RENDER.settleMs);
        await clearConsent(d);
        const height = Math.min(await d.evaluate(() => document.documentElement.scrollHeight), RENDER.tileHeight * RENDER.maxTiles);
        const desktopTiles: Buffer[] = [];
        let popupOnDesktop = false;
        for (let y = 0; y < height && desktopTiles.length < RENDER.maxTiles; y += RENDER.tileHeight) {
          // The page stops scrolling at its end: the last tile is cut from where the window really is, read after the
          // wait (a page with smooth scrolling is still moving right after the call; magazinfitness.ro, 2026-09-26).
          await d.evaluate((top: number) => window.scrollTo({ top, behavior: "instant" }), y);
          await d.waitForTimeout(1200);
          if (await hideOverlays(d, true)) popupOnDesktop = true;
          const at = await d.evaluate(() => window.scrollY);
          const h = Math.min(RENDER.tileHeight, height - y);
          const top = Math.max(0, Math.min(y - at, RENDER.tileHeight - h));
          desktopTiles.push(await d.screenshot({ type: "jpeg", quality: 70, clip: { x: 0, y: top, width: RENDER.desktop.width, height: h } }));
        }
        const text = (await d.evaluate(() => document.body.innerText)).replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").slice(0, RENDER.textChars);
        await desktop.close();
        out.push({ url, phoneTop, desktopTiles, text, popup: popupOnPhone || popupOnDesktop });
      } catch {
        out.push(null);
      }
    }
    return out;
  } finally {
    await browser.close();
  }
}
