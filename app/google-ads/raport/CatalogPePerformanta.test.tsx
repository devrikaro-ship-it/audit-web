import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CatalogPePerformanta from "./CatalogPePerformanta";
import type { Grupa, Segmentare } from "@/lib/gads-findings";

function group(count: number): Grupa {
  return { count, cost: count, valoare: count, produse: [], produseRestante: 0 };
}

describe("catalog performance rings", () => {
  it("places each product arc after the full lengths of all preceding arcs", () => {
    const segmentare: Segmentare = {
      heroes: group(1),
      sidekicks: group(2),
      villains: group(3),
      zombies: group(4),
      zeroZombies: group(5),
      judecabila: true,
    };
    const html = renderToStaticMarkup(
      <CatalogPePerformanta harti={[{ eticheta: "365 days", segmentare }]} />
    );
    const firstRing = html.match(/<svg[\s\S]*?<\/svg>/)?.[0] ?? "";
    const offsets = [...firstRing.matchAll(/stroke-dashoffset="([^"]+)"/g)].map((match) =>
      Number(match[1])
    );
    const circumference = 2 * Math.PI * 52;

    expect(offsets).toHaveLength(5);
    const expectedOffsets = [
      0,
      -(1 / 15) * circumference,
      -(3 / 15) * circumference,
      -(6 / 15) * circumference,
      -(10 / 15) * circumference,
    ];
    offsets.forEach((offset, index) => {
      expect(offset).toBeCloseTo(expectedOffsets[index], 10);
    });
  });
});
