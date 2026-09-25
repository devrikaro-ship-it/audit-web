import { describe, expect, it } from "vitest";
import { computeUxStandard } from "./audit-engine";
import type { PageData } from "./net";

const C = "https://clinica.ro";
const header = '<header><nav class="menu"><a href="/radiografie/">Radiografie</a><a href="/tomografie/">Tomografie</a><a href="/programare/">Programeaza-te</a></nav><a href="tel:0219878">021 9878</a></header>';
const text = (x: string) => `<p>${`Despre ${x}: explicam pe larg cum decurge fiecare etapa si ce trebuie sa stie pacientul. `.repeat(4)}</p>`;
const page = (path: string, body: string): PageData => ({ url: C + path, status: 200, ok: true, headers: {}, html: `<html><head><meta name="viewport" content="width=device-width"></head><body>${header}<h1>${path}</h1>${body}</body></html>` });
const form = '<form><input name="nume"><input type="tel" name="telefon"><input type="email" name="email"><textarea name="mesaj"></textarea><input type="submit"></form>';
const good = () => [
  page("/", `${text("clinica")}<p>Recenzii: ce spun pacientii.</p><p>Echipa noastra de medici.</p><p>Clinica acreditata, parteneri de incredere.</p><a href="https://wa.me/40721000111">WhatsApp</a>`),
  page("/radiografie/", `${text("radiografie")}<p>Pret: de la 90 lei</p><a href="/tomografie/?din=radiografie">Vezi si tomografia</a><a href="/scanare/">Scanare</a>`),
  page("/tomografie/", `${text("tomografie")}<p>Pret 250 lei</p><a href="/radiografie/?din=tomografie">Radiografie</a><a href="/scanare/">Scanare</a>`),
  page("/scanare/", `${text("scanare")}<p>Pret 150 lei</p><a href="/radiografie/?x=1">Radiografie</a><a href="/tomografie/?x=1">Tomografie</a>`),
  page("/contact/", `${form}<iframe src="https://www.google.com/maps/embed?pb=1"></iframe><p>Bulevardul Unirii 10, Bucuresti. Luni - Vineri 8-20</p>`),
];
const rows = (pages: PageData[]) => Object.fromEntries(computeUxStandard("leads", pages, { categories: [], products: [], services: ["/radiografie/", "/tomografie/", "/scanare/"].map((p) => C + p), locations: [] }, { score: 80, lcp: "2,1 s" } as never, "clinica.ro").flatMap((g) => g.rows.map((r) => [r.id, r])));

describe("computeUxStandard on a lead site (spec 2026-09-25 §4)", () => {
  it("a clinic that does everything right passes every row it can judge; real photos stay 'de verificat'", () => {
    const r = rows(good());
    expect(Object.values(r).filter((x) => x.total > 0 && !x.verify && x.ok !== x.total).map((x) => x.id)).toEqual([]);
    expect(r.tr_photos).toMatchObject({ verify: true });
  });

  it("finds each lead UX fault where it is, and is not fooled by the site's template", () => {
    const p = good();
    // The menu links every service on every page: that is not a related-service link (dentalview.ro).
    p[1] = page("/radiografie/", `${text("radiografie")}<p>Pret: de la 90 lei</p>`);
    // No price on the page; a search box is not a contact form; "WhatsApp-Image.jpeg" is not WhatsApp (dentalview.ro).
    p[2] = page("/tomografie/", `${text("tomografie")}<a href="/radiografie/?din=tomografie">Radiografie</a><a href="/scanare/">Scanare</a>`);
    p[0] = page("/", `<img src="/uploads/WhatsApp-Image-2026.jpeg">${text("clinica")}`);
    // A long form (eight fields) is not a short one; the site search box is no contact form at all.
    const long = `<form>${'<input name="a"><input name="b">'.repeat(3)}<input type="tel" name="telefon"><input type="email" name="email"></form>`;
    p[4] = page("/contact/", `<form role="search"><input name="s"></form>${long}<p>Bulevardul Unirii 10</p>`);
    // A footer built from divs links the services on every page (dentalview.ro): not a related link either.
    const footer = '<div class="footer-links"><a href="/radiografie/">R</a><a href="/tomografie/">T</a><a href="/scanare/">S</a></div>';
    for (const i of [0, 1, 3, 4]) p[i] = { ...p[i], html: p[i].html.replace("</body>", footer + "</body>") };
    const r = rows(p);
    // Every service is linked from that footer, so a link in the text to the same service cannot be told apart.
    expect(r.srv_related).toMatchObject({ ok: 0, total: 3, verify: true });
    expect(r.srv_price).toMatchObject({ ok: 2, total: 3 });
    expect(r.ct_form_short).toMatchObject({ ok: 0, total: 1 });
    expect(r.ct_chat).toMatchObject({ ok: 0, total: 1 });
    expect(r.ct_map).toMatchObject({ ok: 0, total: 1 });
    expect(r.ct_hours).toMatchObject({ ok: 0, total: 1 });
    expect(r.tr_reviews).toMatchObject({ ok: 0, total: 1 });
  });

  it("a page without related links fails when the template links no service", () => {
    const p = good();
    p[1] = page("/radiografie/", `${text("radiografie")}<p>Pret: de la 90 lei</p>`);
    expect(rows(p).srv_related).toMatchObject({ ok: 2, total: 3 });
    expect(rows(p).srv_related.verify).toBeUndefined();
  });

  it("the phone counts as visible without scrolling only before the main heading", () => {
    const low = good().map((x) => ({ ...x, html: x.html.replace('<a href="tel:0219878">021 9878</a></header>', "</header>").replace("</body>", '<footer><a href="tel:0219878">021 9878</a></footer></body>') }));
    expect(rows(low).lead_home_phone).toMatchObject({ ok: 0, total: 1 });
    expect(rows(low).ct_call).toMatchObject({ ok: 1, total: 1 });
  });

  it("speed not measured is not a finding", () => {
    const r = Object.fromEntries(computeUxStandard("leads", good(), { categories: [], products: [], services: [], locations: [] }, null, "clinica.ro").flatMap((g) => g.rows.map((x) => [x.id, x])));
    expect(r.viteza_scor.total).toBe(0);
    expect(r.viteza_lcp.total).toBe(0);
  });
});
