# Spec Raport de Migrare (WooCommerce -> Shopify) — sursa unica

> **Autoritate:** daca codul si acest fisier se contrazic, castiga acest fisier.
> **Se citeste INAINTE** de a atinge: `lib/platform-audit.ts`, `lib/shopify-case.ts`,
> `components/migrare-report-renderer.tsx`.
> **Relatia cu `AUDIT-SPEC.md`:** acesta e un STRAT PESTE auditul rece, nu un tool paralel.
> Cele 4 rubrici (Tracking · SEO · UX/UI · Google Ads) raman definite EXCLUSIV in AUDIT-SPEC.
> **Creat:** 2026-07-30. Primul caz: robinetulmeu.ro.

---

## 1. Scop

Pentru un magazin pe platforma self-hosted (WooCommerce / PrestaShop / Magento / OpenCart),
raspunde la o singura intrebare, cu cifre: **cat il costa platforma pe care sta si cat ar
castiga daca s-ar muta pe Shopify.**

Nu e un audit nou. E o **interpretare** a auditului existent prin filtrul platformei.

## 2. Arhitectura — strat peste motorul existent

```
runAudit(url)              -> AuditData      (motorul RECE: crawl ~50 pagini, 4 rubrici, BrightData)
collectPlatformEvidence()  -> PlatformEvidence (stratul NOU: stack, extensii, greutate, CrUX, checkout)
buildShopifyCase(audit, evidence, input) -> ShopifyCase
```

**REGULA DE AUR:** nu se re-implementeaza nimic din ce face deja motorul. Viteza, UX pe
tipuri de pagina, tracking, CSS, semnalul de produse vin din `AuditData`. Stratul nou
aduce STRICT ce nu exista: versiuni de platforma, inventar de extensii, greutatea reala
a paginii, date de camp CrUX, semnale de checkout.

| Modul | Rol | Retea? |
|---|---|---|
| `lib/platform-audit.ts` | dovezi de platforma + verdicte | da (via `net.ts`) |
| `lib/shopify-case.ts` | leviere, scenarii, cost total | **nu — pur** |
| `lib/net.ts` -> `fetchPlatformVitals` | CrUX (camp) + Lighthouse (lab) | da |

## 3. Invariante (mostenite + specifice)

1. **Nu putem confirma -> "de verificat", NICIODATA "lipsa".** (mostenit din AUDIT-SPEC §5.1)
   Aplicat direct la wallets: nu se vad decat in checkout cu cosul plin.
2. **Fara diacritice** in textele client-facing.
3. **Fiecare levier porneste dintr-o MASURATOARE.** Fara cifra masurata pe site-ul lor,
   levierul nu exista. "Shopify e mai rapid" nu e argument.
4. **Atribuire onesta (`structural`).** Fiecare constatare declara daca tine de platforma
   (dispare prin migrare) sau se poate repara si pe stackul actual. LCP slab = reparabil
   pe loc, deci NU e argument de migrare. TTFB lent + greutate + dependenta de extensii = structural.
5. **Efectele nu se aduna naiv.** Levierele lucreaza pe acelasi vizitator: compunere
   multiplicativa + plafon global de +45%.
6. **Verdictul poate fi "nu migra".** Daca problemele sunt reparabile pe loc, asta scrie.
   Un tool care recomanda mereu migrarea nu e un instrument de diagnostic, e o brosura.
7. **`tradeoffs` sunt obligatorii** — ce PIERDE trecand pe Shopify apare mereu in raport.

## 4. Leviere (fiecare cu dovada + mecanism + sursa)

| Levier | Pornit de | Plafon | Sursa citata |
|---|---|---|---|
| Viteza server | TTFB camp > 350 ms | +12% | Deloitte/Google, "Milliseconds Make Millions" |
| Greutate pagina | > 3 MB | +5% | — (consecinta a levierului de viteza) |
| Checkout rapid | wallets neconfirmate | +15% | Baymard (abandon 70,2%) |
| Masurare | `conversie.scorPpc` < 80 | +6% | — |
| UX pagini | `ux.scor` < 70 | +8% | — |

Saturatie: `cap * (1 - e^(-k*x))` — primul interval de imbunatatire conteaza cel mai mult.

## 5. Scenarii — trei criterii, nu trei cifre inventate

| Scenariu | Include | Ajustare |
|---|---|---|
| Conservator | doar leviere `masurat` | x0,6 |
| Probabil | `masurat` + `partial` | — |
| Optimist | tot, inclusiv `neconfirmat` | — |

Fara numarul de vizite lunare: se afiseaza DOAR procente, niciodata sume inventate.

## 6. Cost total (TCO)

`current = gazduire + extensii + mentenanta` (medii de piata RO cand nu-s declarate)
`shopify = abonament + aplicatii`
`payback = migrare_one_off / (castig_lunar - diferenta_de_cost)`

Payback-ul se calculeaza din castigul NET, nu din venitul brut.

## 7. Praguri

| Semnal | Bun | De reglat | Slab |
|---|---|---|---|
| TTFB (camp) | <=800 ms | 800-1800 | >1800 |
| LCP (camp) | <=2500 ms | 2500-4000 | >4000 |
| Greutate | <3 MB | — | >=3 MB |
| Extensii vizibile | <5 | 5-9 | >=10 |

## 8. Gotcha operationale (masurate, nu presupuse)

- **PageSpeed dureaza pana la ~40 s** cu cache rece pe un magazin greu (masurat pe
  robinetulmeu.ro: 40,4 s, 14,5 MB). Timeout-ul e **90 s** + o reincercare. Un timeout
  de 30 s taie exact magazinele pentru care are sens raportul.
- **CrUX API dedicat (`chromeuxreport.googleapis.com`) NU e activat** pe proiectul cheii
  PageSpeed (403). Datele de camp se iau din raspunsul PSI (`loadingExperience`), nu din
  API-ul separat. De activat daca vrem CrUX rapid, fara Lighthouse.
- **Cadere pe origin:** magazinele mici n-au date CrUX pe pagina; cadem pe
  `originLoadingExperience` (tot domeniul). Fara niciunul -> "necunoscut", nu cifre inventate.
- **Extensiile detectate = minim garantat**, nu total: se vad doar cele cu asseturi pe
  prima pagina. Formularea in raport e mereu "cel putin N".

## 9. Rulare

```
LIVE_AUDIT=1 SITE=robinetulmeu.ro CONV=1.2 AOV=350 VISITS=15000 \
  npx vitest run lib/migrare-live.test.ts --testTimeout=600000 --disable-console-intercept
```

`lib/migrare-live.test.ts` e sarit implicit (atinge reteaua). Testele de regresie sunt
pure: `lib/platform-audit.test.ts` + `lib/shopify-case.test.ts`.

## 10. Stare

- ✅ `lib/platform-audit.ts` — dovezi + verdicte + atribuire structurala
- ✅ `lib/shopify-case.ts` — leviere, scenarii, TCO, tradeoffs, verdict
- ✅ `fetchPlatformVitals` in `net.ts` (CrUX camp + lab)
- ✅ teste pure + rulare live validata pe robinetulmeu.ro
- ⬜ raport vizual `/migrare/[id]` + PDF
- ⬜ intrare in funnel (vizite lunare + costuri actuale declarate)

## 11. Rezultat masurat — robinetulmeu.ro (2026-07-30)

WordPress 7.0.2 + WooCommerce 10.7.0, 61 pagini analizate, scor audit 76/100.

| Dovada | Masurat | Verdict |
|---|---|---|
| TTFB camp | 1.503 ms | de reglat, **structural** |
| LCP camp | 2.682 ms | de reglat, reparabil pe loc |
| Greutate | 14,5 MB / 55 scripturi | slab, **structural** |
| Extensii | cel putin 7 pe prima pagina | de reglat, **structural** |
| Plata rapida | neconfirmata | de verificat |

Verdict motor: **RECOMANDAT** (3 probleme structurale). Crestere estimata +13% (scenariul probabil).
