# Audit CALD (intern) — playbook complet

Se ruleaza cand **avem acces la conturile clientului**. Spre deosebire de modul rece (semnale publice, persuasiv), aici tragi **date reale** din fiecare instrument si raportezi tot ce e in neregula, direct, pentru echipa. Zero inventat.

## Regula 0 — concluzia care leaga tot
Aproape la fiecare cont mostenit, firul rosu e acelasi: **tracking-ul de conversii e poluat -> ROAS-ul raportat e fictiv -> biddingul optimizeaza pe gunoi.** Restul (structura haotica, obiective gresite, buget frimitat) sunt simptome. Deci **valideaza intai masurarea**, abia apoi judeca performanta. Nu lua nicio decizie de kill/scale pe cifre nevalidate.

## Surse per instrument (ce tragi)

### 1. Google Ads (acces MCC `2899051145`)
Scripturi in `clients/`, venv `~/.claude/skills/seo/.venv/bin/python`, config `~/.config/claude-seo/google-ads.yaml`.
- `gads_account_check.py --customer <id> --client <slug>` -> conversii (lista + categorie + primary), auto-tagging, liste negative, audiente, brand [BP], tipuri de creative.
- `gads_winners.py --customer <id> --client <slug> --date <YYYY-MM-DD> --days 365` -> toate campaniile (orice status), bidding, buget, cost, conv, ROAS, CPA.
- `gads_kw_audit.py` / `gads_search_terms.py` / `gads_keywords.py` -> waste pe search terms + negative/pozitive in-catalog.

**Ce cauti (semnale de problema):**
- **Conversii poluate (P1):** primary care NU e Purchase — PAGE_VIEW (`first_visit`!), CONTACT/click-to-call, ADD_TO_CART, BEGIN_CHECKOUT, SUBMIT_LEAD_FORM, ENGAGEMENT, YouTube. La ecom, primary = DOAR Purchase real (+ apeluri reale `PHONE_CALL_LEAD` din surse distincte, value FIX = AOV cont din GA4 rotunjit la 50). Tot restul -> secondary. (greseala recurenta: veryfix 11/18 primary gresite; mansarda 7 primary gresite incl. first_visit).
- **Fara campanie brand `[BP]`** -> concurentii liciteaza pe brand, platesti scump traficul propriu.
- **Bidding gresit pe PMax:** MAXIMIZE_CONVERSIONS plain in loc de MAXIMIZE_CONVERSION_VALUE + tROAS. PMax tROAS bate MC peste tot.
- **Campanii interzise active:** Demand Gen, Display standalone, TARGET_SPEND, Shopping/PMax pe MANUAL_CPC vechi -> kill.
- **Cimitir de teste:** zeci de campanii, winneri pe PAUSED in timp ce loseri ENABLED, naming haotic (STAR/SEEDLING/ZOMBIE).
- **Liste negative fragmentate:** mai multe liste, unele REMOVED/orfane, in loc de 1 lista la nivel cont. Verifica si ca negativele existente nu blocheaza produse vandute (verifica contra feed+site).
- **Ad-uri moarte:** EXPANDED_TEXT_AD, EXPANDED_DYNAMIC_SEARCH_AD, TEXT_AD, RESPONSIVE_DISPLAY_AD legacy.
- **Fara fisa/target:** lipsa `optimization-rules.json` -> ruleaza cu target 0 -> kill/scale fara prag. Trimite la `client-intake`.
- OK de pastrat: auto-tagging ON, audiente retargeting populate, winneri reali (de re-validat pe Purchase-only).

### 2. Meta Ads (token System User `~/.config/meta-ads/token`)
```
python scripts/meta_pull.py <act_id_sau_act_xxx>
```
Scoate: cont (nume/status/spend lifetime), campanii (obiectiv + bid + status + buget), pixeli (+ last_fired), insights campanie cu purchase/value/ROAS pe maximum + last_30d. Merge si cand **MCP e dezactivat** pe cont (Graph API direct).

**Ce cauti:**
- **ROAS umflat (P1):** blended absurd (zeci-sute), campanii cu ROAS 100-4000 si CPA de cativa lei pe produs scump = atribuire view-through pe reach mare+ieftin. Meta isi asuma vanzari aduse de Google/organic. **Nu decide pe ROAS-ul din Ads Manager** — vezi cross-check GA4.
- **Pixeli straini pe cont:** alt brand/alt domeniu atasat -> contaminare atribuire -> detaseaza.
- **Obiective gresite (la ecom):** LINK_CLICKS (trafic), OUTCOME_ENGAGEMENT, OUTCOME_AWARENESS, MESSAGES, CONVERSIONS legacy. Ecom = DOAR OUTCOME_SALES optimizat pe Purchase.
- **Structura boosted-posts:** campanii "Post: ..." promovate din pagina, fara campanie/adset/ad propriu, fara CBO, fara DPA structurat. Stack corect: OUTCOME_SALES + CBO + Highest Volume + Purchase + broad/Advantage+ + DPA All Products (catalog = parghie la produs tehnic).
- **Buget frimitat:** 5-25 lei/zi imprastiat -> learning phase permanent (high-AOV are nevoie ~50 purchase/sapt/adset).
- **Creative sub-investit / catalog stricat:** 1 reclama activa, DPA cu `{{product.name}}` gol -> feed catalog stricat. Fara video/UGC, fara min 2-4 ad-uri/adset.
- **Reziduu de management strain:** campanii in alta limba, tool-uri externe (Madgicx), naming auto/date -> igiena + naming Devrika + UTM `utm_source=facebook&utm_medium=cpc`.
- **De verificat in UI (nu din API):** EMQ/match quality + dedup web<->CAPI (Events Manager), sanatatea reala a feedului catalog.

### 3. GA4 — cross-check (sursa de adevar pe canale)
`clients/ga4_pull.py` / `clients/ga4_ecom.py` (OAuth claude-seo). Trage purchase real pe `sessionSourceMedium`.
- **Confrunta:** ROAS Meta raportat vs purchase real din `facebook/cpc`; ROAS Google vs `google/cpc`. Diferenta mare pe Meta = atribuire umflata (Meta e canal slab, CR real ~0.4-0.5%).
- Top categorii/produse care vand cu adevarat (parghia) + orase/age/gender pt targetare.
- 0-in-Ads dar vinde in GA4 = oportunitate.

### 4. SEO / site (daca e in scop)
- `/seo` engine (audit tehnic profund) sau `collect.py` pe site.
- **GSC** (token webmasters): indexare, query-uri organice, CWV field.
- **GMC**: feed errors, Misrepresentation, preturi/availability nealiniate (vezi `WooCommerce-Optimisation-Devrika/optimizari/MISREPRESENTATION.md`).

## ECOM vs LEADS (nu confunda)
- **ECOM** -> optimizezi pe ROAS/valoare. Primary = Purchase. PMax Value+tROAS + Shopping TARGET_ROAS + Search [BP]. Meta = OUTCOME_SALES + catalog.
- **LEADS** (clinici/scoli/servicii) -> optimizezi pe CPA, ROAS=0. Primary = form/call, NU page_view. Search-only, fara Shopping/PMax catalog. **Scalare OFF.** Meta = OUTCOME_LEADS cu formular calificat.
Detecteaza tipul din GA4 (are tranzactii? -> ecom) inainte de a judeca.

## Structura raportului cald (output)
1. **Concluzia care leaga tot** (Regula 0, pe cazul concret).
2. **Per canal, numerotat:** fiecare problema cu `problema -> impact -> fix`, prioritate marcata (P1 = tracking).
3. **Plan ordonat:** tracking intai (ambele canale), apoi structura, apoi fundatie (fisa/target).
4. **Ce NU s-a putut verifica** (cere acces/pas suplimentar) — listat explicit.
Salveaza in `clients/{client}/AUDIT-{data}.md`. Adauga rand in `clients/CLIENTS.md` daca e client nou.

### Output VIZUAL (versiune de prezentat) — `scripts/warm_report.py`
Cand vrei raportul ambalat (brand Devrika, de aratat clientului), scrie datele in `clients/{client}/audit-visual.json` si ruleaza generatorul. Schema:
- baza: client/date/subtitle/verdict[HTML]/targets{cpa,troas,aov,business,business_l}/channels[]{name,state(bun|mediu|slab),verdict,score(0-100→bara sanatate),kpis[]{v,l,color},note}/google[],meta[] findings{sev=critic|mediu|info|ok, meta, title, problema, fix}/plan[]{t,d}
- **persuasiune (audit cald = client poate verifica → adevar irefutabil, NU hype):**
  - `gun{strike,left_lab,left,left_sub,vs,right_lab,right,right_sub,note[HTML]}` = cifra-bomba sus de tot. strike:true = minciuna taiata (platforma vs GA4, ex Mansarda ROAS228→0lei); strike:false = dezechilibru/oportunitate (ex Modlet Meta 96k vs Google 1k).
  - `opportunity{h,v,b[HTML]}` = banii pe masa, cuantificat cu interval + asumare marcata `<span class='est'>...</span>` (estimativ, NU promisiune).
  - `proof[]` (chips HTML) = rezultate cu acelasi sistem pe alte conturi Devrika (din playbook: veryfix/epilare PMax tROAS, Search brand ROAS) — credibilitate verificabila.
  - `quickwins[]{t,d}` = primii pasi saptamana 1 (efect imediat).
Ruleaza:
`python scripts/warm_report.py clients/{client}/audit-visual.json clients/{client}/AUDIT-{data}.html`
HTML self-contained (Sora+Inter, dark hero navy/cyan, carduri lizibile pe canale, plan numerotat). PDF: Chrome headless `--print-to-pdf` (`--no-pdf-header-footer`). Contine linie de metodologie ("evaluat vs standardul Devrika"). Prima reutilizare: Modlet + Mansarda (30-06).

## Reguli (NU le incalca)
- Date reale, zero inventat. Ce n-ai tras = "de verificat", nu afirmat.
- Nu te incred in ROAS raportat de platforma pana nu validezi conversiile + cross-check GA4.
- Nu modifici nimic in conturi — auditul e READ-ONLY. Actiunile vin separat, cu confirmare (skill-urile *-optimize).
- Ton direct/tehnic (intern), NU persuasivul de la rece. Daca clientul cere varianta de prezentat, abia atunci ambalezi cu build.py/PDF.
