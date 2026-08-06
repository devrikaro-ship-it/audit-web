// Analiza cuvintelor din cont: ce cuvinte negative blocheaza produse pe care omul chiar le
// vinde, si ce termeni de cautare ard bani fara sa aduca vanzari.
//
// Doctrina (google-ads-optimize, general/CHECKLIST.md sectiunea 3):
//   3.3 — ZERO termeni care contin brandul in negative. Un magazin care isi negativeaza
//         propriul nume isi opreste singur cel mai ieftin trafic pe care il are.
//   3.6 — lista EXISTENTA se auditeaza contra catalogului, nu doar adaugirile: listele
//         mostenite de la agentii anterioare cara termeni care blocheaza produse vandute.
//   3.7 — nu se negativeaza nimic pentru "converteste sub target" — aia e parghie de bidding.
//
// Verificat pe cont real (DeHome, 06-08-2026): cuvantul "dehome" era negativ si bloca 30 din
// 40 de produse ale magazinului.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";
import type { Product } from "./gads-audit";

export type NegativToxic = {
  cuvant: string;
  /** Cate produse din catalog contin cuvantul in titlu. */
  produseBlocate: number;
  /** Cateva titluri, ca omul sa vada imediat despre ce e vorba. */
  exemple: string[];
  /** Cuvantul seamana cu numele magazinului -> isi blocheaza brandul. */
  eBrand: boolean;
};

export type TermenRisipa = { termen: string; cost: number; clicuri: number };

/** Un termen asa cum vine din API, inainte sa decidem daca e risipa. */
export type TermenBrut = { termen: string; cost: number; conversii: number; clicuri: number };

export type KeywordAudit = {
  negativeTotal: number;
  toxice: NegativToxic[];
  /** Termeni cu cost si zero conversii. */
  risipa: TermenRisipa[];
  risipaTotal: number;
  /**
   * Fara Shopping standard, `search_term_view` nu da cost pe termen (PMax raporteaza
   * categorii, nu costuri). Atunci nu putem spune pe ce cuvinte se duc banii — si asta e
   * in sine o constatare, nu o absenta de date de trecut sub tacere.
   */
  areVizibilitateTermeni: boolean;
};

/** Scoate diacriticele si normalizeaza spatiile, ca sa comparam "canapea" cu "Canapea". */
export function normalizeaza(s: string): string {
  return (s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ăâ]/gi, "a").replace(/[îi]/gi, "i").replace(/[șş]/gi, "s").replace(/[țţ]/gi, "t")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Potrivire pe CUVANT INTREG, nu pe subsir. Fara asta, negativul "ana" pare ca blocheaza
 * produse pentru ca se regaseste in "can-ana-pea", iar "trip" in "tripla" — doua fals
 * pozitive reale, gasite pe catalogul DeHome. Un raport care acuza pe baza lor isi pierde
 * dreptul de a fi crezut.
 */
export function contineCuvant(text: string, cuvant: string): boolean {
  const m = potrivitor(cuvant);
  return m ? m.test(normalizeaza(text)) : false;
}

/**
 * Expresia pentru un cuvant, construita O SINGURA DATA. Pe Granox (104 negative x 11.824
 * produse) varianta care compila regexul la fiecare pereche tinea pagina 25 de secunde —
 * din care 3 erau apelurile la Google si 22 asteptare degeaba.
 */
function potrivitor(cuvant: string): RegExp | null {
  const c = normalizeaza(cuvant);
  if (c.length < 3) return null;
  const esc = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`);
}

/** Cuvintele care compun numele magazinului, ca sa recunoastem auto-blocarea brandului. */
function termeniDeBrand(numeCont: string | undefined, titluri: string[]): string[] {
  const din = new Set<string>();
  for (const bucata of (numeCont || "").split(/[\s\-_.]+/)) {
    const n = normalizeaza(bucata);
    if (n.length >= 4 && !/^(dvk|srl|com|shop|store|online|ro)$/.test(n)) din.add(n);
  }
  // Un cuvant care apare in majoritatea titlurilor e, practic sigur, brandul.
  const frecventa = new Map<string, number>();
  for (const t of titluri) {
    for (const w of new Set(t.split(" "))) {
      if (w.length >= 4) frecventa.set(w, (frecventa.get(w) ?? 0) + 1);
    }
  }
  const prag = titluri.length * 0.5;
  for (const [w, n] of frecventa) if (n >= prag && prag > 2) din.add(w);
  return [...din];
}

export function analizeazaCuvinte(
  negative: string[],
  produse: Product[],
  termeni: { termen: string; cost: number; conversii: number; clicuri: number }[],
  numeCont?: string
): KeywordAudit {
  // Titlurile se normalizeaza o singura data, nu o data per negativ.
  const titluri = produse.map((p) => normalizeaza(p.title));
  const brand = termeniDeBrand(numeCont, titluri);

  const toxice: NegativToxic[] = [];
  for (const n of new Set(negative)) {
    const re = potrivitor(n);
    if (!re) continue;
    const lovite: Product[] = [];
    for (let i = 0; i < titluri.length; i++) {
      if (re.test(titluri[i])) lovite.push(produse[i]);
    }
    if (!lovite.length) continue;
    toxice.push({
      cuvant: n,
      produseBlocate: lovite.length,
      exemple: lovite.slice(0, 3).map((p) => p.title),
      eBrand: brand.some((b) => normalizeaza(n) === b),
    });
  }
  // Brandul primul, apoi dupa cate produse blocheaza.
  toxice.sort((a, b) => Number(b.eBrand) - Number(a.eBrand) || b.produseBlocate - a.produseBlocate);

  const risipa = termeni
    .filter((t) => t.conversii === 0 && t.cost > 0)
    .map((t) => ({ termen: t.termen, cost: t.cost, clicuri: t.clicuri }))
    .sort((a, b) => b.cost - a.cost);

  return {
    negativeTotal: new Set(negative).size,
    toxice,
    risipa,
    risipaTotal: risipa.reduce((s, t) => s + t.cost, 0),
    areVizibilitateTermeni: termeni.length > 1,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Doar reteaua. E separata de analiza ca sa poata pleca in acelasi timp cu restul apelurilor:
 * altfel pagina asteapta intai catalogul, apoi cuvintele, desi cele doua nu depind una de alta
 * la nivel de retea (doar la analiza).
 */
export async function fetchKeywordData(
  customerId: string,
  auth: GoogleAdsAuth
): Promise<{ negative: string[]; termeni: TermenBrut[] }> {
  const negative: string[] = [];
  type NegRow = {
    sharedCriterion?: { keyword?: { text?: string } };
    campaignCriterion?: { keyword?: { text?: string } };
  };
  for (const q of [
    "SELECT shared_criterion.keyword.text FROM shared_criterion",
    "SELECT campaign_criterion.keyword.text FROM campaign_criterion WHERE campaign_criterion.negative = TRUE",
  ]) {
    try {
      for (const r of (await googleAdsSearch(customerId, q, auth)) as NegRow[]) {
        const t = r.sharedCriterion?.keyword?.text ?? r.campaignCriterion?.keyword?.text;
        if (t) negative.push(t);
      }
    } catch {
      // O lista inaccesibila nu trebuie sa doboare tot auditul.
    }
  }

  type TermRow = {
    searchTermView?: { searchTerm?: string };
    metrics?: { costMicros?: string | number; conversions?: string | number; clicks?: string | number };
  };
  let termeni: TermenBrut[] = [];
  try {
    const rows = (await googleAdsSearch(
      customerId,
      `SELECT search_term_view.search_term, metrics.cost_micros, metrics.conversions, metrics.clicks
       FROM search_term_view WHERE segments.date DURING LAST_30_DAYS`,
      auth
    )) as TermRow[];
    termeni = rows.map((r) => ({
      termen: r.searchTermView?.searchTerm ?? "",
      cost: Number(r.metrics?.costMicros ?? 0) / 1_000_000,
      conversii: Number(r.metrics?.conversions ?? 0),
      clicuri: Number(r.metrics?.clicks ?? 0),
    })).filter((t) => t.termen);
  } catch {
    termeni = [];
  }

  return { negative, termeni };
}

export async function fetchKeywords(
  customerId: string,
  auth: GoogleAdsAuth,
  produse: Product[],
  numeCont?: string
): Promise<KeywordAudit> {
  const { negative, termeni } = await fetchKeywordData(customerId, auth);
  return analizeazaCuvinte(negative, produse, termeni, numeCont);
}
