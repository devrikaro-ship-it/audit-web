// LANG: pending full translation to EN
// Starea masurarii din contul conectat. Se citeste INAINTE de a judeca performanta.
//
// De ce exista fisierul asta: Google liciteaza pe ce ii spui tu ca e important. Daca in cont
// sunt marcate ca "principale" actiuni care nu sunt vanzare (vizionari YouTube, cereri de
// indicatii rutiere, vizualizari de pagina), atunci algoritmul cumpara clicuri de la oamenii
// care fac ALEA, iar rapoartele arata 0 vanzari acolo unde poate exista vanzare.
//
// Consecinta pentru audit: pe un cont cu masurare stricata, "produsul X nu vinde" e o
// acuzatie falsa. Verificat pe puria (06-08-2026): 3 din 4 conversii principale erau
// YouTube/Directions, while the account reported zero value on 1,236 RON over 365 days.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";

/** Categorii care NU sunt vanzare — daca sunt principale, bidding-ul invata gresit. */
export const NOT_A_SALE = new Set([
  "ENGAGEMENT",
  "YOUTUBE_FOLLOW_ON_VIEWS",
  "YOUTUBE_FOLLOW_ON_SUBSCRIBES",
  "GET_DIRECTIONS",
  "PAGE_VIEW",
  "OUTBOUND_CLICK",
  "DEFAULT",
]);

export type ConversionAction = {
  name: string;
  category: string;
  primary: boolean;
};

export type TrackingState = {
  ok: boolean;
  conversions: ConversionAction[];
  /** Actiunile principale care nu sunt vanzare — motivul concret, pe numele lor. */
  junkPrimary: ConversionAction[];
  /** Exista macar o conversie de vanzare marcata principala? */
  hasSalePrimary: boolean;
  reasons: string[];
};

/** Judeca starea masurarii din lista de conversii. Pur, ca sa poata fi testat. */
export function assessTracking(conversions: ConversionAction[]): TrackingState {
  const junkPrimary = conversions.filter((c) => c.primary && NOT_A_SALE.has(c.category));
  const hasSalePrimary = conversions.some((c) => c.primary && c.category === "PURCHASE");

  const reasons: string[] = [];
  if (junkPrimary.length) {
    reasons.push(
      `${junkPrimary.length} actiuni marcate ca principale nu sunt vanzari: ` +
        junkPrimary.map((c) => `"${c.name}"`).join(", ")
    );
  }
  if (!hasSalePrimary) {
    reasons.push("nicio vanzare (Purchase) nu e marcata ca actiune principala");
  }
  if (!conversions.length) {
    reasons.push("contul nu are nicio conversie activa configurata");
  }

  return { ok: reasons.length === 0, conversions, junkPrimary, hasSalePrimary, reasons };
}

export async function fetchTracking(
  customerId: string,
  auth: GoogleAdsAuth
): Promise<TrackingState> {
  type Row = {
    conversionAction?: { name?: string; category?: string; primaryForGoal?: boolean };
  };
  const rows = (await googleAdsSearch(
    customerId,
    `SELECT conversion_action.name, conversion_action.category,
     conversion_action.primary_for_goal
     FROM conversion_action WHERE conversion_action.status = 'ENABLED'`,
    auth
  )) as Row[];

  return assessTracking(
    rows.map((r) => ({
      name: r.conversionAction?.name ?? "(fara nume)",
      category: r.conversionAction?.category ?? "UNKNOWN",
      // Google omite campurile false din raspunsul REST, deci lipsa === false.
      primary: r.conversionAction?.primaryForGoal === true,
    }))
  );
}
