import { describe, it, expect } from "vitest";
import {
  parseGenerators, findGenerator, parsePlugins, countAssets,
  parseCheckoutSignals, fingerprintStack, buildFindings,
} from "./platform-audit";
import type { FieldVitals, LabVitals } from "./net";

const WOO_HTML = `
  <meta name="generator" content="WordPress 7.0.2">
  <meta name="generator" content="WooCommerce 10.7.0">
  <meta name="generator" content="Site Kit by Google 1.181.0">
  <link rel="stylesheet" href="/wp-content/plugins/revslider/css/a.css?ver=6.7">
  <script src="/wp-content/plugins/pixelyoursite-pro/js/b.js"></script>
  <script src="/wp-content/plugins/woocommerce/assets/c.js"></script>
  <script src="/wp-content/themes/x/d.js"></script>
`;

const field = (o: Partial<FieldVitals> = {}): FieldVitals => ({
  lcpMs: null, ttfbMs: null, fcpMs: null, inpMs: null, cls: null, overall: null, hasData: true, ...o,
});
const lab = (o: Partial<LabVitals> = {}): LabVitals => ({
  perfScore: null, lcpMs: null, ttiMs: null, tbtMs: null, weightKb: null, unusedJsKb: null, ...o,
});

describe("platform-audit — parsere", () => {
  it("parseGenerators + findGenerator: separa numele de versiune", () => {
    const gens = parseGenerators(WOO_HTML);
    expect(gens).toHaveLength(3);
    expect(findGenerator(gens, /^wordpress/i)).toEqual({ name: "WordPress", version: "7.0.2" });
    expect(findGenerator(gens, /^woocommerce/i)).toEqual({ name: "WooCommerce", version: "10.7.0" });
    expect(findGenerator(gens, /^shopify/i)).toBeNull();
  });

  it("parsePlugins: slug-uri unice, sortate, fara tema", () => {
    expect(parsePlugins(WOO_HTML)).toEqual(["pixelyoursite-pro", "revslider", "woocommerce"]);
  });

  it("countAssets: numara doar scripturile cu src si stylesheet-urile", () => {
    expect(countAssets(WOO_HTML)).toEqual({ scripts: 3, stylesheets: 1 });
  });

  it("parseCheckoutSignals: raporteaza doar ce e prezent in HTML", () => {
    const c = parseCheckoutSignals(`<div>Apple Pay</div><script src="js.stripe.com/v3"></script>plata in rate`);
    expect(c.walletsSeen).toContain("Apple Pay");
    expect(c.paymentsSeen).toContain("Stripe");
    expect(c.installments).toBe(true);
    expect(c.expressCheckout).toBe(false);
  });

  it("fingerprintStack: identifica platforma + versiunile + numara extensiile", () => {
    const s = fingerprintStack(WOO_HTML);
    expect(s.platform).toBe("WooCommerce");
    expect(s.cms?.version).toBe("7.0.2");
    expect(s.ecomEngine?.version).toBe("10.7.0");
    expect(s.pluginCount).toBe(3);
  });
});

describe("platform-audit — constatari", () => {
  const stack = fingerprintStack(WOO_HTML);
  const checkout = parseCheckoutSignals(WOO_HTML);

  it("INVARIANT: plata rapida neconfirmata iese 'necunoscut', NICIODATA lipsa", () => {
    const f = buildFindings(stack, checkout, field(), lab()).find((x) => x.id === "checkout")!;
    expect(f.verdict).toBe("necunoscut");
    expect(f.measured).not.toMatch(/lipsa|nu are|absent/i);
  });

  it("TTFB in banda de mijloc (cazul real robinetulmeu, 1503 ms) = atentie, nu critic", () => {
    // Pragurile Google: bun <=800 ms, de reglat 800-1800, slab >1800. Nu exageram
    // verdictul ca sa iasa cazul de migrare mai frumos.
    const f = buildFindings(stack, checkout, field({ ttfbMs: 1503 }), lab()).find((x) => x.id === "ttfb")!;
    expect(f.verdict).toBe("atentie");
    expect(f.structural).toBe(true);
    expect(f.measured).toContain("1503");
  });

  it("TTFB peste 1800 ms = critic", () => {
    const f = buildFindings(stack, checkout, field({ ttfbMs: 2400 }), lab()).find((x) => x.id === "ttfb")!;
    expect(f.verdict).toBe("critic");
    expect(f.structural).toBe(true);
  });

  it("TTFB bun = ok si NU se pune pe seama platformei", () => {
    const f = buildFindings(stack, checkout, field({ ttfbMs: 300 }), lab()).find((x) => x.id === "ttfb")!;
    expect(f.verdict).toBe("ok");
    expect(f.structural).toBe(false);
  });

  it("ONESTITATE: LCP slab NU e marcat structural (se poate repara si pe stackul actual)", () => {
    const f = buildFindings(stack, checkout, field({ lcpMs: 5200 }), lab()).find((x) => x.id === "lcp")!;
    expect(f.verdict).toBe("critic");
    expect(f.structural).toBe(false);
  });

  it("fara date CrUX: 'necunoscut', nu se inventeaza cifre", () => {
    const f = buildFindings(stack, checkout, null, lab()).find((x) => x.id === "ttfb")!;
    expect(f.verdict).toBe("necunoscut");
    expect(f.structural).toBe(false);
  });

  it("extensiile se raporteaza ca minim garantat, nu ca total", () => {
    const f = buildFindings(stack, checkout, field(), lab()).find((x) => x.id === "pluginuri")!;
    expect(f.measured).toMatch(/cel putin/);
  });
});
