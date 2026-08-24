import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CatalogPePerformanta from "./CatalogPePerformanta";
import type { Grupa, Segmentare } from "@/lib/gads-findings";

function group(count: number): Grupa {
  return { count, cost: count, valoare: count, produse: [], produseRestante: 0 };
}

function segment(values: [number, number, number, number, number]): Segmentare {
  return {
    heroes: group(values[0]),
    sidekicks: group(values[1]),
    villains: group(values[2]),
    zombies: group(values[3]),
    zeroZombies: group(values[4]),
    judecabila: true,
  };
}

function renderSegment(segmentare: Segmentare): string {
  return renderToStaticMarkup(
    <CatalogPePerformanta harti={[{ eticheta: "365 days", segmentare }]} />
  );
}

function firstRing(html: string): string {
  return html.match(/<svg[\s\S]*?<\/svg>/)?.[0] ?? "";
}

function circleGeometry(svg: string): { drawn: number; remainder: number; offset: number }[] {
  return [...svg.matchAll(/<circle\b[^>]*>/g)].map(([circle]) => {
    const dash = circle.match(/stroke-dasharray="([^ ]+) ([^"]+)"/);
    const offset = circle.match(/stroke-dashoffset="([^"]+)"/);
    return {
      drawn: Number(dash?.[1]),
      remainder: Number(dash?.[2]),
      offset: Number(offset?.[1]),
    };
  });
}

describe("catalog performance rings", () => {
  it("renders mixed arcs with a two-pixel gap and cumulative raw-length offsets", () => {
    const geometry = circleGeometry(firstRing(renderSegment(segment([1, 2, 3, 4, 5]))));
    const circumference = 2 * Math.PI * 52;
    const values = [1, 2, 3, 4, 5];
    const cumulativeValues = [0, 1, 3, 6, 10];

    expect(geometry).toHaveLength(5);
    geometry.forEach((arc, index) => {
      const expectedDrawn = (values[index] / 15) * circumference - 2;
      expect(arc.drawn).toBeCloseTo(expectedDrawn, 10);
      expect(arc.remainder).toBeCloseTo(circumference - expectedDrawn, 10);
      expect(arc.offset).toBeCloseTo(-(cumulativeValues[index] / 15) * circumference, 10);
    });
  });

  it("renders no circles and a visible fallback when the total is zero", () => {
    const html = renderSegment(segment([0, 0, 0, 0, 0]));
    const fallbacks = [...html.matchAll(/h-\[132px\][^>]*>([^<]+)</g)].map((match) =>
      match[1].trim()
    );

    expect(html).not.toContain("<svg");
    expect(html).not.toContain("<circle");
    expect(fallbacks).toHaveLength(3);
    fallbacks.forEach((fallback) => expect(fallback.length).toBeGreaterThan(0));
  });

  it("renders one full ring arc minus the two-pixel gap", () => {
    const geometry = circleGeometry(firstRing(renderSegment(segment([15, 0, 0, 0, 0]))));
    const circumference = 2 * Math.PI * 52;

    expect(geometry).toHaveLength(1);
    expect(geometry[0].drawn).toBeCloseTo(circumference - 2, 10);
    expect(geometry[0].remainder).toBeCloseTo(2, 10);
    expect(geometry[0].offset).toBe(0);
  });

  it("omits a sub-gap arc but advances the next offset by its full raw length", () => {
    const geometry = circleGeometry(firstRing(renderSegment(segment([0.01, 99.99, 0, 0, 0]))));
    const circumference = 2 * Math.PI * 52;
    const tinyRawLength = (0.01 / 100) * circumference;
    const nextDrawnLength = (99.99 / 100) * circumference - 2;

    expect(tinyRawLength).toBeLessThan(2);
    expect(geometry).toHaveLength(1);
    expect(geometry[0].drawn).toBeCloseTo(nextDrawnLength, 10);
    expect(geometry[0].remainder).toBeCloseTo(circumference - nextDrawnLength, 10);
    expect(geometry[0].offset).toBeCloseTo(-tinyRawLength, 10);
  });
});
