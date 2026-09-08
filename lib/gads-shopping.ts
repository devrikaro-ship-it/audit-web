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

const nr = (n: number) => Math.round(n).toLocaleString("en-US");

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
      titlu: `Your budget is spread across ${Math.round(diluare / DILUARE_TINTA)} times more products than it can support`,
      ron: 0,
      grad: diluare > DILUARE_GRAVA ? "critic" : "costa",
      detaliu:
        `Over the last 30 days you recorded ${nr(capacitate)} ${capacitate === 1 ? "sale" : "sales"}, ` +
        `while ads appeared for ${nr(date.produseCuAfisari)} products. Google needs each product to ` +
        `reach about one sale per month to learn how to bid, so this budget can support roughly ` +
        `${nr(potDuce)} products. The rest receive too few clicks for the system to learn from them. ` +
        `The solution is a smaller product set, not automatically a larger budget: keep products ` +
        `that sell and pause the rest. Reducing the set costs nothing; funding the entire catalog does.`,
    });
  }

  // ── 4.1: fara Shopping standard, contul nu poate arata pe ce cuvinte pleaca banii ──
  if (!shopping.length) {
    probleme.push({
      cod: "shopping-lipsa",
      titlu: "You cannot see which searches consume the budget",
      ron: 0,
      grad: "reglaj",
      detaliu:
        `The account has no active Standard Shopping campaign. Performance Max reports search ` +
        `categories but not the cost of each query, so the account cannot show which words consumed ` +
        `the budget. Even a small Standard Shopping campaign restores that data and exposes leakage.`,
    });
  }

  // ── 4.2: licitare pe randament ────────────────────────────────────────────
  const faraTinta = shopping.filter((c) => c.bidding !== "TARGET_ROAS");
  if (faraTinta.length) {
    probleme.push({
      cod: "shopping-bidding",
      titlu: `${faraTinta.length === 1 ? "One Shopping campaign does" : `${faraTinta.length} Shopping campaigns do`} not bid to a return target`,
      ron: faraTinta.reduce((s, c) => s + c.bugetZilnic * 30, 0),
      grad: "costa",
      detaliu:
        `For a store, the campaign should optimize how much revenue each currency unit of spend returns. ` +
        `Without that target it buys clicks using other criteria, including clicks that do not break even.`,
      exemple: faraTinta.map((c) => c.nume),
    });
  }

  // ── 4.5: doua campanii pe aceleasi produse, fara intaietate stabilita ─────
  if (shopping.length > 1) {
    const prioritati = new Set(shopping.map((c) => c.prioritate));
    if (prioritati.size === 1) {
      probleme.push({
        cod: "shopping-prioritate",
        titlu: `${shopping.length} Shopping campaigns compete for the same products`,
        ron: 0,
        grad: "reglaj",
        detaliu:
          `When the same product appears in two Shopping campaigns, the higher-priority campaign ` +
          `bids regardless of the other bid. All these campaigns have the same priority, so precedence ` +
          `is undefined: they can override one another and make configured bids ineffective.`,
        exemple: shopping.map((c) => `${c.nume} — priority ${c.prioritate}`),
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
    nume: r.campaign?.name ?? "(unnamed)",
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
