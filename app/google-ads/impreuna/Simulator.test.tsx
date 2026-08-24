import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import Simulator from "./Simulator";

describe("collaboration simulator copy", () => {
  it("renders the intended opening and closing quote characters around the ROAS claim", () => {
    const html = renderToStaticMarkup(<Simulator bugetLunar={1000} roasAzi={4} marjaPct={30} />);
    const openingQuote = String.fromCodePoint(0x201e);
    const closingQuote = String.fromCodePoint(0x22);
    const visibleText = html
      .replace(/<[^>]+>/g, " ")
      .replaceAll("&quot;", closingQuote)
      .replaceAll("&amp;", "&")
      .replace(/\s+/g, " ");
    const quotedClaim = visibleText.match(
      new RegExp(`${openingQuote}([^${closingQuote}]+)${closingQuote}`)
    )?.[1];

    expect(quotedClaim).toContain("ROAS");
    expect(visibleText).not.toContain("&quot;");
    expect(visibleText).not.toContain("&#34;");
  });
});
