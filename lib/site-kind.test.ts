import { describe, expect, it } from "vitest";
import { classifySiteKind, SiteKindUnreadable } from "./site-kind";

// Enough readable text that the page counts as read.
const TEXT = "<p>" + "Clinica noastra ofera servicii de imagistica dentara pentru pacienti si medici din toata tara. ".repeat(4) + "</p>";
const page = (extra: string) => `<html><body>${TEXT}${extra}</body></html>`;

describe("classifySiteKind (Darwin's rule, spec 2026-09-25 §1)", () => {
  it("a structural marker decides ecom on its own; two make it high", () => {
    expect(classifySiteKind(page('<a href="/cos/">Cos</a>'))).toMatchObject({ type: "ecom", confidence: "medium" });
    expect(classifySiteKind(page('<a href="/cos/">Cos</a><script type="application/ld+json">{"@type": "Product"}</script>'))).toMatchObject({ type: "ecom", confidence: "high" });
  });

  it("a shop engine plus two weak signals is ecom, low", () => {
    expect(classifySiteKind(page('<link href="https://cdn.shopify.com/x.css"> 40 lei, in stoc <a href="tel:0700">suna</a>'))).toMatchObject({ type: "ecom", confidence: "low" });
  });

  it("two weak signals and nothing asking for contact is ecom, low; with a contact request it is leads", () => {
    expect(classifySiteKind(page("40 lei, in stoc"))).toMatchObject({ type: "ecom", confidence: "low" });
    expect(classifySiteKind(page('40 lei, in stoc <a href="tel:0700">suna</a>'))).toMatchObject({ type: "leads", confidence: "high" });
  });

  it("no shop structure is leads: high with a lead signal, medium without", () => {
    expect(classifySiteKind(page('<a href="/contact/">Contact</a>'))).toMatchObject({ type: "leads", confidence: "high" });
    expect(classifySiteKind(page(""))).toMatchObject({ type: "leads", confidence: "medium" });
  });

  it("dentalview.ro: WooCommerce installed, one price, a booking form and a phone link is leads, high", () => {
    const v = classifySiteKind(page('<link href="/wp-content/plugins/woocommerce/a.css"> Radiografie 40 lei. Fa-ti o programare. <form class="wpcf7-form"><input type="email" name="email"></form> <a href="/contact/">Contact</a> <a href="tel:+40700">Suna</a>'), "https://dentalview.ro/");
    expect(v).toMatchObject({ type: "leads", confidence: "high" });
    expect(v.evidence.ecom.map((s) => s.id)).toEqual(["platform_woocommerce", "price_currency"]);
    expect(v.evidence.leads.map((s) => s.id)).toEqual(["appointment", "contact_form", "contact_route", "call_cta"]);
  });

  it("a page with under 200 readable characters is a defect of the reading, never a kind", () => {
    expect(() => classifySiteKind('<html><body><div id="app"></div><script>' + "x".repeat(5000) + "</script></body></html>")).toThrow(SiteKindUnreadable);
  });
});
