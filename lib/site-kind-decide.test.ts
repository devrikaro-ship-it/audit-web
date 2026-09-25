import { describe, expect, it } from "vitest";
import { decideSiteKind } from "./audit-engine";

const TEXT = "<p>" + "Clinica ofera radiografii dentare pentru pacienti si medici, cu rezultate in aceeasi zi. ".repeat(4) + "</p>";
const clinic = `<html><body>${TEXT}<a href="tel:+40700">Suna</a></body></html>`;

describe("decideSiteKind: the scan decides, a visitor's choice wins", () => {
  it("without a choice the scan's verdict is the audit's, with its evidence", () => {
    expect(decideSiteKind(clinic, "https://clinica.ro/")).toMatchObject({ type: "leads", by: "scan", confidence: "high", evidence: { leads: [{ id: "call_cta" }] } });
  });

  it("the visitor's choice wins and the scan's verdict stays as evidence", () => {
    expect(decideSiteKind(clinic, "https://clinica.ro/", "ecom")).toMatchObject({ type: "ecom", by: "visitor", confidence: "high", evidence: { leads: [{ id: "call_cta" }] } });
  });

  it("an unreadable home page gives no scan verdict: only a visitor's choice decides", () => {
    expect(decideSiteKind("<div id=app></div>", "https://x.ro/")).toBeNull();
    expect(decideSiteKind("<div id=app></div>", "https://x.ro/", "leads")).toEqual({ type: "leads", by: "visitor", confidence: null, evidence: null });
  });
});
