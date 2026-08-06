// Performance Max — motorul principal al majoritatii magazinelor. Greselile de aici nu apar
// in niciun raport de performanta: campania arata pur si simplu "mai slaba".
//
// Doctrina (google-ads-optimize, ecom/pmax/rules.md + CHECKLIST 5.x):
//   5.2 — protectie de brand pe fiecare PMax live (lista oficiala de brand SAU negative de
//         campanie). Fara ea, PMax cumpara traficul pe numele magazinului, pe care campania
//         [BP] il ia pe centi.
//   5.3 — un grup de anunturi e ori DELIBERAT doar-feed (zero materiale), ori COMPLET. Niciodata
//         pe jumatate: un grup partial franeaza livrarea.
//   5.4 — asset_group.primary_status: un grup LIMITED nu apare in niciun raport de performanta.
//   5.6 — extinderea URL-urilor: pe un magazin condus de feed, FEED-ul decide ce se promoveaza,
//         nu selectorul de pagini al Google. Campul s-a mutat — azi traieste in
//         `campaign.asset_automation_settings`, tipul FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION.
//
// Verificat live (06-08-2026): DeHome are extinderea PORNITA exact pe campania care duce 93%
// din buget, si un grup cu un singur titlu lung si nimic altceva.
//
// NOTA deliberata: nu raportam "grupul e doar-feed" ca greseala. Doctrina spune raspicat ca
// intrebarea feed-only vs complet e inca deschisa (n=1 pe flota) — un audit livrat unui strain
// nu are voie sa prezinte o preferinta de casa nedovedita drept defect.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";
import type { Campanie } from "./gads-structure";

export type GrupAnunturi = {
  id: string;
  nume: string;
  campanie: string;
  stare: string;
  motive: string[];
  titluri: number;
  descrieri: number;
  imagini: number;
  video: number;
  semnale: number;
  /** Cate materiale are in total — 0 inseamna grup doar-feed, deliberat. */
  total: number;
};

export type CampaniePmax = {
  nume: string;
  /** Lista oficiala de brand activata pe campanie. */
  areListaBrand: boolean;
  negativeBrand: number;
  /** Google isi alege singur paginile de destinatie, in loc sa urmeze feed-ul. */
  extindereUrl: boolean;
};

export type ProblemaPmax = {
  cod: string;
  titlu: string;
  ron: number;
  detaliu: string;
  grad: "critic" | "costa" | "reglaj";
  exemple?: string[];
};

export type PmaxData = { campanii: CampaniePmax[]; grupuri: GrupAnunturi[] };
export type PmaxAudit = { probleme: ProblemaPmax[] };

const lei = (n: number) => `${Math.round(n).toLocaleString("ro-RO")} RON`;

/** Sub atatea materiale, un grup nu e nici doar-feed, nici construit — e abandonat la jumatate. */
const PRAG_SCHELET = 5;

export function analizeazaPmax(date: PmaxData, campanii: Campanie[]): PmaxAudit {
  const probleme: ProblemaPmax[] = [];
  const cost = new Map(campanii.map((c) => [c.nume, c.cost]));
  const eLive = new Set(campanii.filter((c) => c.status === "ENABLED").map((c) => c.nume));
  const live = date.campanii.filter((c) => eLive.has(c.nume));
  if (!live.length) return { probleme };

  // ── Google isi alege singur unde trimite clientul ──────────────────────────
  const cuExtindere = live.filter((c) => c.extindereUrl);
  if (cuExtindere.length) {
    const bani = cuExtindere.reduce((s, c) => s + (cost.get(c.nume) ?? 0), 0);
    probleme.push({
      cod: "extindere-url",
      titlu: `${cuExtindere.length === 1 ? "O campanie trimite" : `${cuExtindere.length} campanii trimit`} clientii pe pagini alese de Google`,
      ron: bani,
      grad: "costa",
      detaliu:
        `Cand extinderea automata a paginilor e pornita, Google nu se mai limiteaza la produsele ` +
        `din feed-ul tau: alege singur ce pagina de pe site arata, inclusiv pagini care nu vand ` +
        `nimic — articole, categorii goale, pagini de contact. Platesti clicuri catre ele exact ` +
        `ca pentru un produs.` +
        (bani > 0 ? ` Prin ${cuExtindere.length === 1 ? "campania" : "campaniile"} in cauza au trecut ${lei(bani)}.` : ""),
      exemple: cuExtindere.map((c) => c.nume),
    });
  }

  // ── PMax cumpara traficul pe numele tau ───────────────────────────────────
  const faraBrand = live.filter((c) => !c.areListaBrand && c.negativeBrand === 0);
  if (faraBrand.length) {
    probleme.push({
      cod: "pmax-fara-brand",
      titlu: `${faraBrand.length === 1 ? "O campanie" : `${faraBrand.length} campanii`} Performance Max cumpara traficul pe numele tau`,
      ron: faraBrand.reduce((s, c) => s + (cost.get(c.nume) ?? 0), 0),
      grad: "costa",
      detaliu:
        `Oamenii care cauta direct numele magazinului tau te-ar gasi oricum, pe cel mai ieftin ` +
        `click din cont. Fara protectie de brand, Performance Max liciteaza si pe ei — cu bani ` +
        `care ar fi trebuit sa aduca clienti noi. In rapoarte pare ca merge excelent, pentru ca ` +
        `raporteaza vanzarile unor oameni care veneau oricum.`,
      exemple: faraBrand.map((c) => c.nume),
    });
  }

  // ── Grupuri abandonate la jumatate ────────────────────────────────────────
  const numeLive = new Set(live.map((c) => c.nume));
  const grupuriLive = date.grupuri.filter((g) => numeLive.has(g.campanie) && g.stare !== "PAUSED");
  // Zero materiale = doar-feed, alegere legitima. Intre 1 si prag = nici una, nici alta.
  const schelet = grupuriLive.filter((g) => g.total > 0 && g.total < PRAG_SCHELET);
  if (schelet.length) {
    probleme.push({
      cod: "grup-schelet",
      titlu: `${schelet.length === 1 ? "Un grup de anunturi e ramas" : `${schelet.length} grupuri de anunturi sunt ramase`} la jumatate`,
      ron: 0,
      grad: "costa",
      detaliu:
        `Un grup fie nu are deloc materiale — si atunci Google promoveaza doar produsele din feed, ` +
        `ceea ce e o alegere valida — fie le are pe toate. Intre cele doua, Google nu are din ce ` +
        `construi reclama si ii reduce livrarea. Grupurile de mai jos au cateva materiale si atat.`,
      exemple: schelet.map(
        (g) => `${g.campanie} › ${g.nume} — ${g.total} ${g.total === 1 ? "material" : "materiale"}`
      ),
    });
  }

  // ── Grupuri franate de Google, invizibile in rapoarte ─────────────────────
  // CAMPAIGN_PAUSED nu e un defect al grupului: campania e oprita, atat.
  const franate = grupuriLive.filter(
    (g) =>
      (g.stare === "ENABLED" && g.motive.some((m) => m && m !== "CAMPAIGN_PAUSED")) ||
      g.motive.includes("ASSET_GROUP_LIMITED")
  );
  if (franate.length) {
    probleme.push({
      cod: "grup-franat",
      titlu: `${franate.length === 1 ? "Un grup de anunturi e franat" : `${franate.length} grupuri de anunturi sunt franate`} de Google`,
      ron: 0,
      grad: "reglaj",
      detaliu:
        `Google le limiteaza livrarea, de obicei pentru ca niste materiale au fost respinse. ` +
        `Nu apare nicaieri intr-un raport de performanta — campania arata doar "mai slaba" ` +
        `si nimeni nu stie de ce.`,
      exemple: franate.map((g) => `${g.campanie} › ${g.nume} — ${traduMotivGrup(g.motive)}`),
    });
  }

  const rang = { critic: 0, costa: 1, reglaj: 2 } as const;
  probleme.sort((a, b) => rang[a.grad] - rang[b.grad] || b.ron - a.ron);
  return { probleme };
}

function traduMotivGrup(motive: string[]): string {
  const t: Record<string, string> = {
    ASSET_GROUP_LIMITED: "materiale respinse de politicile Google",
    ASSET_GROUP_DISAPPROVED: "grup respins",
    ASSET_GROUP_PARTIALLY_LIMITED: "o parte din materiale, respinse",
    CAMPAIGN_PENDING: "campania nu a inceput inca",
    CAMPAIGN_ENDED: "campania s-a incheiat",
  };
  const curate = motive.filter((m) => m && m !== "CAMPAIGN_PAUSED");
  return curate.map((m) => t[m] ?? m.toLowerCase().replace(/_/g, " ")).join("; ") || "motiv neraportat";
}

// ─────────────────────────────────────────────────────────────────────────────

export async function fetchPmaxData(customerId: string, auth: GoogleAdsAuth): Promise<PmaxData> {
  type CampRow = {
    campaign?: {
      name?: string;
      brandGuidelinesEnabled?: boolean;
      assetAutomationSettings?: { assetAutomationType?: string; assetAutomationStatus?: string }[];
    };
  };
  type GrupRow = {
    assetGroup?: { id?: string; name?: string; status?: string; primaryStatus?: string; primaryStatusReasons?: string[] };
    campaign?: { name?: string };
  };
  type AsRow = { assetGroup?: { id?: string }; assetGroupAsset?: { fieldType?: string } };
  type SigRow = { assetGroupSignal?: { assetGroup?: string } };
  type NegRow = { campaign?: { name?: string }; campaignCriterion?: { keyword?: { text?: string } } };

  const [camp, grup, asset, semnal, neg] = await Promise.all([
    googleAdsSearch(
      customerId,
      `SELECT campaign.name, campaign.brand_guidelines_enabled, campaign.asset_automation_settings
       FROM campaign WHERE campaign.advertising_channel_type = 'PERFORMANCE_MAX'`,
      auth
    ) as Promise<CampRow[]>,
    googleAdsSearch(
      customerId,
      `SELECT asset_group.id, asset_group.name, asset_group.status, asset_group.primary_status,
       asset_group.primary_status_reasons, campaign.name FROM asset_group`,
      auth
    ) as Promise<GrupRow[]>,
    googleAdsSearch(
      customerId,
      "SELECT asset_group_asset.field_type, asset_group.id FROM asset_group_asset",
      auth
    ) as Promise<AsRow[]>,
    googleAdsSearch(
      customerId,
      "SELECT asset_group_signal.asset_group FROM asset_group_signal",
      auth
    ) as Promise<SigRow[]>,
    googleAdsSearch(
      customerId,
      `SELECT campaign.name, campaign_criterion.keyword.text FROM campaign_criterion
       WHERE campaign_criterion.negative = TRUE`,
      auth
    ) as Promise<NegRow[]>,
  ]);

  const negPeCampanie = new Map<string, number>();
  for (const r of neg) {
    const n = r.campaign?.name;
    if (n) negPeCampanie.set(n, (negPeCampanie.get(n) ?? 0) + 1);
  }

  const campanii: CampaniePmax[] = camp.map((r) => ({
    nume: r.campaign?.name ?? "(fara nume)",
    areListaBrand: r.campaign?.brandGuidelinesEnabled === true,
    negativeBrand: negPeCampanie.get(r.campaign?.name ?? "") ?? 0,
    extindereUrl: (r.campaign?.assetAutomationSettings ?? []).some(
      (a) =>
        a.assetAutomationType === "FINAL_URL_EXPANSION_TEXT_ASSET_AUTOMATION" &&
        a.assetAutomationStatus === "OPTED_IN"
    ),
  }));

  const perGrup = new Map<string, string[]>();
  for (const r of asset) {
    const id = r.assetGroup?.id;
    const tip = r.assetGroupAsset?.fieldType;
    if (!id || !tip) continue;
    perGrup.set(id, [...(perGrup.get(id) ?? []), tip]);
  }
  const semnalePerGrup = new Map<string, number>();
  for (const r of semnal) {
    // Semnalul refera grupul prin resource name: customers/X/assetGroups/<id>
    const id = r.assetGroupSignal?.assetGroup?.split("/").pop();
    if (id) semnalePerGrup.set(id, (semnalePerGrup.get(id) ?? 0) + 1);
  }

  const grupuri: GrupAnunturi[] = grup.map((r) => {
    const id = r.assetGroup?.id ?? "";
    const tipuri = perGrup.get(id) ?? [];
    const nr = (...t: string[]) => tipuri.filter((x) => t.includes(x)).length;
    return {
      id,
      nume: r.assetGroup?.name ?? "(fara nume)",
      campanie: r.campaign?.name ?? "",
      stare: r.assetGroup?.status ?? "UNKNOWN",
      motive: r.assetGroup?.primaryStatusReasons ?? [],
      titluri: nr("HEADLINE", "LONG_HEADLINE"),
      descrieri: nr("DESCRIPTION"),
      imagini: nr("MARKETING_IMAGE", "SQUARE_MARKETING_IMAGE", "PORTRAIT_MARKETING_IMAGE"),
      video: nr("YOUTUBE_VIDEO"),
      semnale: semnalePerGrup.get(id) ?? 0,
      total: tipuri.length,
    };
  });

  return { campanii, grupuri };
}
