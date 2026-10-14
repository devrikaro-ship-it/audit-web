# Google Ads / Shopping — live research + product segmentation

The Ads section is always the strongest sales lever when prospecting. Two parts: **(A)** a standard finding about
product segmentation (always present), **(B)** live research with Playwright (best-effort).

## A. Product segmentation — ALWAYS in the audit

The premise (true for almost every shop we audit): **it runs Google Shopping without a performance segmentation
system** -> the budget is spread roughly evenly over the whole catalogue -> weak products eat money without selling.

Segmentation frame (ProductHero / Labelizer model):
| Type | Definition | Action |
|-----|-----------|---------|
| **Heroes** | high spend + high return | scale |
| **Sidekicks** | low spend + good return | under-exposed -> raise the budget |
| **Villains** | high spend + low or zero return | reduce / restructure |
| **Zombies** | no impressions or clicks | invisible, dead weight |

The message (in the audit, in client language, Romanian):
> "Ai N produse in Shopping. Fara separare pe performanta, bugetul se duce si pe produsele care nu vand (Villains + Zombies). Un sistem de etichetare (Heroes/Villains/Zombies) muta banii pe produsele care aduc comenzi — aceeasi investitie, mai multe vanzari."

This **always** goes in as a "Large" opportunity on the Ads page, whatever the research finds.

## B. Live research with Playwright (best-effort)

Goal: find out **whether** it runs Shopping and **with which tool / CSS**. Use the Playwright MCP (`browser_navigate`,
`browser_snapshot`, `browser_evaluate`). If Google shows consent or a CAPTCHA, or no PLAs appear, report "unconfirmed" —
do NOT invent.

### B1. Does it run Shopping? (a product search on Google)
1. Take 2–3 real product names from the site (from the collection step or the sitemap).
2. `browser_navigate` to `https://www.google.com/search?q=<product name>&tbm=shop` (or a normal search and look at the
   Shopping block).
3. Check whether Product Listing Ads (PLA) with the client's brand appear.
   - they appear -> it runs Shopping (confirm in the audit)
   - they do not -> "I did not see the products in Shopping when searching" (possibly not running / small budget /
     opportunity)

### B2. Which CSS / tool it uses — THE RIGHT METHOD: "De la X" in sponsored products
Do NOT use the Shopping tab (`tbm=shop` / `udm=28`) for the CSS — only the shop names appear there. The CSS shows on
**the normal Google search**, in the **"Produse sponsorizate"** block (paid PLAs), on the bottom line of each card:
**"De la <provider>"**.

1. `browser_navigate` to `https://www.google.com/search?q=<product name>&gl=ro&hl=ro` (normal search, NOT shop).
2. Extract the verdict with one deterministic function (run through `browser_evaluate`; replace `vegis` with the
   client's domain without `.ro`):
   ```js
   (() => {
     const CLIENT = 'vegis';   // <-- the client's name (without .ro)
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
       client_css: mine ? mine.css : 'NOT FOUND in PLA (possibly not running paid Shopping now)',
       fara_css: mine ? /google/i.test(mine.css) : null,   // true = "De la Google" = no real CSS
       toate: uniq
     };
   })()
   ```
3. Reading `client_css` for your client:
   - **`De la Google`** -> **no CSS** -> CPC up to about 20% higher = a clear opportunity; tell him what he loses.
   - **`De la TRUDA` / `De la Producthero` / `De la smec` / another name** -> **already uses a CSS** (TRUDA,
     ProductHero, smec and so on). Change the angle: not "activate a CSS" but optimisation + segmentation + stars.
   - If the client does not appear in the PLAs when searching -> possibly not running paid Shopping now (opportunity) or
     a small budget.
4. Bonus: see which CSS the competitors in the same block use -> comparative framing.

A real example (vegis.ro, June 2026): `Vegis.ro -> De la TRUDA`, `Esteto.ro -> De la Producthero`,
`Spring Farma -> De la Google` (no CSS).

### B3. Ads Transparency Center (advertiser)
`browser_navigate` to `https://adstransparency.google.com/?region=RO&query=<domain>` -> see whether a verified
advertiser exists and which formats run (Search / Shopping / Display / YouTube).

### B4. Competition (context, optional)
Search 1–2 generic terms of the niche -> see which competitors appear in Shopping and whether they have stars or a CSS.
Useful for the framing "the competition does X, you do not".

## What the audit reports from the research
- "Runs Google Shopping: YES / unconfirmed" (from B1/B3)
- "CSS used: <X> / no CSS (higher CPC)" (from B2) -> if no CSS, a dedicated opportunity
- "Product segmentation: missing (assumed) -> budget wasted on Villains/Zombies" (A, always)
- if the research is blocked (CAPTCHA / consent): "live research inconclusive, we recommend checking in the account at
  the meeting"

## Rules
- Never state figures from their account (spend, ROAS) — you do not have them.
- Distinguish clearly: **confirmed by research** vs **argued opportunity**.
- One Playwright session, a persistent window (see the global browser rules).
