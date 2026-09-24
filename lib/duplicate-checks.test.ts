import { describe, expect, it } from "vitest";
import { computeContinutChecks, computeKeywordsChecks, computeStructuraChecks, duplicateTextPages, keywordInWrittenText, ownWrittenText, paginationState, sameHeadingPages } from "./audit-engine";
import type { PageData } from "./net";
import { priceCount } from "./page-selection";
import { countInternalLinks } from "./parse-page";

const page = (url: string, body: string, title = ""): PageData => ({
  url, status: 200, ok: true, headers: {},
  html: `<html><head><title>${title}</title></head><body><header><p>${"Livrare gratuita peste 300 lei in toata tara, retur 14 zile.".repeat(2)}</p></header>${body}<footer><p>${"Magazin Exemplu SRL, str. Exemplu 1, Bucuresti, telefon 0700 000 000.".repeat(2)}</p></footer></body></html>`,
});
const para = (seed: string) => `<p>${`Descriere ${seed}: un text lung despre produs, materiale, dimensiuni si utilizare zilnica. `.repeat(3)}</p>`;

describe("duplicateTextPages", () => {
  it("counts the pages whose own text is copied from another page", () => {
    const pages = [page("https://s.ro/a", para("comun") + para("comun 2")), page("https://s.ro/b", para("comun") + para("comun 2")), page("https://s.ro/c", para("unic c")), page("https://s.ro/d", para("unic d")), page("https://s.ro/e", para("unic e"))];
    expect(duplicateTextPages(pages)).toBe(2);
  });

  it("does not count filter and sort widgets shared by listing pages", () => {
    const filters = `<div class="widget"><ul><li>negru 9 gri 4 portocaliu 4 roz 3 turcoaz 3 albastru 2 verde 2 alb 1 galben 1</li><li>pana la 8 km/h (mers) 10 10-15 km/h 34 16 km/h sau mai mult 19 total</li><li>filtreaza sorteaza recomandate pret crescator pret descrescator cele mai noi</li><li>statie cu greutati 11 aparat de tractiuni 2 aparat pentru abdomen 2 banca 4</li></ul></div>`;
    const pages = [page("https://s.ro/magazin", filters), page("https://s.ro/benzi", filters + para("unic benzi")), page("https://s.ro/c", para("unic c")), page("https://s.ro/d", para("unic d")), page("https://s.ro/e", para("unic e"))];
    expect(duplicateTextPages(pages)).toBe(0);
  });

  it("does not count product names shown as cards on listing and product pages", () => {
    const cards = ["2 mm dr. sabeti, peek yellow", "4 mm dr. sabeti, peek green", "6 mm dr. sabeti, peek blue", "8 mm dr. sabeti, peek red"]
      .map((x) => `<div class="card">Instrument pentru tesut de granulatie, ${x} (versiune scurta si lunga), autoclavabil - kohler dental</div>`).join("");
    const pages = [page("https://s.ro/collections/lucas", cards), page("https://s.ro/products/chiureta", para("unic chiureta") + cards), page("https://s.ro/c", para("unic c")), page("https://s.ro/d", para("unic d")), page("https://s.ro/e", para("unic e"))];
    expect(duplicateTextPages(pages)).toBe(0);
  });

  it("does not count the site template repeated on every page", () => {
    const pages = ["a", "b", "c", "d"].map((x) => page(`https://s.ro/${x}`, para(`unic ${x}`)));
    expect(duplicateTextPages(pages)).toBe(0);
  });

  it("gives the same answer for any number of pages, not a fixed share", () => {
    const pages = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m"].map((x) => page(`https://s.ro/${x}`, para(`unic ${x}`)));
    expect(duplicateTextPages(pages)).toBe(0);
  });
});

describe("sameHeadingPages", () => {
  it("counts every page sharing its H1 with another page", () => {
    const pages = [page("https://s.ro/a", "<h1>Gantere reglabile</h1>"), page("https://s.ro/b", "<h1>Gantere  Reglabile</h1>"), page("https://s.ro/c", "<h1>Benzi de alergare</h1>")];
    expect(sameHeadingPages(pages)).toBe(2);
  });

  it("falls back to the title and ignores the same URL read twice", () => {
    const pages = [page("https://s.ro/a", "", "Saltele fitness"), page("https://s.ro/b", "", "Saltele fitness"), page("https://s.ro/c/", "<h1>Unic</h1>"), page("https://s.ro/c", "<h1>Unic</h1>")];
    expect(sameHeadingPages(pages)).toBe(2);
  });

  it("finds nothing when every heading is distinct, whatever the page count", () => {
    const pages = Array.from({ length: 13 }, (_, i) => page(`https://s.ro/${i}`, `<h1>Produs ${i}</h1>`));
    expect(sameHeadingPages(pages)).toBe(0);
  });
});

describe("the report checks are measured, never a fixed share of the pages", () => {
  const distinct = Array.from({ length: 25 }, (_, i) => page(`https://s.ro/${i}`, `<h1>Produs ${i}</h1>` + para(`unic ${i}`)));
  it("reports no repeated text on a shop whose pages are all different", () => {
    expect(computeContinutChecks(distinct).find((c) => c.id === "continut_unic")).toMatchObject({ correctCount: 25, total: 25 });
  });
  it("reports no competing pages on a shop whose headings are all different", () => {
    expect(computeKeywordsChecks(distinct).find((c) => c.id === "kw_fara_canibalizare")).toMatchObject({ correctCount: 25, total: 25 });
  });
});

describe("keywordInWrittenText", () => {
  const withText = (title: string, h1: string, text: string) => page("https://s.ro/p", `<h1>${h1}</h1><p>${text}</p>`, title);
  const alone = (p: PageData) => keywordInWrittenText(p, ownWrittenText([p])[0].own);
  it("finds the title words in the written text, with other endings and without diacritics", () => {
    expect(alone(withText("Gantere reglabile 20 kg | Magazin", "Produs", "Setul de gantere reglabila din otel se foloseste acasa si la sala, pentru antrenamente complete."))).toBe(true);
  });
  it("reads the title as the visitor sees it, not its HTML codes", () => {
    expect(alone(withText("Formular retragere &ndash; Magazin", "Formular", "Completeaza formularul de retragere cu adresa de e-mail si numarul comenzii tale."))).toBe(true);
  });
  it("reports a text that never uses the title words", () => {
    expect(alone(withText("Banda de alergare | Magazin", "Banda de alergare", "Un produs solid, construit din materiale bune, potrivit pentru orice apartament sau casa."))).toBe(false);
  });
  it("does not judge a page with no written text", () => {
    expect(alone(page("https://s.ro/p", "<h1>Gantere</h1><div>Adauga in cos</div>", "Gantere | Magazin"))).toBeNull();
  });
  it("measures the text, not the main heading, so it is not the heading check counted twice", () => {
    const pages = [withText("Gantere reglabile | Magazin", "Oferta zilei", "Aceste gantere reglabile se schimba rapid intre greutati, ideale pentru antrenamentul de acasa.")];
    expect(computeContinutChecks(pages).find((c) => c.id === "cuvinte_cheie")).toMatchObject({ correctCount: 1, total: 1 });
    expect(computeKeywordsChecks(pages).find((c) => c.id === "kw_in_h1")).toMatchObject({ correctCount: 0, total: 1 });
  });
  it("does not judge a page whose only written text is the one every page repeats", () => {
    const blurb = "<p>Livrare rapida oriunde in Romania, gratuita la comenzile peste 749 RON, cu retur in 14 zile.</p>";
    const pages = [
      withText("Gantere reglabile | Magazin", "Gantere", "Aceste gantere reglabile se schimba rapid intre greutati, ideale pentru antrenamentul de acasa."),
      ...["a", "b", "c"].map((x) => page(`https://s.ro/${x}`, `<h1>Adeziv ${x}</h1>` + blurb, `Adeziv oral ${x} | Magazin`)),
    ].map((p) => ({ ...p, html: p.html.replace("</body>", blurb + "</body>") }));
    expect(computeContinutChecks(pages).find((c) => c.id === "cuvinte_cheie")).toMatchObject({ correctCount: 1, total: 1 });
  });
});


describe("the visible trail is judged where it belongs", () => {
  const trail = '<nav aria-label="breadcrumb"><a href="/">Acasa</a> / Gantere</nav>';
  const home = page("https://s.ro/", "<h1>Magazin</h1>");
  const cat = page("https://s.ro/gantere/", `<div class="breadcrumb">${trail}</div>`);
  const prod = page("https://s.ro/gantere/set/", "<h1>Set gantere</h1>");
  it("judges category and product pages only, never the home page", () => {
    const c = computeStructuraChecks([home, cat, prod], "", "", "https://s.ro/sitemap.xml", { categories: [cat.url], products: [prod.url] }).find((x) => x.id === "breadcrumbs");
    expect(c).toMatchObject({ correctCount: 1, total: 2 });
  });
});

describe("paginationState", () => {
  const grid = (n: number) => Array.from({ length: n }, (_, i) => `<article><a href="/p/${i}">Produs ${i}</a><span>${100 + i} lei</span></article>`).join("");
  it("counts pagination as present when the page has it", () => {
    expect(paginationState(`<p>48 rezultate</p>${grid(24)}<nav class="woocommerce-pagination"><a class="page-numbers" href="/page/2/">2</a></nav>`)).toBe(true);
  });
  it("reports it missing only when the page says it has more products than it shows", () => {
    expect(paginationState(`<p>Afisare 1-24 din 48 rezultate</p>${grid(24)}`)).toBe(false);
  });
  it("does not judge a category that shows all its products on one page", () => {
    expect(paginationState(`<strong>48 produse</strong>${grid(48)}`)).toBeNull();
  });
  it("does not judge when the page gives no product total", () => {
    expect(paginationState(grid(12))).toBeNull();
  });
});

describe("priceCount", () => {
  it("counts a price whose currency sits in its own tag, as themes often write it", () => {
    expect(priceCount('<span class="price">29 <small>lei</small></span><span class="price">1.299,00<span>RON</span></span><b>49 lei</b>')).toBe(3);
  });
});

describe("countInternalLinks", () => {
  it("counts links to the same shop with or without www", () => {
    const html = '<a href="https://magazinfitness.ro/gantere/">a</a><a href="https://www.magazinfitness.ro/benzi/">b</a><a href="/cos/">c</a><a href="https://facebook.com/magazinfitness.ro">d</a>';
    expect(countInternalLinks(html, "www.magazinfitness.ro")).toBe(3);
    expect(countInternalLinks(html, "magazinfitness.ro")).toBe(3);
  });
});

describe("the site audit measures the site, not search demand", () => {
  it("does not emit the retired category-coverage check", () => {
    expect(computeKeywordsChecks([page("https://s.ro/a/b/", "<h1>A</h1>", "A")]).map((c) => c.id)).not.toContain("kw_categorii");
  });
});
