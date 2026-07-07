"use client";

import { ReportRenderer } from "@/components/report-renderer";
import type { AuditData } from "@/lib/types";

const MOCK_DATA: AuditData = {
  url: "https://diente.ro",
  domain: "diente.ro",
  pagesAnalyzed: 50,
  scor: 47,
  checksRezultate: {
    // Viteza
    pagespeed_mobile:   { status: "critic",  value: "34 / 100" },
    pagespeed_desktop:  { status: "atentie", value: "61 / 100" },
    lcp:                { status: "critic",  value: "4.2s" },
    cls:                { status: "ok",      value: "0.04" },
    inp:                { status: "atentie", value: "310ms" },
    // Schema
    schema_markup:      { status: "ok",      value: "LocalBusiness, Organization" },
    schema_tipuri:      { status: "atentie", value: "Lipseste price si availability" },
    schema_validare:    { status: "ok",      value: "Fara erori de validare" },
    schema_breadcrumbs: { status: "critic",  value: "Lipseste BreadcrumbList" },
    schema_rating:      { status: "critic",  value: "Nicio schema AggregateRating" },
    // Social
    og_tags:            { status: "ok",      value: "og:title si og:description prezente" },
    og_image:           { status: "critic",  value: "og:image lipseste" },
    twitter_card:       { status: "critic",  value: "Lipseste" },
    favicon:            { status: "ok",      value: "Prezent" },
    apple_icon:         { status: "atentie", value: "apple-touch-icon lipsa" },
    // Securitate
    https:              { status: "ok",      value: "Activ" },
    imagini_alt:        { status: "critic",  value: "11 imagini fara alt" },
    imagini_optimizate: { status: "critic",  value: "8 imagini neoptimizate" },
    hsts:               { status: "atentie", value: "Header HSTS absent" },
    security_headers:   { status: "atentie", value: "X-Frame-Options lipsa" },
  },
  seoChecks: [
    { id: "title_tag",      label: "Title Tag",        correctCount: 42, total: 50, problema: "8 pagini au title tag lipsa sau mai lung de 60 caractere.", fix: "Adauga un title tag unic pe fiecare pagina, intre 50-60 caractere, cu keyword-ul principal la inceput." },
    { id: "meta_description",label: "Meta Description",correctCount: 18, total: 50, problema: "32 de pagini nu au meta description sau il au duplicat.", fix: "Scrie o meta description unica pentru fiecare pagina, 150-160 caractere, cu un call-to-action clar." },
    { id: "h1",             label: "Heading H1",       correctCount: 45, total: 50, problema: "5 pagini au H1 lipsa sau mai mult de un H1.", fix: "Asigura-te ca fiecare pagina are exact un H1 care include keyword-ul principal." },
    { id: "canonical_tags", label: "Tag Canonical",    correctCount: 32, total: 50, problema: "18 pagini nu au tag canonical definit.", fix: "Adauga <link rel='canonical'> pe fiecare pagina, indicand URL-ul preferat." },
    { id: "url_structure",  label: "Structura URL",    correctCount: 47, total: 50, problema: "3 pagini au URL-uri cu parametri sau caractere speciale.", fix: "Foloseste URL-uri curate cu slug-uri descriptive." },
  ],
  continutChecks: [
    { id: "lungime_continut", label: "Lungime continut",         correctCount: 31, total: 50, problema: "19 pagini au sub 400 de cuvinte.", fix: "Extinde paginile subtiri la minimum 600 cuvinte." },
    { id: "cuvinte_cheie",    label: "Cuvinte cheie relevante",  correctCount: 22, total: 50, problema: "28 de pagini nu contin keyword-ul principal in H1.", fix: "Introduce keyword-ul principal in primele 100 cuvinte si in cel putin un H2." },
    { id: "structura_headings",label: "Structura H2/H3",        correctCount: 38, total: 50, problema: "12 pagini nu au H2 sau H3 definite corect.", fix: "Structureaza continutul cu H2 pentru sectiuni principale." },
    { id: "faq_autoritate",   label: "FAQ si elemente autoritate",correctCount: 8, total: 50, problema: "42 de pagini nu au sectiune FAQ.", fix: "Adauga o sectiune FAQ cu 3-5 intrebari reale." },
    { id: "continut_unic",    label: "Continut unic",            correctCount: 44, total: 50, problema: "6 pagini au blocuri de text identice.", fix: "Rescrie descrierile duplicate." },
  ],
  keywordsChecks: [
    { id: "kw_in_title",          label: "Keyword in Title Tag",     correctCount: 32, total: 50, unit: "kw", problema: "18 cuvinte cheie din top 50 nu apar in title tag.", fix: "Rescrie title tag-ul paginilor fara keyword." },
    { id: "kw_in_h1",             label: "Keyword in H1",            correctCount: 38, total: 50, unit: "kw", problema: "12 cuvinte cheie nu apar in H1-ul paginii tinta.", fix: "Asigura-te ca H1-ul contine keyword-ul principal." },
    { id: "kw_in_url",            label: "Keyword in URL",           correctCount: 28, total: 50, unit: "kw", problema: "22 pagini au URL-uri care nu reflecta cuvantul cheie.", fix: "Restructureaza URL-urile sa contina keyword-ul." },
    { id: "kw_categorii",         label: "Kw acoperit de categorii", correctCount: 14, total: 50, unit: "kw", problema: "36 din top 50 kw nu au o pagina de categorie dedicata.", fix: "Creeaza pagini de categorie pentru grupele principale de kw." },
    { id: "kw_fara_canibalizare", label: "Fara canibalizare kw",     correctCount: 41, total: 50, unit: "kw", problema: "9 cuvinte cheie sunt targetate simultan de 2+ pagini.", fix: "Alege o pagina principala pentru fiecare keyword." },
  ],
  structuraChecks: [
    { id: "robots_llm",      label: "robots.txt & LLM crawlere", correctCount: 3,  total: 6,  unit: "crawlere", problema: "robots.txt blocheaza crawlerii LLM.", fix: "Adauga reguli Allow pentru GPTBot, ClaudeBot, PerplexityBot." },
    { id: "sitemap_xml",     label: "Sitemap XML",               correctCount: 2,  total: 4,  unit: "criterii", problema: "Sitemap-ul exista dar nu are date lastmod si nu a fost trimis in GSC.", fix: "Adauga lastmod si trimite sitemap-ul in Google Search Console." },
    { id: "breadcrumbs",     label: "Breadcrumbs",               correctCount: 12, total: 50, problema: "38 de pagini nu au breadcrumbs vizibile.", fix: "Adauga breadcrumbs pe toate paginile de categorie si produs." },
    { id: "broken_links",    label: "Linkuri broken",            correctCount: 48, total: 50, problema: "2 pagini contin linkuri interne 404.", fix: "Corecteaza sau redirectioneaza (301) linkurile rupte." },
    { id: "internal_linking",label: "Internal linking",          correctCount: 31, total: 50, problema: "19 pagini nu primesc suficiente linkuri interne.", fix: "Adauga 3-5 linkuri interne relevante pe fiecare pagina importanta." },
  ],
  conversie: {
    isEcom: true,
    ruleazaReclame: "da",
    scorPpc: 60,
    leaks: [
      { id: "ga4",      label: "Google Analytics 4",   zona: "Tracking & PPC", present: "da",  pierdere: "Fara GA4 nu stii ce pagini aduc vanzari.", fix: "Instalam GA4 cu evenimente de ecommerce.", positiv: "Detectat activ — masori traficul si comportamentul pe site." },
      { id: "ads_conv", label: "Google Ads conversii",  zona: "Tracking & PPC", present: "nu",  pierdere: "Fara conversii, Google liciteaza orbeste — irosesti buget.", fix: "Conectam conversia de achizitie in Google Ads." },
      { id: "pixel",    label: "Meta Pixel",            zona: "Tracking & PPC", present: "da",  pierdere: "Fara Pixel nu poti face remarketing pe Facebook/Instagram.", fix: "Instalam Meta Pixel + Conversions API.", positiv: "Detectat activ — poti masura si face retargeting pe Meta." },
      { id: "tiktok",   label: "TikTok Pixel",          zona: "Tracking & PPC", present: "necunoscut", pierdere: "Nu am putut confirma TikTok Pixel.", fix: "Verificam si instalam TikTok Pixel daca lipseste." },
      { id: "consent",  label: "Consent Mode v2",       zona: "Tracking & PPC", present: "nu",  pierdere: "Fara Consent Mode pierzi date de conversie in UE.", fix: "Configuram Consent Mode v2 cu bannerul de cookies." },
      { id: "mobile",   label: "Experienta pe mobil",   zona: "UX & Mobil",     present: "nu",  pierdere: "70% din trafic e pe mobil — un mobil greoi pierde vanzari.", fix: "Optimizam viteza si layout-ul pe mobil." },
      { id: "filters",  label: "Filtre pe categorii",   zona: "Functii magazin",present: "nu",  pierdere: "Fara filtre, clientul nu gaseste rapid produsul si pleaca.", fix: "Implementam filtre (marime, culoare, pret, brand)." },
      { id: "search",   label: "Cautare pe site",       zona: "Functii magazin",present: "da",  pierdere: "Cautarea slaba inseamna cosuri abandonate.", fix: "Imbunatatim cautarea cu sugestii." },
      { id: "related",  label: "Produse similare",      zona: "Functii magazin",present: "nu",  pierdere: "Fara produse similare pierzi vanzari incrucisate.", fix: "Adaugam sectiune de produse similare pe pagina produs." },
      { id: "product_info", label: "Info produs complet", zona: "Functii magazin", present: "da", pierdere: "Info incomplet = incredere scazuta = mai putine comenzi.", fix: "Completam pret, stoc, descriere, recenzii." },
    ],
  },
  googleAds: {
    css: { status: "google_css", provider: "Google", matchedSeller: "diente.ro", tilesSeen: 6, message: "Rulezi Google Shopping prin CSS-ul Google, nu printr-un partener CSS. In practica platesti pana la ~20% mai mult pe fiecare click decat un concurent care ruleaza printr-un CSS partener." },
    shopping: {
      present: true,
      prospectPrice: 139,
      currency: "RON",
      totalAdvertisers: 4,
      competitors: [
        { seller: "emag.ro",      css: "smec",   price: 129 },
        { seller: "farmacia-x.ro",css: "Google", price: 149 },
        { seller: "dentmarket.ro",css: "Kelkoo", price: 119 },
      ],
      message: "Apari in Google Shopping alaturi de 3 concurenti pe produsele tale. Doi dintre ei ruleaza printr-un CSS partener — deci platesc mai putin pe click decat tine.",
    },
    pricePosition: {
      status: "pricier", prospectPrice: 139, competitorAvg: 129, currency: "RON", deltaPct: 8,
      message: "Pe produsele verificate esti orientativ cu ~8% mai scump decat media concurentei din Shopping (~129 RON). La cautari unde cumparatorul compara pretul, pierzi clicul catre cel mai ieftin.",
    },
    brandDefense: {
      status: "contested", competitors: ["farmacia-x.ro", "dentmarket.ro"],
      message: "Am gasit 2 concurenti care apar pe cautarea numelui tau de brand (farmacia-x.ro, dentmarket.ro). Iti iau clicuri de la clienti care te cautau pe tine — iti aperi brandul cu o campanie de brand.",
    },
    gbpReviews: {
      status: "found", rating: 4.1, count: 87,
      message: "Profilul tau Google are 4.1 stele (87 recenzii) — sub pragul care inspira incredere. Recenziile slabe scad rata de click, inclusiv la reclame.",
    },
  },
  ux: {
    scor: 58,
    fields: [
      { id: "viteza", label: "Viteza pe mobil", status: "slab", scor: 34, gasit: [], lipsa: ["scor PageSpeed 34/100", "LCP 4.2s"], problema: "Fiecare secunda in plus la incarcare inseamna pana la -7% conversii. Pe trafic platit, e buget aruncat direct.", fix: "Optimizam imaginile, scripturile si serverul pentru incarcare sub 2.5s pe mobil." },
      { id: "home", label: "Analiza homepage", status: "bun", scor: 100, gasit: ["mesaj / hero clar (H1)", "meniu de navigare", "categorii si cai spre produse", "adaptat pentru mobil"], lipsa: [], problema: "Homepage-ul e prima impresie.", fix: "Refacem homepage-ul." },
      { id: "categorie", label: "Analiza pagina categorie", status: "partial", scor: 50, gasit: ["grila de produse cu poza si pret", "breadcrumbs (stii unde esti)"], lipsa: ["fara paginare vizibila", "fara text de intro (pierzi si SEO)"], problema: "Pagina de categorie e locul unde clientul alege. Fara grila clara, breadcrumbs si text de context, se pierde si pleaca.", fix: "Structuram pagina de categorie: grila poza+pret, breadcrumbs, paginare, text de intro optimizat." },
      { id: "produs", label: "Analiza pagina produs", status: "slab", scor: 33, gasit: ["imagini multiple", "pret + stoc"], lipsa: ["buton de comanda greu de gasit", "descriere subtire", "fara recenzii pe produs", "fara produse similare"], problema: "Pagina de produs e locul deciziei de cumparare. Imagini, pret, stoc, buton clar, descriere, recenzii si recomandari — fiecare care lipseste scade comenzile.", fix: "Completam pagina de produs: galerie, pret+stoc vizibil, buton clar, descriere, recenzii, produse similare." },
      { id: "filtre", label: "Filtre & sortare", status: "necunoscut", scor: 0, gasit: [], lipsa: ["nu am prins acest tip de pagina in crawl"], problema: "Catalog fara filtre si sortare = clientul nu-si gaseste rapid produsul si pleaca.", fix: "Implementam filtre (marime, culoare, pret, brand) + sortare pe categorii." },
    ],
  },
  productSignal: {
    checked: 24,
    weakTitles: 17,
    missingMeta: 20,
    hasFeed: true,
    headline: "Produsele tale nu sunt optimizate pentru Google Shopping si cautare",
    message: "Am verificat 24 pagini de produs si 17 au titluri scurte sau generice iar 20 nu au descriere — exact textele pe care Google le foloseste ca sa decida pe ce cautari iti arata produsele. Titlurile si descrierile slabe inseamna ca produsele apar mai rar in Shopping si in cautare decat ar putea, chiar cu buget de reclama. Ai un feed de produse, dar titlurile si descrieriile din el conteaza la fel de mult ca existenta lui. Cu titluri, descrieri si feed optimizate acelasi catalog aduce mai multe afisari si clicuri, fara buget suplimentar.",
  },
  roiSim: {
    input: { adBudget: 7500, aov: 275, convRatePct: 1.5, currency: "RON" },
    currency: "RON",
    usedMarketAverage: false,
    convNowPct: 1.5,
    convGoalPct: 2.2,
    cpcReductionPct: 12,
    roasNow: 1.8,
    roasGoal: 3,
    cpaNow: 150,
    cpaGoal: 90,
    revenueNow: 13750,
    revenueGoal: 22900,
    extraRevenueMonth: 9150,
    extraRevenueYear: 109800,
    assumptions: [
      "Cost pe click de referinta ~2.2 lei (medie ecom).",
      "Conversie de pornire = ce ai raspuns (1.5%).",
      "Reducere de cost pe click ~12% presupusa dintr-un CSS partener.",
      "Estimare orientativa. Cifra exacta doar cu acces la cont (GA4 / Google Ads).",
    ],
  },
};

export default function ReportPreview() {
  return <ReportRenderer data={MOCK_DATA} />;
}
