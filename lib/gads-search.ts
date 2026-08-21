// Campaniile Search. Pe un magazin, Search e stratul mic (protectia numelui), dar are doua
// feluri de a fi rupt care nu se vad in niciun raport de performanta.
//
// Doctrina (google-ads-optimize, general/CHECKLIST.md sectiunea 6):
//   6.4 — cel putin o reclama responsive (RSA) in fiecare grup activ; zero reclame de tip vechi
//         (ETA / EDSA) inca pornite. Un grup fara RSA nu are cu ce sa se afiseze ca lumea, iar
//         reclamele vechi ascund faptul ca grupul n-are una moderna.
//   6.5 — BROAD + Manual CPC e BMM mostenit, NU o incalcare de "broad fara Smart Bidding".
//         De aceea nu raportam potrivirea larga in sine.
//   6.6 — orice campanie DSA sau pe potrivire larga intra in migrarea automata catre AI Max,
//         anuntata de Google pentru 2026. O campanie care se muta singura fara pregatire e o
//         schimbare de comportament peste care nimeni nu si-a dat acordul.
//
// Verificat live (06-08-2026): DeHome si Granox sunt CURATE aici — RSA in fiecare grup activ,
// nicio reclama veche care sa livreze, AI Max nepornit. Modulul a fost validat pe cazul negativ.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";

/** Tipurile scoase din uz de Google, care nu mai livreaza ca inainte. */
const RECLAME_VECHI = new Set(["EXPANDED_TEXT_AD", "EXPANDED_DYNAMIC_SEARCH_AD"]);

export type ReclamaSearch = {
  campanie: string;
  campanieActiva: boolean;
  canal: string;
  grup: string;
  grupActiv: boolean;
  tip: string;
  activa: boolean;
};

export type CampanieSearch = {
  nume: string;
  activa: boolean;
  /** SEARCH_DYNAMIC = campanie dinamica (DSA). */
  subtip: string | null;
  aiMax: boolean;
  /** Are cuvinte pe potrivire larga. */
  potrivireLarga: boolean;
};

export type ProblemaSearch = {
  cod: string;
  titlu: string;
  ron: number;
  detaliu: string;
  grad: "critic" | "costa" | "reglaj";
  exemple?: string[];
};

export type SearchData = { campanii: CampanieSearch[]; reclame: ReclamaSearch[] };
export type SearchAudit = { probleme: ProblemaSearch[] };

export function analizeazaSearch(date: SearchData): SearchAudit {
  const probleme: ProblemaSearch[] = [];

  // Doar ce livreaza acum. Un grup rupt intr-o campanie oprita nu costa nimic pe nimeni.
  const vii = date.reclame.filter((r) => r.campanieActiva && r.canal === "SEARCH");

  // ── 6.4a: grup activ fara nicio reclama responsive ────────────────────────
  const grupuri = new Map<string, ReclamaSearch[]>();
  for (const r of vii.filter((x) => x.grupActiv)) {
    const cheie = `${r.campanie} › ${r.grup}`;
    grupuri.set(cheie, [...(grupuri.get(cheie) ?? []), r]);
  }
  const faraRsa = [...grupuri.entries()].filter(
    ([, rec]) => !rec.some((r) => r.tip === "RESPONSIVE_SEARCH_AD" && r.activa)
  );
  if (faraRsa.length) {
    probleme.push({
      cod: "grup-fara-rsa",
      titlu: `${faraRsa.length === 1 ? "Un grup de reclame nu are" : `${faraRsa.length} grupuri de reclame nu au`} nicio reclama moderna`,
      ron: 0,
      grad: "costa",
      detaliu:
        `Reclamele responsive sunt singurul format pe care Google il mai construieste pentru ` +
        `cautari: le combina titlurile si descrierile dupa ce cauta omul. Un grup fara asa ceva ` +
        `fie nu se afiseaza deloc, fie se afiseaza cu un text fix care pierde in fata ` +
        `concurentilor, la orice suma ai licita.`,
      exemple: faraRsa.map(([cheie]) => cheie),
    });
  }

  // ── 6.4b: reclame de tip vechi inca pornite ───────────────────────────────
  const vechi = vii.filter((r) => r.activa && RECLAME_VECHI.has(r.tip));
  if (vechi.length) {
    probleme.push({
      cod: "reclame-vechi",
      titlu: `${vechi.length === 1 ? "O reclama de tip vechi e inca" : `${vechi.length} reclame de tip vechi sunt inca`} pornita in cont`,
      ron: 0,
      grad: "reglaj",
      detaliu:
        `Google a scos din uz formatul asta de reclama. Ramase pornite, nu aduc trafic, dar dau ` +
        `impresia ca grupul are reclame — asa ca nimeni nu observa ca de fapt nu mai are.`,
      exemple: [...new Set(vechi.map((r) => `${r.campanie} › ${r.grup}`))],
    });
  }

  // ── 6.6: campanii care se muta singure pe AI Max ──────────────────────────
  const expuse = date.campanii.filter(
    (c) => c.activa && !c.aiMax && (c.subtip === "SEARCH_DYNAMIC" || c.potrivireLarga)
  );
  if (expuse.length) {
    probleme.push({
      cod: "ai-max-expunere",
      titlu:
        expuse.length === 1
          ? `O campanie urmeaza sa fie mutata automat de Google pe alt mod de functionare`
          : `${expuse.length} campanii urmeaza sa fie mutate automat de Google pe alt mod de functionare`,
      ron: 0,
      grad: "reglaj",
      detaliu:
        `Google muta in cursul lui 2026 campaniile dinamice si pe cele pe potrivire larga catre ` +
        `noul mod AI Max, in care alege singur pentru ce cautari si pe ce pagini se afiseaza. ` +
        `Pe un cont nepregatit — fara o lista solida de cuvinte blocate — asta inseamna ca incepe ` +
        `sa cumpere trafic pe care azi nu il cumpara, fara ca cineva sa fi decis asta.`,
      exemple: expuse.map((c) => c.nume),
    });
  }

  const rang = { critic: 0, costa: 1, reglaj: 2 } as const;
  probleme.sort((a, b) => rang[a.grad] - rang[b.grad] || b.ron - a.ron);
  return { probleme };
}

// ─────────────────────────────────────────────────────────────────────────────

export async function fetchSearchData(
  customerId: string,
  auth: GoogleAdsAuth
): Promise<SearchData> {
  type CampRow = {
    campaign?: {
      name?: string;
      status?: string;
      advertisingChannelSubType?: string;
      aiMaxSetting?: { enableAiMax?: boolean };
    };
  };
  type AdRow = {
    campaign?: { name?: string; status?: string; advertisingChannelType?: string };
    adGroup?: { name?: string; status?: string };
    adGroupAd?: { status?: string; ad?: { type?: string } };
  };
  type KwRow = {
    campaign?: { name?: string };
    adGroupCriterion?: { keyword?: { matchType?: string }; status?: string };
  };

  const [camp, ads, kw] = await Promise.all([
    googleAdsSearch(
      customerId,
      `SELECT campaign.name, campaign.status, campaign.advertising_channel_sub_type,
       campaign.ai_max_setting.enable_ai_max
       FROM campaign WHERE campaign.advertising_channel_type = 'SEARCH'`,
      auth
    ).catch(() => [] as CampRow[]) as Promise<CampRow[]>,
    googleAdsSearch(
      customerId,
      `SELECT ad_group.name, ad_group.status, ad_group_ad.ad.type, ad_group_ad.status,
       campaign.name, campaign.status, campaign.advertising_channel_type FROM ad_group_ad`,
      auth
    ).catch(() => [] as AdRow[]) as Promise<AdRow[]>,
    googleAdsSearch(
      customerId,
      `SELECT campaign.name, ad_group_criterion.keyword.match_type, ad_group_criterion.status
       FROM keyword_view WHERE campaign.status = 'ENABLED'`,
      auth
    ).catch(() => [] as KwRow[]) as Promise<KwRow[]>,
  ]);

  const cuLarga = new Set(
    kw
      .filter((r) => r.adGroupCriterion?.keyword?.matchType === "BROAD" && r.adGroupCriterion?.status === "ENABLED")
      .map((r) => r.campaign?.name ?? "")
  );

  return {
    campanii: camp.map((r) => ({
      nume: r.campaign?.name ?? "(fara nume)",
      activa: r.campaign?.status === "ENABLED",
      subtip: r.campaign?.advertisingChannelSubType ?? null,
      aiMax: r.campaign?.aiMaxSetting?.enableAiMax === true,
      potrivireLarga: cuLarga.has(r.campaign?.name ?? ""),
    })),
    reclame: ads.map((r) => ({
      campanie: r.campaign?.name ?? "",
      campanieActiva: r.campaign?.status === "ENABLED",
      canal: r.campaign?.advertisingChannelType ?? "",
      grup: r.adGroup?.name ?? "",
      grupActiv: r.adGroup?.status === "ENABLED",
      tip: r.adGroupAd?.ad?.type ?? "UNKNOWN",
      activa: r.adGroupAd?.status === "ENABLED",
    })),
  };
}
