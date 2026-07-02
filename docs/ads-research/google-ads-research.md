# Google Ads / Shopping — research live + segmentare produse

Sectiunea Ads e mereu cea mai puternica parghie de vanzare la prospectare. Doua parti:
**(A)** o constatare standard despre segmentarea produselor (mereu prezenta), **(B)** research live cu Playwright (best-effort).

## A. Segmentarea produselor — MEREU in audit

Premisa (valabila la aproape orice magazin pe care il auditam): **ruleaza Google Shopping fara un sistem de segmentare pe performanta** → bugetul se imparte ~egal pe tot catalogul → produsele slabe mananca bani fara sa vanda.

Cadru de segmentare (model ProductHero / Labelizer):
| Tip | Definitie | Actiune |
|-----|-----------|---------|
| **Heroes** | spend mare + return mare | scalezi |
| **Sidekicks** | spend mic + return bun | sub-expuse → cresti bugetul |
| **Villains** | spend mare + return mic/zero | reduci / restructurezi |
| **Zombies** | fara impresii/click-uri | invizibile, greutate moarta |

Mesajul (in audit, limbaj de client):
> "Ai N produse in Shopping. Fara separare pe performanta, bugetul se duce si pe produsele care nu vand (Villains + Zombies). Un sistem de etichetare (Heroes/Villains/Zombies) muta banii pe produsele care aduc comenzi — aceeasi investitie, mai multe vanzari."

Asta intra **intotdeauna** ca oportunitate "Mare" in pagina Ads, indiferent ce gaseste research-ul.

## B. Research live cu Playwright (best-effort)

Scop: afla **daca** ruleaza Shopping si **cu ce tool/CSS**. Foloseste Playwright MCP (`browser_navigate`, `browser_snapshot`, `browser_evaluate`). Daca Google da consent/CAPTCHA sau nu apar PLA-uri, raporteaza "neconfirmat" — NU inventa.

### B1. Ruleaza Shopping? (cautare produse pe Google)
1. Ia 2-3 nume de produs reale din site (din colectare / sitemap).
2. `browser_navigate` la `https://www.google.com/search?q=<nume produs>&tbm=shop` (sau cautare normala si vezi blocul Shopping).
3. Verifica daca apar Product Listing Ads (PLA) cu brandul clientului.
   - apar → ruleaza Shopping (confirma in audit)
   - nu apar → "nu am vazut produsele in Shopping la cautare" (posibil nu ruleaza / buget mic / oportunitate)

### B2. Ce CSS / tool foloseste — METODA CORECTA: "De la X" in Produse sponsorizate
NU folosi tab-ul Shopping (`tbm=shop`/`udm=28`) pentru CSS — acolo apar doar numele magazinelor.
CSS-ul se vede pe **cautarea normala Google**, in blocul **"Produse sponsorizate"** (PLA platite), pe linia de jos a fiecarui card: **"De la <provider>"**.

1. `browser_navigate` la `https://www.google.com/search?q=<nume produs>&gl=ro&hl=ro` (cautare normala, NU shop).
2. Extrage verdictul cu o singura functie determinista (ruleaza prin `browser_evaluate`, inlocuieste `vegis` cu domeniul clientului fara `.ro`):
   ```js
   (() => {
     const CLIENT = 'vegis';   // <-- numele clientului (fara .ro)
     const cards = [...document.querySelectorAll('div')]
       .filter(d => /De la /.test(d.innerText||'') && (d.innerText||'').length<400);
     const pairs = [];
     for (const d of cards) {
       const t = d.innerText;
       const css = (t.match(/De la\s+([A-Za-z0-9.\- ]{2,25})/)||[])[1];
       const shop = (t.match(/([A-Za-z0-9.\-]+\.ro|Spring Farma|Dr\.Max)/i)||[])[1];
       if (css && shop) pairs.push({shop: shop.trim().replace(/\.ro$/i,''), css: css.trim()});
     }
     const uniq = [...new Set(pairs.map(p => p.shop+' -> '+p.css))];
     const mine = pairs.find(p => new RegExp(CLIENT,'i').test(p.shop));
     return {
       client_css: mine ? mine.css : 'NEGASIT in PLA (posibil nu ruleaza Shopping platit acum)',
       fara_css: mine ? /google/i.test(mine.css) : null,   // true = De la Google = fara CSS real
       toate: uniq
     };
   })()
   ```
3. Interpretare `client_css` pentru clientul tau:
   - **`De la Google`** → **fara CSS** → CPC pana la ~20% mai mare = oportunitate clara, spune-i ce pierde.
   - **`De la TRUDA` / `De la Producthero` / `De la smec` / alt nume** → **foloseste deja un CSS** (TRUDA, ProductHero, smec etc.). Schimba unghiul: nu "activeaza CSS", ci optimizare + segmentare + stele.
   - Daca clientul nu apare in PLA la cautare → posibil nu ruleaza Shopping platit acum (oportunitate) sau buget mic.
4. Bonus: vezi ce CSS folosesc competitorii din acelasi bloc → framing comparativ.

Exemplu real (vegis.ro, iun 2026): `Vegis.ro -> De la TRUDA`, `Esteto.ro -> De la Producthero`, `Spring Farma -> De la Google` (fara CSS).

### B3. Ads Transparency Center (advertiser)
`browser_navigate` la `https://adstransparency.google.com/?region=RO&query=<domeniu>` → vezi daca exista advertiser verificat si ce formate ruleaza (Search/Shopping/Display/YouTube).

### B4. Competitie (context, optional)
Cauta 1-2 termeni generici din nisa → vezi ce competitori apar in Shopping si daca au stele/CSS. Util pt framing "competitia face X, tu nu".

## Ce raportezi in audit din research
- "Ruleaza Google Shopping: DA/neconfirmat" (din B1/B3)
- "CSS folosit: <X> / fara CSS (CPC mai mare)" (din B2) → daca fara CSS, oportunitate dedicata
- "Segmentare produse: lipsa (presupus) → buget irosit pe Villains/Zombies" (A, mereu)
- daca research-ul e blocat (CAPTCHA/consent): "research live neconcludent, recomandam verificare in cont la discutie"

## Reguli
- Niciodata nu afirma cifre din contul lor (spend, ROAS) — nu le ai.
- Distinge clar: **confirmat din research** vs **oportunitate argumentata**.
- O singura sesiune Playwright, fereastra persistenta (vezi regulile globale browser).
