// Amprenta de PLATFORMA a magazinului — stratul de dovezi al raportului de migrare.
// Spec: docs/MIGRARE-SPEC.md. Raspunde la o singura intrebare: "ce anume din ce vede
// clientul lui e cauzat de platforma pe care sta?".
//
// ONESTITATE (invariantul §5.1 din AUDIT-SPEC, valabil si aici): din HTML brut NU se
// poate dovedi ABSENTA. Un semnal negasit iese "necunoscut" (de verificat), niciodata
// "lipsa". Raportul se vede public si e citit de un client care ne poate contrazice.
//
// ATRIBUIRE (specific migrarii): fiecare constatare declara daca e `structural` —
// adica tine de platforma si dispare prin migrare — sau doar `reparabil` si pe stackul
// actual. Un raport care pune TOATE problemele pe seama WooCommerce e un raport care
// pica la prima intrebare a unui client care se pricepe. Ce se poate repara cu un
// plugin de cache o spunem ca atare; cazul de migrare se construieste pe ce NU se poate.

import { detectPlatform, type Platform } from "./site-signals";
import { fetchPage, fetchPlatformVitals, type FieldVitals, type LabVitals } from "./net";

// ── Praguri (Core Web Vitals Google + praguri de bun-simt) ──
const LCP_GOOD_MS = 2500;      // pragul oficial "good" LCP
const LCP_POOR_MS = 4000;
const TTFB_GOOD_MS = 800;      // pragul oficial "good" TTFB
const TTFB_POOR_MS = 1800;
const WEIGHT_HEAVY_KB = 3000;  // ~3 MB pe mobil = greu
const SCRIPTS_HEAVY = 30;      // nr. de <script src> pe home

export type EvidenceVerdict = "ok" | "atentie" | "critic" | "necunoscut";

export type PlatformFinding = {
  id: string;
  label: string;
  measured: string;        // ce am masurat LA EI, in clar (cifra, nu adjectiv)
  verdict: EvidenceVerdict;
  structural: boolean;     // tine de platforma (dispare prin migrare) vs reparabil pe loc
  detail: string;          // ce inseamna, in limbaj de client
};

export type StackFingerprint = {
  platform: Platform | null;
  cms: { name: string; version: string | null } | null;
  ecomEngine: { name: string; version: string | null } | null;
  plugins: string[];
  pluginCount: number;
  scriptCount: number;
  stylesheetCount: number;
  generators: string[];
};

export type CheckoutSignals = {
  walletsSeen: string[];      // Apple Pay / Google Pay / Shop Pay — doar ce am CONFIRMAT
  paymentsSeen: string[];     // procesatori / metode detectate
  expressCheckout: boolean;   // confirmat prezent
  installments: boolean;      // plata in rate
};

export type PlatformEvidence = {
  url: string;
  stack: StackFingerprint;
  checkout: CheckoutSignals;
  field: FieldVitals | null;
  lab: LabVitals | null;
  findings: PlatformFinding[];
  migrationCandidate: boolean; // ecom pe stack self-hosted = are sens discutia
};

// ── Parsere pure (string -> valoare), testabile izolat ──

// <meta name="generator" content="WooCommerce 10.7.0"> — WP si pluginele si-l pun singure.
export function parseGenerators(html: string): string[] {
  const out: string[] = [];
  const re = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1].trim());
  return out;
}

// Desparte "WooCommerce 10.7.0" in nume + versiune.
function splitVersion(gen: string): { name: string; version: string | null } {
  const m = gen.match(/^(.*?)\s+v?(\d+[\d.]*)\s*$/);
  return m ? { name: m[1].trim(), version: m[2] } : { name: gen.trim(), version: null };
}

export function findGenerator(gens: string[], needle: RegExp): { name: string; version: string | null } | null {
  const hit = gens.find((g) => needle.test(g));
  return hit ? splitVersion(hit) : null;
}

// Slug-urile de plugin din caile de asseturi: /wp-content/plugins/<slug>/...
export function parsePlugins(html: string): string[] {
  const out = new Set<string>();
  const re = /wp-content\/plugins\/([a-z0-9][a-z0-9._-]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.add(m[1].toLowerCase());
  return [...out].sort();
}

export function countAssets(html: string): { scripts: number; stylesheets: number } {
  return {
    scripts: (html.match(/<script[^>]+src=["'][^"']+["']/gi) ?? []).length,
    stylesheets: (html.match(/<link[^>]+rel=["']stylesheet["']/gi) ?? []).length,
  };
}

// Plata rapida / wallets. Cautam DOAR confirmari: ce nu apare ramane "de verificat",
// pentru ca metodele de plata se randeaza de obicei abia in checkout (cu cos plin).
const WALLET_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "Apple Pay", re: /apple[-_ ]?pay|applepay/i },
  { id: "Google Pay", re: /google[-_ ]?pay|googlepay|gpay/i },
  { id: "Shop Pay", re: /shop[-_ ]?pay|shopify_pay/i },
  { id: "PayPal", re: /paypal/i },
  { id: "Revolut Pay", re: /revolut/i },
];

const PAYMENT_PATTERNS: { id: string; re: RegExp }[] = [
  { id: "Stripe", re: /js\.stripe\.com|wc-stripe|stripe[-_]?gateway/i },
  { id: "Netopia", re: /netopia|mobilpay/i },
  { id: "EuPlatesc", re: /euplatesc/i },
  { id: "Twispay", re: /twispay/i },
  { id: "PayU", re: /\bpayu\b/i },
  { id: "Revolut", re: /revolut/i },
  { id: "Card la livrare / ramburs", re: /ramburs|cash[-_ ]?on[-_ ]?delivery|plata la livrare/i },
];

const INSTALLMENT_RE = /\bplata in rate\b|\brate egale\b|\btbi\b|\boney\b|\bpauzagratis\b|\bklarna\b/i;
const EXPRESS_RE = /express[-_ ]?checkout|payment[-_ ]?request[-_ ]?button|wc-stripe-payment-request|one[-_ ]?click[-_ ]?checkout/i;

export function parseCheckoutSignals(html: string): CheckoutSignals {
  return {
    walletsSeen: WALLET_PATTERNS.filter((w) => w.re.test(html)).map((w) => w.id),
    paymentsSeen: PAYMENT_PATTERNS.filter((p) => p.re.test(html)).map((p) => p.id),
    expressCheckout: EXPRESS_RE.test(html),
    installments: INSTALLMENT_RE.test(html),
  };
}

export function fingerprintStack(html: string): StackFingerprint {
  const generators = parseGenerators(html);
  const plugins = parsePlugins(html);
  const assets = countAssets(html);
  return {
    platform: detectPlatform(html),
    cms: findGenerator(generators, /^wordpress/i),
    ecomEngine: findGenerator(generators, /^woocommerce/i),
    plugins,
    pluginCount: plugins.length,
    scriptCount: assets.scripts,
    stylesheetCount: assets.stylesheets,
    generators,
  };
}

// ── Constatari: masuratoare -> verdict + atribuire (structural vs reparabil) ──

const ms = (v: number | null) => (v == null ? "—" : `${(v / 1000).toFixed(2)} s`);

function ttfbFinding(field: FieldVitals | null): PlatformFinding {
  const v = field?.ttfbMs ?? null;
  if (v == null) {
    return {
      id: "ttfb", label: "Raspunsul serverului (utilizatori reali)",
      measured: "date insuficiente in CrUX", verdict: "necunoscut", structural: false,
      detail: "Magazinul nu are inca destul trafic ca Google sa publice date de la utilizatori reali.",
    };
  }
  const verdict: EvidenceVerdict = v <= TTFB_GOOD_MS ? "ok" : v >= TTFB_POOR_MS ? "critic" : "atentie";
  return {
    id: "ttfb",
    label: "Raspunsul serverului (utilizatori reali)",
    measured: `${Math.round(v)} ms pana la primul raspuns`,
    verdict,
    // Ori de cate ori serverul e lent, e o proprietate a gazduirii, nu a temei:
    // pe platforma gazduita raspunsul vine din reteaua globala, nu de pe un server inchiriat.
    structural: verdict !== "ok",
    detail: verdict === "ok"
      ? "Serverul raspunde in parametri buni."
      : `Fiecare vizitator asteapta ~${Math.round(v)} ms inainte sa vada primul pixel. Pragul recomandat de Google e ${TTFB_GOOD_MS} ms.`,
  };
}

function lcpFinding(field: FieldVitals | null, lab: LabVitals | null): PlatformFinding {
  const v = field?.lcpMs ?? null;
  if (v == null) {
    const labLcp = lab?.lcpMs ?? null;
    return {
      id: "lcp", label: "Cat dureaza pana se vede pagina",
      measured: labLcp ? `${ms(labLcp)} in test de laborator (mobil)` : "nemasurat",
      verdict: labLcp && labLcp > LCP_POOR_MS ? "atentie" : "necunoscut",
      structural: false,
      detail: "Fara date de la utilizatori reali; cifra e dintr-o simulare pe mobil.",
    };
  }
  const verdict: EvidenceVerdict = v <= LCP_GOOD_MS ? "ok" : v >= LCP_POOR_MS ? "critic" : "atentie";
  return {
    id: "lcp",
    label: "Cat dureaza pana se vede pagina (utilizatori reali)",
    measured: `${ms(v)} pe mobil`,
    verdict,
    structural: false, // se poate ameliora si pe stackul actual (cache, imagini) — onest
    detail: verdict === "ok"
      ? "Incarcarea e in pragul recomandat de Google (sub 2,5 s)."
      : `Pragul Google pentru "bun" e 2,5 s. Peste el, o parte din vizitatori pleaca inainte sa vada produsul.`,
  };
}

function weightFinding(lab: LabVitals | null, stack: StackFingerprint): PlatformFinding {
  const kb = lab?.weightKb ?? null;
  const heavy = kb != null && kb >= WEIGHT_HEAVY_KB;
  const manyScripts = stack.scriptCount >= SCRIPTS_HEAVY;
  const verdict: EvidenceVerdict = kb == null ? "necunoscut" : heavy ? "critic" : manyScripts ? "atentie" : "ok";
  const mb = kb == null ? "—" : `${(kb / 1024).toFixed(1)} MB`;
  return {
    id: "greutate",
    label: "Cat trage pagina la incarcare",
    measured: kb == null ? "nemasurat" : `${mb} si ${stack.scriptCount} scripturi pe prima pagina`,
    verdict,
    // Greutatea vine din tema + stiva de pluginuri care se aduna in timp; asta E
    // proprietatea stackului self-hosted. Se poate slabi, dar revine la fiecare plugin nou.
    structural: heavy,
    detail: heavy
      ? `Pe un abonament de date mobile, ${mb} inseamna zeci de secunde de asteptare si consum din traficul vizitatorului.`
      : "Greutatea paginii e in limite rezonabile.",
  };
}

function pluginFinding(stack: StackFingerprint): PlatformFinding {
  const n = stack.pluginCount;
  if (!stack.cms) {
    return {
      id: "pluginuri", label: "Extensii instalate", measured: "nu se aplica",
      verdict: "ok", structural: false, detail: "Platforma nu se bazeaza pe pluginuri terte.",
    };
  }
  // Ce vedem in HTML-ul primei pagini e un MINIM garantat: pluginurile fara asseturi
  // pe home nu apar deloc. Deci formulam ca "cel putin N", niciodata ca total.
  const verdict: EvidenceVerdict = n >= 10 ? "critic" : n >= 5 ? "atentie" : "ok";
  return {
    id: "pluginuri",
    label: "Extensii de care depinde magazinul",
    measured: `cel putin ${n} vizibile doar pe prima pagina${n ? `: ${stack.plugins.slice(0, 6).join(", ")}` : ""}`,
    verdict,
    structural: true, // dependenta de pluginuri terte = definitia stackului self-hosted
    detail: "Fiecare extensie e cod scris de altcineva, care se actualizeaza separat. Cand doua nu se inteleg, magazinul se opreste — de obicei fara sa afli imediat.",
  };
}

function checkoutFinding(c: CheckoutSignals): PlatformFinding {
  const wallets = c.walletsSeen.filter((w) => /Apple Pay|Google Pay|Shop Pay/.test(w));
  if (wallets.length || c.expressCheckout) {
    return {
      id: "checkout",
      label: "Plata rapida (fara completat formular)",
      measured: `confirmat: ${[...wallets, c.expressCheckout ? "checkout express" : ""].filter(Boolean).join(", ")}`,
      verdict: "ok", structural: false,
      detail: "Magazinul are deja o forma de plata rapida.",
    };
  }
  return {
    id: "checkout",
    label: "Plata rapida (fara completat formular)",
    measured: "neconfirmata pe paginile publice",
    verdict: "necunoscut", // invariant: absenta din HTML nu dovedeste absenta din checkout
    structural: false,
    detail: "Nu am putut confirma Apple Pay / Google Pay din exterior — se vad de obicei abia in pasul de plata, cu cosul plin. De verificat impreuna.",
  };
}

export function buildFindings(stack: StackFingerprint, checkout: CheckoutSignals, field: FieldVitals | null, lab: LabVitals | null): PlatformFinding[] {
  return [
    ttfbFinding(field),
    lcpFinding(field, lab),
    weightFinding(lab, stack),
    pluginFinding(stack),
    checkoutFinding(checkout),
  ];
}

// Platformele gazduite (Shopify/BigCommerce) nu sunt candidati de migrare CATRE Shopify.
const SELF_HOSTED = new Set<Platform>(["WooCommerce", "PrestaShop", "Magento", "OpenCart", "WordPress"]);

// ── Colectare (retea) ──
export async function collectPlatformEvidence(url: string, homeHtmlIn?: string): Promise<PlatformEvidence> {
  const homeHtml = homeHtmlIn ?? (await fetchPage(url)).html;
  const stack = fingerprintStack(homeHtml);
  const checkout = parseCheckoutSignals(homeHtml);
  const vitals = await fetchPlatformVitals(url);
  const field = vitals?.field ?? null;
  const lab = vitals?.lab ?? null;

  return {
    url,
    stack,
    checkout,
    field,
    lab,
    findings: buildFindings(stack, checkout, field, lab),
    migrationCandidate: stack.platform != null && SELF_HOSTED.has(stack.platform),
  };
}
