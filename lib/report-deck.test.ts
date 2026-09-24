import { describe, expect, it } from "vitest";
import { buildDeck, paginateChecklist, paginateStandard, type CheckRow, type StdGroup } from "./report-deck";
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
  it("standard checklist: groups in order, a group that does not fit continues on the next slide under its name", () => {
    const g = (name: string, ok: number, fail: number): StdGroup => ({ name, score: null, rows: [
      ...Array.from({ length: ok }, (_, i) => ({ state: "ok" as const, title: `${name}${i}`, result: "", note: "" })),
      ...Array.from({ length: fail }, (_, i) => ({ state: "fail" as const, title: `${name}f${i}`, result: "", note: "fix" })),
    ] });
    const pages = paginateStandard([g("a", 4, 0), g("b", 2, 3), g("c", 4, 2)]);
    expect(pages.map((p) => p.map((x) => [x.name, x.rows.length]))).toEqual([[["a", 4], ["b", 4]], [["b", 1], ["c", 6]]]);
    const height = (p: StdGroup[]) => p.reduce((h, x) => h + 0.6 + x.rows.reduce((n, r) => n + (r.note ? 1 : 0.62), 0), 0);
    expect(pages.every((p) => height(p) <= 7.4)).toBe(true);
    expect(pages.flat().flatMap((x) => x.rows.map((r) => r.title))).toEqual([g("a", 4, 0), g("b", 2, 3), g("c", 4, 2)].flatMap((x) => x.rows.map((r) => r.title)));
  });

  it("renders one slide of done rows when nothing is open", () => {
    expect(shape([ok(1)])).toEqual([[0, 1]]);
  });
  it("continues a long done block on the next slide instead of letting it overflow", () => {
    expect(shape(Array.from({ length: 40 }, (_, i) => ok(i)))).toEqual([[0, 20], [0, 20]]);
    expect(shape([...Array.from({ length: 5 }, (_, i) => open(i)), ...Array.from({ length: 32 }, (_, i) => ok(i))])).toEqual([[5, 4], [0, 20], [0, 8]]);
  });

  it("a check that judged no page is neither a problem nor part of a score", () => {
    const withEmpty = base({ continutChecks: [check("continut_unic", 55, 60), check("cuvinte_cheie", 0, 0)] });
    expect(buildDeck(withEmpty).seo.problems.map((p) => p.title)).not.toContain("Text fara cuvantul pe care il cauta clientii");
    expect(buildDeck(withEmpty).seo.zones.find((z) => z.name === "Continut")?.score).toBe(buildDeck(base()).seo.zones.find((z) => z.name === "Continut")?.score);
  });

  it("the cover title matches the verdict: a good shop is not told it is losing clients", () => {
    expect(buildDeck(base({ scor: 94 })).cover).toBe("Ce mai poate castiga s.ro");
    expect(buildDeck(base({ scor: 55 })).cover).toBe("Unde pierde clienti s.ro");
    expect(buildDeck(base({ scor: 20 })).cover).toBe("Unde pierde clienti s.ro");
  });

  it("a report saved with a failed speed test shows it as de verificat, not as 0 / 100", () => {
    const failed = base({ checksRezultate: {
      pagespeed_mobile: { status: "critic", value: "0 / 100" }, pagespeed_desktop: { status: "critic", value: "0 / 100" },
      lcp: { status: "atentie", value: "—" }, cls: { status: "ok", value: "0" }, inp: { status: "atentie", value: "—" },
    } });
    const d = buildDeck(failed);
    expect(d.ux.speed).toEqual({ mobile: "—", desktop: "—", lcp: "—" });
    expect(d.ux.checklist.filter((r) => ["Scor de viteza pe mobil", "Pagina nu sare in timpul incarcarii", "Raspuns rapid la click"].includes(r.title)).map((r) => r.result)).toEqual(["de verificat", "de verificat", "de verificat"]);
  });

  it("a page type the audit did not read is de verificat, never something to add", () => {
    const unknown = { id: "filtre", label: "Filtre", status: "necunoscut" as const, scor: 0, gasit: [], lipsa: ["nu am prins acest tip de pagina in crawl"], problema: "", fix: "" };
    const d = buildDeck(base({ ux: { scor: 80, fields: [unknown] } as AuditData["ux"] }));
    expect(d.ux.checklist.filter((r) => r.note.startsWith("Filtre si sortare") || r.title.startsWith("Filtre si sortare"))).toEqual([
      { done: false, title: "Filtre si sortare: nu am citit o astfel de pagina", note: "Nu a fost printre paginile citite, asa ca nu am putut-o verifica.", result: "de verificat" },
    ]);
    expect(d.ux.pages[0].missing).toEqual([]);
  });

  it("a report saved with the retired category-coverage check neither lists it nor scores it", () => {
    const old = base({ keywordsChecks: [check("kw_in_url", 25, 60), check("kw_categorii", 0, 60)] });
    expect(buildDeck(old).seo.problems.map((p) => p.title)).not.toContain("Cautari fara o categorie dedicata");
    expect(buildDeck(old).seo.zones.find((z) => z.name === "Cuvinte cheie")?.score).toBe(42);
  });

  it("with the ten SEO components: numbered components, faults in chain order, unmeasured rows de verificat", () => {
    const seo = [
      { id: "raspuns", rows: [{ id: "pagini_200", ok: 60, total: 60 }, { id: "acces_server", ok: 0, total: 1, verify: true }] },
      { id: "robots", rows: [{ id: "robots_sitemap", ok: 0, total: 1 }] },
      { id: "html", rows: [{ id: "html_pret", ok: 0, total: 0 }] },
      { id: "continut", rows: [{ id: "alt_imagini", ok: 0, total: 40 }] },
    ];
    const d = buildDeck(base({ seo, checksRezultate: {} }));
    expect(d.seo.zones.map((z) => [z.name, z.score])).toEqual([["1. Paginile raspund corect", 100], ["2. Reguli pentru roboti (robots.txt)", 0], ["3. Continut vizibil fara incarcare ulterioara", null], ["4. Continutul paginii", 0]]);
    expect(d.seo.problems.map((p) => [p.title, p.count])).toEqual([["robots.txt arata unde e lista de pagini", "de reparat"], ["Pozele produselor au descriere", "40 din 40 pagini de produs"]]);
    expect(d.seo.standard?.map((g) => [g.name, g.score, g.rows.map((r) => [r.state, r.title, r.result])])).toEqual([
      ["1. Paginile raspund corect", 100, [["ok", "Pagini care raspund corect", "60 din 60 pagini"], ["verify", "Site-ul raspunde cererilor automate", "de verificat"]]],
      ["2. Reguli pentru roboti (robots.txt)", 0, [["fail", "robots.txt arata unde e lista de pagini", "nu"]]],
      ["3. Continut vizibil fara incarcare ulterioara", null, [["verify", "Pretul e in pagina, nu incarcat ulterior", "de verificat"]]],
      ["4. Continutul paginii", 0, [["fail", "Pozele produselor au descriere", "0 din 40 pagini de produs"]]],
    ]);
    expect(d.seo.score).toBe(33);
    expect(buildDeck(base({ seo: [{ id: "raspuns", rows: [{ id: "pagini_200", ok: 59, total: 60 }] }], checksRezultate: {} })).seo.standard?.[0].rows[0].state).toBe("fail");
    expect(d.first?.title).toBe("robots.txt arata unde e lista de pagini");
    expect(d.seo.product).toBeNull();
    expect(d.seo.ai).toBeNull();
  });
});

