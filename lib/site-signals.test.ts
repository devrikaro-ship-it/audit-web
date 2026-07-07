import { describe, it, expect } from "vitest";
import { detectPlatform, detectEcom, detectHtmlTracking, detectCurrency } from "./site-signals";

describe("detectPlatform", () => {
  it("recunoaste Shopify inaintea WordPress", () => {
    expect(detectPlatform('<script src="https://cdn.shopify.com/x.js">')).toBe("Shopify");
  });
  it("WooCommerce (nu WordPress) cand exista markeri woo", () => {
    expect(detectPlatform('<link href="/wp-content/plugins/woocommerce/style.css">')).toBe("WooCommerce");
  });
  it("WordPress generic cand nu e woo", () => {
    expect(detectPlatform('<link href="/wp-content/themes/x/style.css">')).toBe("WordPress");
  });
  it("null cand nu recunoaste nimic", () => {
    expect(detectPlatform("<html><body>salut</body></html>")).toBeNull();
  });
  it("case-insensitive (functioneaza si pe corpus lowercased)", () => {
    expect(detectPlatform('cdn.shopify.com')).toBe("Shopify");
    expect(detectPlatform('shopify.theme')).toBe("Shopify");
  });
});

describe("detectEcom", () => {
  it("true pentru platforma ecom", () => {
    expect(detectEcom('cdn.shopify.com')).toBe(true);
    expect(detectEcom('woocommerce')).toBe(true);
  });
  it("true pe semnale de cos chiar fara platforma", () => {
    expect(detectEcom('<button>Adauga in cos</button>')).toBe(true);
    expect(detectEcom('<a href="/checkout">')).toBe(true);
  });
  it("false pentru site de prezentare", () => {
    expect(detectEcom('<div class="wp-content">blog despre noi</div>', "WordPress")).toBe(false);
  });
});

describe("detectHtmlTracking", () => {
  it("prinde GTM in ambele forme (url + GTM-ID + datalayer)", () => {
    expect(detectHtmlTracking('googletagmanager.com/gtm.js').gtm).toBe(true);
    expect(detectHtmlTracking('GTM-ABCD12').gtm).toBe(true);
    expect(detectHtmlTracking('dataLayer.push({})').gtm).toBe(true);
  });
  it("GA4, Meta Pixel, TikTok", () => {
    expect(detectHtmlTracking('gtag/js?id=G-ABC123').ga4).toBe(true);
    expect(detectHtmlTracking('connect.facebook.net/en_US/fbevents.js').metaPixel).toBe(true);
    expect(detectHtmlTracking('fbq("init", "1")').metaPixel).toBe(true);
    expect(detectHtmlTracking('analytics.tiktok.com').tiktok).toBe(true);
  });
  it("totul false pe HTML gol", () => {
    expect(detectHtmlTracking("<html></html>")).toEqual({ gtm: false, ga4: false, metaPixel: false, tiktok: false });
  });
});

describe("detectCurrency", () => {
  it("cod ISO explicit din schema/config", () => {
    expect(detectCurrency('"priceCurrency":"EUR"')).toBe("EUR");
    expect(detectCurrency('"currency_code":"gbp"')).toBe("GBP");
  });
  it("normalizeaza LEI (simbol WooCommerce RO) la RON", () => {
    expect(detectCurrency('data-currency="lei"')).toBe("RON");
    expect(detectCurrency('"currency":"LEI"')).toBe("RON");
  });
  it("fallback pe text si TLD", () => {
    expect(detectCurrency("Pret: 199 lei")).toBe("RON");
    expect(detectCurrency("<html></html>", "shop.de")).toBe("EUR");
    expect(detectCurrency("<html></html>", "magazin.ro")).toBe("RON");
  });
  it("nu prinde 'currency' din interiorul altui cuvant (concurrency)", () => {
    expect(detectCurrency('{"concurrency":"low"}')).toBeNull();
    expect(detectCurrency('maxConcurrency="off"')).toBeNull();
  });
  it("null cand nu se poate deduce", () => {
    expect(detectCurrency("<html></html>", "shop.com")).toBeNull();
  });
});
