# Meta Ads (Facebook + Instagram) — research cold, fara cont

Devrika face si Meta Ads. Pentru un magazin ecom, Meta e des cea mai mare cheltuiala — auditul TREBUIE sa-l atinga. Tot ce urmeaza se afla **fara acces la contul lor**: din sursa paginii + Meta Ad Library (publica).

## A. Pixel Meta instalat? (din `collect.py`)
Sectiunea "TRACKING & MASURARE" raporteaza deja:
- **Meta Pixel** (`fbq` / `connect.facebook.net`) — DA/NU
- **Meta CAPI** (server-side) — NU se confirma cold; mereu "de verificat in Events Manager"

Interpretare in audit (limbaj client):
- **Fara Pixel** → "Daca pornesti reclame pe Facebook/Instagram, nu poti masura ce vinzi din ele si nu poti optimiza — arzi buget pe orb."
- **Pixel da, CAPI necunoscut** → "Ai pixelul, dar fara partea server-side (CAPI) pierzi ~10-30% din conversiile masurate dupa iOS 14. De verificat."
- **GTM prezent, Pixel nu apare in sursa** → poate fi prin GTM; spune "de confirmat live", nu afirma lipsa.

## B. Ruleaza reclame ACUM? — Meta Ad Library (public, Playwright)

Ad Library arata reclamele ACTIVE ale oricarui brand, fara cont. Cea mai puternica dovada de vanzare: *"competitorul ruleaza X reclame, tu 0"*.

1. `browser_navigate` la:
   `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=RO&q=<brand>&media_type=all`
   (inlocuieste `<brand>` cu numele clientului, nu domeniul).
2. Citeste numarul "~N rezultate" si scaneaza cardurile:
   - **ruleaza** → cate reclame active, ce tip (imagine/video/carusel), au mesaj de oferta?
   - **0 rezultate** → nu ruleaza Meta acum = oportunitate mare ("canalul cu cel mai mare volum pt ecom e neatins").
3. Repeta pentru **2-3 competitori** din nisa → comparatie:
   - "Competitorul X ruleaza 24 reclame video active, tu 0."
4. Daca pagina cere login/consent sau nu incarca → "research neconcludent", NU inventa.

Snippet `browser_evaluate` (numar aproximativ reclame active vizibile):
```js
(() => {
  const txt = document.body.innerText || '';
  const m = txt.match(/~?\s*([\d.,]+)\s+(rezultate|results)/i);
  const cards = document.querySelectorAll('[role="article"], a[href*="ad_archive"]').length;
  return { rezultate_text: m ? m[1] : null, carduri_vizibile: cards };
})()
```

## C. Ce raportezi in audit din Meta
- "Meta Pixel: DA/NU" (din collect) — daca NU + face ecom = finding "Mare".
- "Meta CAPI: de verificat" — mereu, cu impactul (conversii pierdute post-iOS).
- "Reclame active acum: DA (N) / NU / neconfirmat" (din Ad Library).
- "Competitia ruleaza Meta: X are N reclame, tu 0/N" — framing comparativ.

## Reguli
- Nu afirma spend/ROAS/buget — nu le ai.
- Ad Library = doar reclame **active si publice**; absenta poate insemna pauza, nu inexistenta. Spune "nu ruleaza acum", nu "n-a rulat niciodata".
- O singura sesiune Playwright persistenta (reguli globale browser).
