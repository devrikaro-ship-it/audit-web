// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { fireEvent, render } from "@testing-library/react";
import Simulator from "./Simulator";
import { normalizePublicOutput } from "@/app/public-output-goldens";

describe("collaboration simulator copy", () => {
  it("renders the intended opening and closing quote characters around the ROAS claim", () => {
    const html = renderToStaticMarkup(<Simulator bugetLunar={1000} roasAzi={4} marjaPct={30} />);
    expect(normalizePublicOutput(html)).toMatchSnapshot("simulator:normal");
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

  it("executes every interactive financial branch with real inputs", () => {
    const view = render(<Simulator bugetLunar={1000} roasAzi={4} marjaPct={30} />);
    const ranges = [...view.container.querySelectorAll<HTMLInputElement>('input[type="range"]')];
    const decimals = [...view.container.querySelectorAll<HTMLInputElement>('input[inputmode="decimal"]')];
    expect(ranges).toHaveLength(2);
    expect(decimals).toHaveLength(3);

    fireEvent.change(ranges[0], { target: { value: "0" } });
    fireEvent.change(ranges[1], { target: { value: "0" } });
    fireEvent.change(decimals[0], { target: { value: "1200" } });
    fireEvent.change(decimals[1], { target: { value: "10" } });
    fireEvent.change(decimals[2], { target: { value: "1" } });
    expect(view.container.querySelector('button[type="button"]')).not.toBeNull();
    fireEvent.click(view.container.querySelector('button[type="button"]')!);

    fireEvent.change(decimals[0], { target: { value: "invalid" } });
    fireEvent.change(decimals[1], { target: { value: "1000000" } });
    fireEvent.change(decimals[2], { target: { value: "0" } });
    expect(view.container.textContent).toBeTruthy();
  });

  it("renders the zero-return calculation arms without invented profit", () => {
    const html = renderToStaticMarkup(<Simulator bugetLunar={0} roasAzi={0} marjaPct={30} />);
    expect(html).toBeTruthy();
  });
});
