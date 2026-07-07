import { describe, it, expect } from "vitest";
import { parseTitle, parseMeta, parseMetaOG, parseCanonical, countH1, parseJsonLD, parseImages, countWords } from "./parse-page";

describe("parse-page", () => {
  it("parseTitle scoate tag-urile interioare", () => {
    expect(parseTitle("<title>Magazin <b>X</b></title>")).toBe("Magazin X");
    expect(parseTitle("<html>fara titlu</html>")).toBe("");
  });

  it("parseMeta prinde si atributele inversate (content inainte de name)", () => {
    expect(parseMeta('<meta name="description" content="abc">', "description")).toBe("abc");
    expect(parseMeta('<meta content="abc" name="description">', "description")).toBe("abc");
    expect(parseMeta("<meta charset=utf-8>", "description")).toBe("");
  });

  it("parseMetaOG pe og:title in ambele ordini", () => {
    expect(parseMetaOG('<meta property="og:title" content="Titlu">', "og:title")).toBe("Titlu");
    expect(parseMetaOG('<meta content="Titlu" property="og:title">', "og:title")).toBe("Titlu");
  });

  it("parseCanonical in ambele ordini de atribute", () => {
    expect(parseCanonical('<link rel="canonical" href="https://x.ro/p">')).toBe("https://x.ro/p");
    expect(parseCanonical('<link href="https://x.ro/p" rel="canonical">')).toBe("https://x.ro/p");
  });

  it("countH1 numara doar h1", () => {
    expect(countH1("<h1>a</h1><h1 class='x'>b</h1><h2>c</h2>")).toBe(2);
  });

  it("parseJsonLD sare peste JSON invalid, pastreaza validul", () => {
    const html = '<script type="application/ld+json">{"@type":"Product"}</script>' +
      '<script type="application/ld+json">{invalid}</script>';
    const r = parseJsonLD(html);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ "@type": "Product" });
  });

  it("parseImages marcheaza alt lipsa cu sentinela si ignora data: URI", () => {
    const imgs = parseImages('<img src="/a.jpg" alt="poza"><img src="/b.jpg"><img src="data:xxx" alt="skip">');
    expect(imgs).toEqual([
      { src: "/a.jpg", alt: "poza" },
      { src: "/b.jpg", alt: "__MISSING__" },
    ]);
  });

  it("countWords ignora script/style si cuvintele scurte", () => {
    expect(countWords("<style>.x{}</style><p>Salut lume frumoasa aici</p>")).toBe(4);
  });
});
