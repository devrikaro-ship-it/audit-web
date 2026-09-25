import { afterEach, describe, expect, it, vi } from "vitest";
import { PROGRESS_STEPS, WORD } from "./copy-registry";

vi.mock("./observations", async (orig) => ({ ...(await orig<typeof import("./observations")>()), appendObservation: vi.fn(async () => {}), readObservations: vi.fn(async () => []) }));
vi.mock("./learning", async (orig) => ({ ...(await orig<typeof import("./learning")>()), readApprovals: vi.fn(async () => []) }));

const ORIGIN = "https://magazin-test.ro";
const products = Array.from({ length: 12 }, (_, i) => `${ORIGIN}/produs/p${i}/`);
const categories = Array.from({ length: 4 }, (_, i) => `${ORIGIN}/categorie-produs/c${i}/`);
const shopPage = (title: string) => `<!doctype html><html lang="ro"><head><title>${title}</title>
  <meta name="description" content="${title} descriere"><meta name="generator" content="WooCommerce 9.0"></head>
  <body class="woocommerce"><h1>${title}</h1><span class="price">120 lei</span><span class="price">90 lei</span>
  <form class="cart"><button name="add-to-cart" class="single_add_to_cart_button">Adauga in cos</button></form>
  <a href="/cos/">Cos</a><a href="/checkout/">Checkout</a></body></html>`;

function site(u: string): Response {
  const path = new URL(u).pathname;
  if (!u.startsWith(ORIGIN)) return new Response("", { status: 500 });
  if (path === "/robots.txt") return new Response(`User-agent: *\nDisallow: /cos/\nSitemap: ${ORIGIN}/sitemap.xml`);
  if (path === "/sitemap.xml") return new Response(`<?xml version="1.0"?><urlset>${[...categories, ...products].map((l) => `<url><loc>${l}</loc></url>`).join("")}</urlset>`, { headers: { "content-type": "application/xml" } });
  if (path === "/llms.txt") return new Response("", { status: 404 });
  return new Response(shopPage(path), { headers: { "content-type": "text/html" } });
}

afterEach(() => vi.unstubAllGlobals());

describe("the waiting screen's steps", () => {
  it("advance in engine order, each ends measured or 'de verificat', and speed that cannot be measured says so", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => site(typeof input === "string" ? input : input instanceof URL ? input.href : input.url)));
    const { runAudit } = await import("./audit-engine");
    const events: { id: string; state: string; result?: string }[] = [];
    const data = await runAudit(ORIGIN, { onStep: (id, state, result) => events.push({ id, state, result }) });

    const startOrder = events.filter((e) => e.state === "running").map((e) => e.id).filter((id, i, a) => a.indexOf(id) === i);
    expect(startOrder).toEqual(PROGRESS_STEPS.map((s) => s.id));
    const last = new Map(events.map((e) => [e.id, e]));
    for (const s of PROGRESS_STEPS) expect(["done", "unmeasured"]).toContain(last.get(s.id)?.state);
    expect(last.get("viteza")).toEqual({ id: "viteza", state: "unmeasured", result: WORD.verify });
    expect(last.get("scor")?.result).toContain(String(data.scor));
    expect(last.get("robots")?.result).toContain("16");
  }, 60000);

  it("a screen that throws never stops the audit", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL | Request) => site(typeof input === "string" ? input : input instanceof URL ? input.href : input.url)));
    const { runAudit } = await import("./audit-engine");
    const data = await runAudit(ORIGIN, { onStep: () => { throw new Error("screen"); } });
    expect(typeof data.scor).toBe("number");
  }, 60000);
});
