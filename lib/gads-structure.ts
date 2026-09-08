// Structura contului si felul in care liciteaza — cele mai scumpe greseli dintr-un cont, mai
// scumpe decat orice produs slab, pentru ca afecteaza TOT bugetul deodata.
//
// Pragurile vin din doctrina casei (google-ads-optimize), nu din capul nostru:
//   CHECKLIST 2.3  — LAW 2: campanii live ≤ monthly_spend / (30 x CPA). Sub ~30 conversii pe
//                    luna o campanie nu iese din invatare.
//   CHECKLIST 2.5  — [BP] brand: 1-5% din cheltuiala contului, ROAS ≥ 10x. Esec STRICT la
//                    >10% din spend SAU ROAS < 10 (atunci nu mai protejeaza brandul, curge
//                    trafic generic).
//   CHECKLIST 2.7  — zero Demand Gen / Display standalone / TARGET_SPEND.
//   CHECKLIST 2.8  — niciun castigator lasat PAUSED cat timp pierzatorii cheltuie.
//   pmax/rules.md  — bidding pe valoare FARA target = "the worst of both: chases volume with
//                    no brake". Verificat live pe DeHome: campania cu 93% din buget, tROAS 0.
//   pmax/rules.md  — campaign.primary_status + reasons: LIMITED strangulaza livrarea si nu
//                    apare in niciun raport de performanta.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";

export type Campanie = {
  nume: string;
  status: string;
  /** ELIGIBLE / LIMITED / LEARNING / PAUSED / ... */
  stare: string;
  motive: string[];
  canal: string;
  bidding: string;
  tRoas: number;
  cost: number;
  conversii: number;
  valoare: number;
};

export type ProblemaStructura = {
  cod: string;
  titlu: string;
  /** Banii afectati — pentru ordonare. 0 cand problema nu are o suma directa. */
  ron: number;
  detaliu: string;
  /** Cat de grav: blocheaza restul / costa bani / de reglat. */
  grad: "critic" | "costa" | "reglaj";
  /** Numele concrete din spatele afirmatiei, cand exista. */
  exemple?: string[];
};

export type StructuraAudit = {
  campanii: Campanie[];
  cheltuialaTotala: number;
  roasCont: number | null;
  probleme: ProblemaStructura[];
};

const money = (n: number, currencyCode?: string) => currencyCode
  ? new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode, maximumFractionDigits: 0 }).format(Math.round(n))
  : `${Math.round(n).toLocaleString("en-US")} currency units`;
const esteBrand = (nume: string) => /\[BP\]|brand/i.test(nume);

/**
 * Cat de mult din buget trebuie sa treaca printr-o campanie ca sa merite pomenita.
 * Fara pragul asta, pe Granox iesea "o campanie liciteaza fara tinta — 19 RON" pe un cont de
 * 3.715 RON: adevarat pe hartie, dar un om care citeste asta intelege ca nu avem ce sa-i
 * spunem. O constatare sub 5% din buget nu schimba nimic si scade increderea in restul.
 */
const PRAG_COTA = 0.05;

export function analizeazaStructura(campanii: Campanie[], currencyCode?: string): StructuraAudit {
  const live = campanii.filter((c) => c.status === "ENABLED");
  const cheltuialaTotala = campanii.reduce((s, c) => s + c.cost, 0);
  const valoareTotala = campanii.reduce((s, c) => s + c.valoare, 0);
  const roasCont = cheltuialaTotala > 0 ? valoareTotala / cheltuialaTotala : null;
  const probleme: ProblemaStructura[] = [];

  // Cont oprit: nu are sens sa-i reglam structura. Singurul lucru adevarat de spus e ca nu
  // ruleaza. Altfel am fi raportat pe BeWater "campania de brand nu ruleaza" pe un cont in
  // care NIMIC nu ruleaza — o observatie corecta care duce omul in directia gresita.
  if (cheltuialaTotala === 0) {
    return {
      campanii,
      cheltuialaTotala,
      roasCont,
      probleme: [
        {
          cod: "cont-oprit",
          titlu: "The account spent nothing over the last 30 days",
          ron: 0,
          grad: "critic",
          detaliu:
            `The account contains ${campanii.length} campaigns, but none delivered. Until a campaign ` +
            `starts, there is no current structure or product performance to assess; any conclusion ` +
            `would describe the past rather than what is happening now.`,
        },
      ],
    };
  }
  const prag = cheltuialaTotala * PRAG_COTA;

  // ── Bidding pe valoare fara target: cheltuie cat poate, fara frana ──────────
  const faraTinta = live.filter(
    (c) => c.bidding === "MAXIMIZE_CONVERSION_VALUE" && c.tRoas === 0 && c.cost > 0
  );
  if (faraTinta.reduce((s, c) => s + c.cost, 0) >= prag) {
    const bani = faraTinta.reduce((s, c) => s + c.cost, 0);
    const cota = Math.round((bani / cheltuialaTotala) * 100);
    probleme.push({
      cod: "bidding-fara-tinta",
      titlu: `${faraTinta.length === 1 ? "One campaign bids" : `${faraTinta.length} campaigns bid`} without a return target`,
      ron: bani,
      grad: "costa",
      detaliu:
        `${faraTinta.map((c) => `"${c.nume}"`).join(", ")} ${faraTinta.length === 1 ? "is" : "are"} ` +
        `set to maximize conversion value without a minimum return. It buys volume without a ` +
        `profitability guardrail, including expensive clicks that do not break even. ` +
        `${money(bani, currencyCode)} passed through ${faraTinta.length === 1 ? "this campaign" : "these campaigns"}, or ${cota}% of account spend.`,
    });
  }

  // ── Brand protection: lipsa, sau prezenta degeaba ──────────────────────────
  const brand = campanii.filter((c) => esteBrand(c.nume));
  const brandLive = brand.filter((c) => c.status === "ENABLED");
  const brandCost = brandLive.reduce((s, c) => s + c.cost, 0);
  const brandVal = brandLive.reduce((s, c) => s + c.valoare, 0);
  const brandCota = (brandCost / cheltuialaTotala) * 100;
  const brandRoas = brandCost > 0 ? brandVal / brandCost : 0;

  if (!brand.length) {
    probleme.push({
      cod: "brand-lipsa",
      titlu: "No campaign protects your brand name",
      ron: 0,
      grad: "costa",
      detaliu:
        "People searching directly for your store name are usually the cheapest and most certain customers. " +
        "Without a dedicated campaign, competitors can bid on that name and intercept those customers.",
    });
  } else if (!brandLive.length || brandCost === 0) {
    probleme.push({
      cod: "brand-inactiv",
      titlu: "Your brand campaign exists but is not delivering",
      ron: 0,
      grad: "costa",
      detaliu:
        `"${brand[0].nume}" is ${brandLive.length ? "enabled but has spent nothing" : "paused"}. ` +
        `A brand campaign that does not deliver provides no protection.`,
    });
    // Pragul de ROAS se aplica DOAR pe o campanie care chiar cheltuie. Sub el, "ROAS 3" e
    // rezultatul a doua clicuri, nu un simptom — Granox avea 19 RON pe brand si iesea acuzat
    // ca "aduna trafic generic".
  } else if (brandCota > 10 || (brandCost >= prag && brandRoas < 10)) {
    probleme.push({
      cod: "brand-scurgere",
      titlu: "The brand campaign is collecting non-brand traffic",
      ron: brandCost,
      grad: "reglaj",
      detaliu:
        `It consumes ${brandCota.toFixed(1)}% of account spend and returns ${brandRoas.toFixed(1)} times that spend. ` +
        `A healthy brand campaign normally uses 1–5% of the budget and returns more than 10 times. ` +
        `Exceeding those bounds suggests it is collecting generic searches rather than only your name.`,
    });
  }

  // ── Tipuri de campanii care nu au ce cauta ────────────────────────────────
  const interzise = live.filter(
    (c) => /DEMAND_GEN|DISPLAY/.test(c.canal) || c.bidding === "TARGET_SPEND"
  );
  const baniInterzise = interzise.reduce((s, c) => s + c.cost, 0);
  if (interzise.length && baniInterzise >= prag) {
    const bani = baniInterzise;
    probleme.push({
      cod: "campanii-interzise",
      titlu: `${interzise.length} campaigns use formats that consume budget without capturing purchase intent`,
      ron: bani,
      grad: "costa",
      detaliu:
        `${interzise.map((c) => `"${c.nume}"`).join(", ")} use display formats or are configured ` +
        `to spend the full budget rather than drive sales. For a store, that budget is better placed ` +
        `in campaigns that reach people actively searching for the product.`,
    });
  }

  // ── Livrare strangulata: LIMITED cu motiv ─────────────────────────────────
  const limitate = live.filter((c) => c.stare === "LIMITED");
  if (limitate.length) {
    const motiveClare = [...new Set(limitate.flatMap((c) => c.motive))].filter((m) => m && m !== "UNKNOWN");
    probleme.push({
      cod: "livrare-limitata",
      titlu: `${limitate.length} ${limitate.length === 1 ? "campaign is" : "campaigns are"} limited by Google`,
      ron: 0,
      grad: "reglaj",
      detaliu:
        `${limitate.map((c) => `"${c.nume}"`).join(", ")} ${limitate.length === 1 ? "is" : "are"} enabled, but Google limits delivery. ` +
        (motiveClare.length
          ? `Reported reasons: ${motiveClare.map(traduMotiv).join("; ")}. `
          : "") +
        `This is not visible in a performance report; the campaign simply looks weaker.`,
    });
  }

  // ── Castigatori lasati opriti ─────────────────────────────────────────────
  const opriteCuIstoric = campanii.filter((c) => c.status !== "ENABLED" && c.valoare > 0);
  const cheltuieAcum = live.some((c) => c.cost > 0);
  if (opriteCuIstoric.length && cheltuieAcum) {
    const bune = opriteCuIstoric.filter((c) => c.cost > 0 && c.valoare / c.cost > roasCont!);
    if (bune.length) {
      probleme.push({
        cod: "castigatori-opriti",
        titlu: `${bune.length} paused campaigns performed better than the account average`,
        ron: 0,
        grad: "reglaj",
        detaliu:
          `${bune.slice(0, 3).map((c) => `"${c.nume}" (${(c.valoare / c.cost).toFixed(1)}x)`).join(", ")} — ` +
          `remain paused while other campaigns spend at a lower return.`,
      });
    }
  }

  // ── LAW 2: cate campanii poate hrani bugetul ──────────────────────────────
  const convTotal = campanii.reduce((s, c) => s + c.conversii, 0);
  const cpa = convTotal > 0 ? cheltuialaTotala / convTotal : 0;
  if (cpa > 0 && live.length > 0) {
    const maxCampanii = Math.max(1, Math.floor(cheltuialaTotala / (30 * cpa)));
    if (live.length > maxCampanii) {
      probleme.push({
        cod: "prea-multe-campanii",
        titlu: `The budget is spread across ${live.length} campaigns`,
        ron: 0,
        grad: "reglaj",
        detaliu:
          `Google needs about 30 sales per month in a campaign to learn whom to bid for. With ` +
          `${money(cheltuialaTotala, currencyCode)} in spend and an average ${money(cpa, currencyCode)} cost per sale, ` +
          `this budget can properly support ${maxCampanii} ${maxCampanii === 1 ? "campaign" : "campaigns"}, ` +
          `not ${live.length}. The rest remain in a permanent learning state.`,
      });
    }
  }

  probleme.sort((a, b) => {
    const rang = { critic: 0, costa: 1, reglaj: 2 } as const;
    return rang[a.grad] - rang[b.grad] || b.ron - a.ron;
  });

  return { campanii, cheltuialaTotala, roasCont, probleme };
}

function traduMotiv(m: string): string {
  const t: Record<string, string> = {
    BUDGET_CONSTRAINED: "the daily budget runs out too early",
    BIDDING_STRATEGY_CONSTRAINED: "the return target is above what the account can support",
    BIDDING_STRATEGY_LEARNING: "the strategy is still learning (normal in the first weeks)",
    HAS_ASSET_GROUPS_LIMITED_BY_POLICY: "assets were rejected under Google policies",
    SEARCH_VOLUME_LIMITED: "the selected scope has too little search volume",
  };
  return t[m] ?? m.toLowerCase().replace(/_/g, " ");
}

export async function fetchStructura(
  customerId: string,
  auth: GoogleAdsAuth,
  currencyCode?: string,
): Promise<StructuraAudit> {
  type Row = {
    campaign?: {
      name?: string; status?: string; primaryStatus?: string; primaryStatusReasons?: string[];
      advertisingChannelType?: string; biddingStrategyType?: string;
      maximizeConversionValue?: { targetRoas?: number | string };
      targetRoas?: { targetRoas?: number | string };
    };
    metrics?: { costMicros?: string | number; conversions?: string | number; conversionsValue?: string | number };
  };
  const rows = (await googleAdsSearch(
    customerId,
    `SELECT campaign.name, campaign.status, campaign.primary_status,
     campaign.primary_status_reasons, campaign.advertising_channel_type,
     campaign.bidding_strategy_type, campaign.maximize_conversion_value.target_roas,
     campaign.target_roas.target_roas,
     metrics.cost_micros, metrics.conversions, metrics.conversions_value
     FROM campaign WHERE segments.date DURING LAST_30_DAYS`,
    auth
  )) as Row[];

  const campanii: Campanie[] = rows.map((r) => ({
    nume: r.campaign?.name ?? "(unnamed)",
    status: r.campaign?.status ?? "UNKNOWN",
    stare: r.campaign?.primaryStatus ?? "UNKNOWN",
    motive: r.campaign?.primaryStatusReasons ?? [],
    canal: r.campaign?.advertisingChannelType ?? "UNKNOWN",
    bidding: r.campaign?.biddingStrategyType ?? "UNKNOWN",
    tRoas: Number(r.campaign?.maximizeConversionValue?.targetRoas ?? r.campaign?.targetRoas?.targetRoas ?? 0),
    cost: Number(r.metrics?.costMicros ?? 0) / 1_000_000,
    conversii: Number(r.metrics?.conversions ?? 0),
    valoare: Number(r.metrics?.conversionsValue ?? 0),
  }));

  return analizeazaStructura(campanii, currencyCode);
}
