import { describe, expect, it } from "vitest";
import { buildDeck, paginateChecklist, type CheckRow } from "./report-deck";
import type { AuditData, PageCheck } from "./types";

const check = (id: string, correctCount: number, total: number, unit?: string): PageCheck =>
  ({ id, label: id, correctCount, total, unit, problema: `problema ${id}`, fix: `fix ${id}\nsecond line` });

const base = (over: Partial<AuditData> = {}): AuditData => ({
  url: "https://www.s.ro", domain: "www.s.ro", pagesAnalyzed: 60, scor: 80,
  checksRezultate: {
    lcp: { status: "atentie", value: "4.9 s" },
    pagespeed_mobile: { status: "ok", value: "75 / 100" },
    schema_rating: { status: "atentie", value: "Rating pe 2 din 46 pagini" },
    https: { status: "ok", value: "HTTPS activ" },
  },
  seoChecks: [check("title_tag", 60, 60)],
  continutChecks: [check("continut_unic", 55, 60)],
  keywordsChecks: [check("kw_in_url", 25, 60)],
  structuraChecks: [check("sitemap_xml", 4, 4)],
  aiChecks: [check("robots_llm", 5, 6, "crawlere"), check("llms_txt", 0, 1, "fisier"), check("entitate_ai", 2, 2, "legaturi")],
  ...over,
});

describe("buildDeck", () => {
  it("lists page problems worst first, counting the pages that HAVE the problem, in client language", () => {
    const d = buildDeck(base());
    expect(d.seo.problems.map((p) => [p.title, p.count])).toEqual([
      ["Lipseste rezumatul pentru asistentii AI", "1 din 1 fisier"],
      ["Cuvantul cautat lipseste din adresa paginii", "35 din 60 pagini"],
      ["Roboti AI opriti sa citeasca site-ul", "1 din 6 roboti AI"],
      ["Text repetat intre pagini", "5 din 60 pagini"],
    ]);
    expect(d.domain).toBe("s.ro");
  });

  it("adds the AI zone and slide only when the report carries AI checks", () => {
    expect(buildDeck(base()).seo.zones.map((z) => z.name)).toContain("Vizibilitate in AI");
    expect(buildDeck(base()).seo.ai?.map((c) => c.big)).toEqual(["5/6", "Nu", "2/2"]);
    const old = buildDeck(base({ aiChecks: undefined }));
    expect(old.seo.zones.map((z) => z.name)).not.toContain("Vizibilitate in AI");
    expect(old.seo.ai).toBeNull();
  });

  it("checklist rows: open items carry the first line of the fix, site checks come from checksRezultate", () => {
    const rows = buildDeck(base()).seo.checklist;
    expect(rows.find((r) => r.title === "Text repetat intre pagini")).toEqual({ done: false, title: "Text repetat intre pagini", note: "Scrie text propriu pentru fiecare pagina, incepand cu categoriile si produsele cele mai vandute.", result: "5 din 60 pagini" });
    expect(rows.find((r) => r.title === "Conexiune securizata (lacatul din browser)")).toMatchObject({ done: true, result: "da" });
    expect(rows.find((r) => r.title === "Stele (nota clientilor) afisate in Google")).toMatchObject({ done: false, result: "2 din 46 pagini de produs" });
  });

  it("an unmeasured value is 'de verificat', never a finding, and never the first thing to fix", () => {
    const d = buildDeck(base({ checksRezultate: { lcp: { status: "atentie", value: "Date indisponibile" }, pagespeed_mobile: { status: "atentie", value: "Nu s-a putut contacta PageSpeed API" } } }));
    expect(d.ux.checklist.filter((r) => r.result === "de verificat").map((r) => r.title)).toEqual(["Scor de viteza pe mobil", "Continutul principal apare repede pe telefon"]);
    expect(d.ux.speed.mobile).toBe("—");
    expect(d.first?.title).toBe("Lipseste rezumatul pentru asistentii AI");
  });

  it("puts a slow mobile page first when it is measured", () => {
    expect(buildDeck(base()).first?.title).toBe("Pagina se incarca greu pe telefon");
  });
});

describe("paginateChecklist", () => {
  const open = (i: number, note = "how to fix"): CheckRow => ({ done: false, title: `t${i}`, note, result: "" });
  const ok = (i: number): CheckRow => ({ done: true, title: `ok${i}`, note: "", result: "" });
  const shape = (rows: CheckRow[]) => paginateChecklist(rows).map((p) => [p.todo.length, p.done.length]);
  it("fills a slide with open rows by height and closes the last slide with what is already fine", () => {
    expect(shape([...Array.from({ length: 10 }, (_, i) => open(i)), ...Array.from({ length: 10 }, (_, i) => ok(i))])).toEqual([[7, 0], [3, 10]]);
  });
  it("rows without a how-to line are shorter, so more fit on a slide", () => {
    expect(shape([...Array.from({ length: 3 }, (_, i) => open(i)), ...Array.from({ length: 4 }, (_, i) => open(i, "")), ...Array.from({ length: 4 }, (_, i) => ok(i))])).toEqual([[7, 4]]);
  });
  it("moves the done block to its own slide when the last slide is already full", () => {
    expect(shape([...Array.from({ length: 7 }, (_, i) => open(i)), ...Array.from({ length: 6 }, (_, i) => ok(i))])).toEqual([[7, 0], [0, 6]]);
  });
  it("renders one slide of done rows when nothing is open", () => {
    expect(shape([ok(1)])).toEqual([[0, 1]]);
  });
});
