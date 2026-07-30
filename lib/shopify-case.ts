// Cazul de migrare pe Shopify — traduce dovezile in bani. Spec: docs/MIGRARE-SPEC.md.
//
// PUR: nu atinge reteaua. Intra rezultatul motorului de audit (AuditData, exact cel
// care alimenteaza raportul RECE) + amprenta de platforma (PlatformEvidence), iese un
// caz cu leviere, scenarii si cost total. Fiind pur, e testabil si reproductibil.
//
// DOCTRINA (de ce arata asa):
// 1. Niciun levier nu exista fara o MASURATOARE pe site-ul lor. "Shopify e mai rapid"
//    nu e argument; "serverul tau raspunde in 1.503 ms, al lor in ~350 ms" e.
// 2. Efectele NU se inmultesc naiv. Doua imbunatatiri de +10% nu dau +21% pe acelasi
//    vizitator — se suprapun. Compunem cu randamente descrescatoare si plafonam.
// 3. Fiecare levier isi cara SURSA. Un raport de vanzare care citeaza e greu de atacat.
// 4. Ce nu am confirmat intra doar in scenariul optimist, marcat ca neconfirmat.
// 5. Exista si `tradeoffs` — ce PIERDE trecand pe Shopify. Un caz fara contra-argumente
//    citeste ca reclama, nu ca analiza, si primul consultant care il vede il demonteaza.

import type { AuditData } from "./types";
import type { PlatformEvidence } from "./platform-audit";
import { symOf } from "./currency";

// ── Referinte externe (citate in raport) ──
export const SOURCES = {
  deloitte: "Deloitte & Google, \"Milliseconds Make Millions\" (2020): +0,1 s viteza = +8,4% conversie in retail",
  baymard: "Baymard Institute: rata medie de abandon al cosului = 70,2%, din care ~22% pleaca din cauza checkout-ului lung/complicat",
  crux: "Google CrUX: pragul \"bun\" pentru raspunsul serverului e 800 ms, pentru afisarea paginii 2,5 s",
  shopPay: "Shopify: Shop Pay accelereaza finalizarea comenzii fata de un checkout clasic cu formular",
} as const;

// Referinta de viteza a platformei gazduite (conservator — Shopify livreaza din CDN global).
const SHOPIFY_TTFB_MS = 350;

// Plafoane per levier (crestere RELATIVA de conversie). Deliberat mici.
const CAP_SPEED = 0.12;
const CAP_CHECKOUT = 0.15;
const CAP_WEIGHT = 0.05;
const CAP_TRACKING = 0.06;
const CAP_UX = 0.08;
// Plafon global: oricat s-ar aduna levierele, nu promitem peste atat.
const CAP_TOTAL = 0.45;

// Saturatie: primul interval de imbunatatire conteaza cel mai mult, restul tot mai putin.
// k=1.0 => ~63% din plafon la 1 secunda castigata.
const saturate = (cap: number, x: number, k = 1.0) => cap * (1 - Math.exp(-k * Math.max(0, x)));

export type Confidence = "masurat" | "partial" | "neconfirmat";

export type Lever = {
  id: string;
  label: string;
  evidence: string;      // ce am masurat la ei
  mechanism: string;     // ce se schimba concret pe Shopify
  upliftPct: number;     // crestere relativa de conversie estimata (0.08 = +8%)
  confidence: Confidence;
  source?: string;
};

export type Scenario = {
  id: "conservator" | "probabil" | "optimist";
  label: string;
  convPct: number;        // rata de conversie rezultata
  revenueMonth: number;
  extraMonth: number;
  extraYear: number;
};

export type Tco = {
  currency: string;
  currentMonth: number;    // ce plateste acum (gazduire + extensii + mentenanta)
  shopifyMonth: number;    // abonament + aplicatii + comision procesare
  deltaMonth: number;      // + = Shopify costa mai mult pe luna
  migrationOneOff: number; // costul migrarii
  paybackMonths: number | null; // in cate luni se acopera din castig
  notes: string[];
};

export type ShopifyCase = {
  currency: string;
  convNowPct: number;
  usedMarketAverage: boolean;
  monthlyOrders: number | null;
  levers: Lever[];
  totalUpliftPct: number;
  scenarios: Scenario[];
  tco: Tco;
  tradeoffs: string[];
  verdict: "recomandat" | "de discutat" | "nerecomandat";
  verdictReason: string;
  assumptions: string[];
};

export type CaseInput = {
  convRatePct: number | null;  // din funnel; null = "nu stiu"
  aov: number;
  monthlyVisits: number | null;
  currency: string;
  // Costuri actuale declarate (optionale) — fara ele folosim medii de piata RO.
  hostingMonth?: number | null;
  pluginsMonth?: number | null;
  devMonth?: number | null;
};

const MARKET_CONV_PCT = 1.3;   // aceeasi referinta ca roi-sim.ts (consecventa intre rapoarte)
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round1 = (v: number) => Math.round(v * 10) / 10;
const roundTo = (v: number, step: number) => Math.round(v / step) * step;

// ── Leviere: fiecare porneste dintr-o masuratoare, altfel nu exista ──

function speedLever(ev: PlatformEvidence): Lever | null {
  const ttfb = ev.field?.ttfbMs ?? null;
  if (ttfb == null || ttfb <= SHOPIFY_TTFB_MS) return null;
  const gainedSec = (ttfb - SHOPIFY_TTFB_MS) / 1000;
  return {
    id: "viteza",
    label: "Serverul raspunde mai repede",
    evidence: `Serverul tau raspunde in ${Math.round(ttfb)} ms pentru utilizatorii reali (masurat de Google, ultimele 28 de zile).`,
    mechanism: `Pe o platforma gazduita, pagina vine din reteaua globala de servere — tipic ~${SHOPIFY_TTFB_MS} ms. Castig estimat: ~${gainedSec.toFixed(1)} s la fiecare vizita.`,
    upliftPct: saturate(CAP_SPEED, gainedSec),
    confidence: "masurat",
    source: SOURCES.deloitte,
  };
}

function weightLever(ev: PlatformEvidence): Lever | null {
  const kb = ev.lab?.weightKb ?? null;
  if (kb == null || kb < 3000) return null;
  const mb = kb / 1024;
  return {
    id: "greutate",
    label: "Pagini mai usoare pe mobil",
    evidence: `Prima pagina trage ${mb.toFixed(1)} MB si ${ev.stack.scriptCount} scripturi, din cauza temei si a extensiilor acumulate.`,
    mechanism: "Tema nativa livreaza doar codul folosit; nu se aduna straturi de la fiecare extensie instalata.",
    upliftPct: saturate(CAP_WEIGHT, (mb - 2) / 4),
    confidence: "masurat",
    // Fara sursa externa: e o consecinta directa a levierului de viteza, deja citat.
    // O sursa despre praguri de viteza NU sustine o afirmatie despre greutate — un
    // client care deschide linkul si nu gaseste ce am spus pierde increderea in tot raportul.
  };
}

function checkoutLever(ev: PlatformEvidence): Lever {
  const confirmed = ev.checkout.walletsSeen.some((w) => /Apple Pay|Google Pay|Shop Pay/.test(w)) || ev.checkout.expressCheckout;
  if (confirmed) {
    return {
      id: "checkout",
      label: "Finalizare rapida a comenzii",
      evidence: "Ai deja o forma de plata rapida activa.",
      mechanism: "Castigul din acest capitol e mic — checkout-ul tau nu e problema principala.",
      upliftPct: 0.02,
      confidence: "masurat",
      source: SOURCES.baymard,
    };
  }
  return {
    id: "checkout",
    label: "Finalizare rapida a comenzii (Shop Pay / Apple Pay / Google Pay)",
    evidence: "Nu am putut confirma din exterior o metoda de plata rapida — se vad de obicei abia in pasul de plata.",
    mechanism: "Checkout-ul Shopify vine cu plata intr-un pas si date completate automat pentru cumparatorii recunoscuti, fara plugin.",
    upliftPct: CAP_CHECKOUT * 0.6, // neconfirmat -> nu luam plafonul intreg
    confidence: "neconfirmat",
    source: SOURCES.baymard,
  };
}

function trackingLever(audit: AuditData): Lever | null {
  const c = audit.conversie;
  if (!c) return null;
  // scorPpc = cat de pregatita e masurarea (0-100), calculat de motorul de audit.
  if (c.scorPpc >= 80) return null;
  const gap = (80 - c.scorPpc) / 80;
  return {
    id: "masurare",
    label: "Masurare corecta a vanzarilor",
    evidence: `Auditul a gasit lipsuri in masurare (scor de pregatire ${c.scorPpc}/100).`,
    mechanism: "Evenimentele de magazin (vizualizare produs, adaugare in cos, comanda) sunt native si nu depind de un plugin de tracking configurat manual.",
    upliftPct: CAP_TRACKING * gap,
    confidence: "partial",
  };
}

function uxLever(audit: AuditData): Lever | null {
  const ux = audit.ux;
  if (!ux || ux.scor >= 70) return null;
  const weak = ux.fields.filter((f) => f.status === "slab").map((f) => f.label);
  const gap = (70 - ux.scor) / 70;
  return {
    id: "ux",
    label: "Experienta pe paginile care vand",
    evidence: weak.length
      ? `Auditul a punctat slab: ${weak.join(", ")} (scor UX ${ux.scor}/100).`
      : `Scor UX ${ux.scor}/100 in auditul paginilor de categorie si produs.`,
    mechanism: "Temele Shopify vin cu grila de produse, filtre, galerie si pagina de produs deja rezolvate, testate pe mobil.",
    upliftPct: CAP_UX * gap,
    confidence: "masurat",
  };
}

export function buildLevers(audit: AuditData, ev: PlatformEvidence): Lever[] {
  return [speedLever(ev), weightLever(ev), checkoutLever(ev), trackingLever(audit), uxLever(audit)]
    .filter((l): l is Lever => l !== null && l.upliftPct > 0);
}

// Compunere cu suprapunere: levierele actioneaza pe acelasi vizitator, deci nu se aduna.
// Compunem multiplicativ si taiem la plafonul global.
export function combineUplift(levers: Lever[], include: (l: Lever) => boolean): number {
  const total = levers.filter(include).reduce((acc, l) => acc * (1 + l.upliftPct), 1) - 1;
  return Math.min(total, CAP_TOTAL);
}

// ── Cost total: ce platesti acum vs pe Shopify ──
// Medii de piata RO (2026), folosite doar cand clientul nu declara cifrele lui.
const DEFAULT_HOSTING_MONTH = 150;   // gazduire decenta pentru un magazin cu trafic
const DEFAULT_PLUGINS_MONTH = 250;   // licente anuale de extensii, raportate lunar
const DEFAULT_DEV_MONTH = 400;       // interventii/mentenanta, mediat pe an
const SHOPIFY_PLAN_MONTH = 400;      // abonament (plan mediu, facturat anual)
const SHOPIFY_APPS_MONTH = 200;      // aplicatii uzuale (recenzii, feed, abonamente)
const MIGRATION_ONE_OFF = 12000;     // migrare completa: tema, produse, redirectari, tracking

function buildTco(input: CaseInput, extraMonth: number): Tco {
  const cur = input.currency;
  const hosting = input.hostingMonth ?? DEFAULT_HOSTING_MONTH;
  const plugins = input.pluginsMonth ?? DEFAULT_PLUGINS_MONTH;
  const dev = input.devMonth ?? DEFAULT_DEV_MONTH;
  const currentMonth = hosting + plugins + dev;
  const shopifyMonth = SHOPIFY_PLAN_MONTH + SHOPIFY_APPS_MONTH;
  const deltaMonth = shopifyMonth - currentMonth;

  // Castigul net lunar = venit suplimentar estimat - diferenta de cost.
  const netGain = extraMonth - deltaMonth;
  const paybackMonths = netGain > 0 ? Math.ceil(MIGRATION_ONE_OFF / netGain) : null;

  const declared = input.hostingMonth != null || input.pluginsMonth != null || input.devMonth != null;
  return {
    currency: cur,
    currentMonth: roundTo(currentMonth, 10),
    shopifyMonth: roundTo(shopifyMonth, 10),
    deltaMonth: roundTo(deltaMonth, 10),
    migrationOneOff: MIGRATION_ONE_OFF,
    paybackMonths,
    notes: [
      declared
        ? "Costurile actuale sunt cele declarate de tine."
        : `Costurile actuale sunt medii de piata (gazduire ${hosting} + extensii ${plugins} + mentenanta ${dev} ${symOf(cur)}/luna). Inlocuieste-le cu cifrele tale.`,
      "Comisionul de procesare a platilor ramane similar — se plateste si acum procesatorului.",
      "Abonamentul Shopify include gazduire, certificat, actualizari si securitate, care acum se platesc separat.",
    ],
  };
}

const TRADEOFFS = [
  "Comision Shopify pe tranzactie daca nu folosesti Shopify Payments (in Romania, procesarea ramane la un procesator local).",
  "Mai putin control pe cod: nu poti modifica orice, cum se poate pe un magazin propriu.",
  "Costul aplicatiilor se aduna lunar; functii care acum sunt un plugin platit o data pot deveni abonament.",
  "Migrarea cere redirectari 1:1 pe toate adresele, altfel pierzi pozitiile castigate in Google.",
  "Continutul si personalizarile facute in ani pe tema actuala se refac, nu se muta automat.",
];

export function buildShopifyCase(audit: AuditData, ev: PlatformEvidence, input: CaseInput): ShopifyCase {
  const usedMarketAverage = input.convRatePct == null || !Number.isFinite(input.convRatePct) || input.convRatePct <= 0;
  const convNow = usedMarketAverage ? MARKET_CONV_PCT : clamp(input.convRatePct as number, 0.1, 5);

  const levers = buildLevers(audit, ev);

  // Trei scenarii = trei criterii de includere a levierelor, nu trei cifre inventate.
  const upliftConservator = combineUplift(levers, (l) => l.confidence === "masurat") * 0.6;
  const upliftProbabil = combineUplift(levers, (l) => l.confidence !== "neconfirmat");
  const upliftOptimist = combineUplift(levers, () => true);

  const orders = input.monthlyVisits != null && input.monthlyVisits > 0
    ? Math.round((input.monthlyVisits * convNow) / 100)
    : null;
  const revenueNow = orders != null ? orders * input.aov : 0;

  const mk = (id: Scenario["id"], label: string, uplift: number): Scenario => {
    const convPct = round1(convNow * (1 + uplift));
    const revenueMonth = orders != null ? roundTo(revenueNow * (1 + uplift), 10) : 0;
    const extraMonth = orders != null ? roundTo(revenueMonth - revenueNow, 10) : 0;
    return { id, label, convPct, revenueMonth, extraMonth, extraYear: roundTo(extraMonth * 12, 50) };
  };

  const scenarios: Scenario[] = [
    mk("conservator", "Conservator — doar ce am masurat direct", upliftConservator),
    mk("probabil", "Probabil — masurat + partial confirmat", upliftProbabil),
    mk("optimist", "Optimist — include si ce ramane de confirmat", upliftOptimist),
  ];

  const tco = buildTco(input, scenarios[1].extraMonth);

  // Verdictul NU e automat "migreaza". Daca platforma nu e cauza, o spunem.
  const structural = ev.findings.filter((f) => f.structural && f.verdict !== "ok").length;
  let verdict: ShopifyCase["verdict"];
  let verdictReason: string;
  if (!ev.migrationCandidate) {
    verdict = "nerecomandat";
    verdictReason = "Magazinul nu ruleaza pe o platforma pe care sa aiba sens sa o inlocuim cu Shopify.";
  } else if (structural >= 2 && upliftProbabil >= 0.1) {
    verdict = "recomandat";
    verdictReason = `Am gasit ${structural} probleme care tin de platforma, nu de setari — se rezolva prin mutare, nu prin optimizari.`;
  } else if (structural >= 1) {
    verdict = "de discutat";
    verdictReason = "O parte din probleme tin de platforma, dar altele se pot repara si pe stackul actual. Merita comparat cu varianta de optimizare pe loc.";
  } else {
    verdict = "nerecomandat";
    verdictReason = "Problemele gasite se pot repara pe platforma actuala. O migrare ar costa fara sa rezolve ceva ce optimizarea nu rezolva.";
  }

  return {
    currency: input.currency,
    convNowPct: round1(convNow),
    usedMarketAverage,
    monthlyOrders: orders,
    levers,
    totalUpliftPct: Math.round(upliftProbabil * 100),
    scenarios,
    tco,
    tradeoffs: TRADEOFFS,
    verdict,
    verdictReason,
    assumptions: [
      usedMarketAverage
        ? `Rata de conversie de pornire = media pietei (~${MARKET_CONV_PCT}%), pentru ca nu ai stiut-o.`
        : `Rata de conversie de pornire = cea declarata de tine (${round1(convNow)}%).`,
      input.monthlyVisits == null
        ? "Fara numarul de vizite lunare nu putem calcula suma in bani — apar doar procentele."
        : `Calculat la ${input.monthlyVisits} vizite pe luna si comanda medie ${input.aov} ${symOf(input.currency)}.`,
      `Referinta de viteza pentru platforma gazduita: ~${SHOPIFY_TTFB_MS} ms raspuns server.`,
      "Estimare orientativa, plafonata conservator. Cifra exacta se poate calcula doar cu acces la GA4.",
    ],
  };
}
