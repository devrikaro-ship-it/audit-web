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
};

export default function ReportPreview() {
  return <ReportRenderer data={MOCK_DATA} />;
}
