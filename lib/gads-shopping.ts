// Shopping standard — stratul de control al unui magazin.
//
// Doctrina (google-ads-optimize, ecom/structure/rules.md + ecom/shopping/rules.md, CHECKLIST 2.2/4.x):
//
//   LAW 1 — setul de produse pe care il poate duce bugetul:
//       capacitate = (cheltuiala lunara / CPC) x CVR   ≈ vanzari pe luna
//       diluare    = produse cu afisari / capacitate
//     Tinta ≤ 2. Un produs care nu ajunge la vreo vanzare pe luna nu aduna destule clicuri
//     cat sistemul sa invete pe el, iar banii lui se pierd. Masurat pe 16 conturi, peste 8
//     contul pierde mai mult de jumatate din buget pe produse care nu vand.
//     PARGHIA E SETUL, NU BUGETUL: taierea setului la ce poate duce bugetul e gratis;
//     cresterea bugetului cat sa duca tot catalogul, nu.
//
//   4.1 — Shopping standard e SINGURA sursa de cost pe termen de cautare (`search_term_view`).
//         PMax da categorii, fara costuri. Fara Shopping, contul e orb pe unde se scurg banii.
//   4.2 — orice Shopping activ pe TARGET_ROAS.
//   4.5 / rule 6 — acelasi produs in doua campanii Shopping: liciteaza cea cu prioritatea mai
//         MARE, indiferent de suma licitata. Doua campanii active cu aceeasi prioritate =
//         nimeni nu a decis care are intaietate.
//
// Verificat live (06-08-2026): Granox — 2.862 de produse cu afisari la ~63 de vanzari pe luna
// (diluare 45), si doua campanii Shopping active amandoua pe prioritate 2.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";

export type CampanieShopping = {
  nume: string;
  status: string;
  bidding: string;
  prioritate: number | null;
  bugetZilnic: number;
};

export type ShoppingData = {
  campanii: CampanieShopping[];
  /** Produse care au primit macar o afisare in ultimele 30 de zile. */
  produseCuAfisari: number;
  conversii30z: number;
  cost30z: number;
};

export type ProblemaShopping = {
  cod: string;
  titlu: string;
  ron: number;
  detaliu: string;
  grad: "critic" | "costa" | "reglaj";
  exemple?: string[];
};

export type ShoppingAudit = { probleme: ProblemaShopping[]; diluare: number | null };

const nr = (n: number) => Math.round(n).toLocaleString("ro-RO");

/** Peste atat, doctrina spune ca mai mult de jumatate din buget e structural pierdut. */
const DILUARE_GRAVA = 8;
const DILUARE_TINTA = 2;

/**
 * @param trackingOk cand masurarea e stricta, numarul de conversii nu e de incredere — si
 *   toata aritmetica diluarii sta pe el. Atunci nu spunem nimic despre diluare.
 */
export function analizeazaShopping(date: ShoppingData, trackingOk: boolean): ShoppingAudit {
  const probleme: ProblemaShopping[] = [];
  const live = date.campanii.filter((c) => c.status === "ENABLED");
  const shopping = live.filter((c) => c.prioritate !== null);

  // ── LAW 1: cate produse poate duce bugetul ────────────────────────────────
  // Capacitatea = (clicuri pe luna) x CVR = chiar numarul de vanzari pe luna. Nu inventam
  // CPC si CVR separat cand produsul lor e deja masurat.
  const capacitate = date.conversii30z;
  const diluare =
    trackingOk && capacitate > 0 && date.produseCuAfisari > 0
      ? date.produseCuAfisari / capacitate
      : null;

  if (diluare !== null && diluare > DILUARE_TINTA) {
    const potDuce = Math.max(1, Math.round(capacitate * DILUARE_TINTA));
    probleme.push({
      cod: "diluare",
      titlu: `Bugetul tau e intins pe de ${Math.round(diluare / DILUARE_TINTA)} de ori mai multe produse decat poate duce`,
      ron: 0,
      grad: diluare > DILUARE_GRAVA ? "critic" : "costa",
      detaliu:
        `In ultimele 30 de zile ai avut ${nr(capacitate)} ${capacitate === 1 ? "vanzare" : "vanzari"}, ` +
        `iar reclamele s-au afisat pentru ${nr(date.produseCuAfisari)} de produse. ` +
        `Ca sa invete pe ce sa liciteze, Google are nevoie ca fiecare produs sa ajunga la ` +
        `aproximativ o vanzare pe luna — bugetul tau poate duce asa in jur de ${nr(potDuce)} de ` +
        `produse. Restul primesc cate cateva clicuri, prea putine ca sistemul sa invete ceva ` +
        `din ele, si banii aia se pierd. ` +
        `Solutia nu e buget mai mare, ci set mai mic: alegi produsele care chiar vand si opresti ` +
        `restul. Taierea setului nu costa nimic, cresterea bugetului cat sa duca tot catalogul, da.`,
    });
  }

  // ── 4.1: fara Shopping standard, contul nu poate arata pe ce cuvinte pleaca banii ──
  if (!shopping.length) {
    probleme.push({
      cod: "shopping-lipsa",
      titlu: "Nu poti vedea pe ce cautari se duc banii",
      ron: 0,
      grad: "reglaj",
      detaliu:
        `Contul nu are nicio campanie Shopping standard activa. Performance Max raporteaza ` +
        `categorii de cautari, dar nu si cat a costat fiecare — asa ca nu exista nicaieri ` +
        `raspunsul la "pe ce cuvinte mi s-au dus banii". O campanie Shopping standard, chiar si ` +
        `mica, aduce inapoi datele astea si face vizibile scurgerile.`,
    });
  }

  // ── 4.2: licitare pe randament ────────────────────────────────────────────
  const faraTinta = shopping.filter((c) => c.bidding !== "TARGET_ROAS");
  if (faraTinta.length) {
    probleme.push({
      cod: "shopping-bidding",
      titlu: `${faraTinta.length === 1 ? "O campanie Shopping nu liciteaza" : `${faraTinta.length} campanii Shopping nu liciteaza`} pe randament`,
      ron: faraTinta.reduce((s, c) => s + c.bugetZilnic * 30, 0),
      grad: "costa",
      detaliu:
        `Pe un magazin, campania trebuie sa urmareasca cati lei aduce la fiecare leu cheltuit. ` +
        `Fara tinta asta, cumpara clicuri dupa alte criterii si le ia si pe cele care nu se acopera.`,
      exemple: faraTinta.map((c) => c.nume),
    });
  }

  // ── 4.5: doua campanii pe aceleasi produse, fara intaietate stabilita ─────
  if (shopping.length > 1) {
    const prioritati = new Set(shopping.map((c) => c.prioritate));
    if (prioritati.size === 1) {
      probleme.push({
        cod: "shopping-prioritate",
        titlu: `${shopping.length} campanii Shopping se bat pe aceleasi produse`,
        ron: 0,
        grad: "reglaj",
        detaliu:
          `Cand acelasi produs apare in doua campanii Shopping, cea cu prioritatea mai mare ` +
          `liciteaza — indiferent cat licita cealalta. Toate campaniile tale au aceeasi ` +
          `prioritate, deci nu s-a stabilit cine are intaietate: se pot suprascrie una pe alta, ` +
          `iar sumele pe care le-ai setat intr-una pot sa nu conteze deloc.`,
        exemple: shopping.map((c) => `${c.nume} — prioritate ${c.prioritate}`),
      });
    }
  }

  const rang = { critic: 0, costa: 1, reglaj: 2 } as const;
  probleme.sort((a, b) => rang[a.grad] - rang[b.grad] || b.ron - a.ron);
  return { probleme, diluare };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function fetchShoppingData(
  customerId: string,
  auth: GoogleAdsAuth
): Promise<ShoppingData> {
  type CampRow = {
    campaign?: {
      name?: string;
      status?: string;
      biddingStrategyType?: string;
      advertisingChannelType?: string;
      shoppingSetting?: { campaignPriority?: number };
    };
    campaignBudget?: { amountMicros?: string | number };
    metrics?: { conversions?: string | number; costMicros?: string | number };
  };

  const [camp, prod] = await Promise.all([
    googleAdsSearch(
      customerId,
      `SELECT campaign.name, campaign.status, campaign.bidding_strategy_type,
       campaign.advertising_channel_type, campaign.shopping_setting.campaign_priority,
       campaign_budget.amount_micros, metrics.conversions, metrics.cost_micros
       FROM campaign WHERE segments.date DURING LAST_30_DAYS`,
      auth
    ) as Promise<CampRow[]>,
    // Doar cate sunt, nu care — numarul e tot ce cere aritmetica diluarii.
    googleAdsSearch(
      customerId,
      `SELECT shopping_product.item_id FROM shopping_product
       WHERE segments.date DURING LAST_30_DAYS AND metrics.impressions > 0`,
      auth
    ).catch(() => [] as unknown[]),
  ]);

  const campanii: CampanieShopping[] = camp.map((r) => ({
    nume: r.campaign?.name ?? "(fara nume)",
    status: r.campaign?.status ?? "UNKNOWN",
    bidding: r.campaign?.biddingStrategyType ?? "UNKNOWN",
    // Prioritatea exista doar pe Shopping standard; pe restul e semnalul ca nu e Shopping.
    prioritate:
      r.campaign?.advertisingChannelType === "SHOPPING"
        ? (r.campaign?.shoppingSetting?.campaignPriority ?? 0)
        : null,
    bugetZilnic: Number(r.campaignBudget?.amountMicros ?? 0) / 1_000_000,
  }));

  return {
    campanii,
    produseCuAfisari: prod.length,
    conversii30z: camp.reduce((s, r) => s + Number(r.metrics?.conversions ?? 0), 0),
    cost30z: camp.reduce((s, r) => s + Number(r.metrics?.costMicros ?? 0) / 1_000_000, 0),
  };
}
