// Totalurile contului pe 12 luni, exact cum le vede omul in Google Ads la "Toate campaniile".
//
// De ce exista fisierul asta: pagina de simulare promitea "pe cifrele tale din ultimele 12 luni",
// dar lua cheltuiala din `citesteStructura` — care intreaba `LAST_30_DAYS` — si o mai si impartea
// la 12. Pe MagazinFitness.ro (20.08.2026) iesea un buget de 989 RON/luna in loc de ~12.400, iar
// randamentul afisat era al ultimei luni, nu al anului. Cifra pe care prospectul o compara cu
// interfata trebuie sa fie cifra din interfata.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";

export type TotaluriAn = { cost: number; valoare: number; roas: number | null };

export type RandAn = { metrics?: { costMicros?: string | number; conversionsValue?: string | number } };

/** Fara filtru de status: interfata arata "Toate campaniile", deci si noi. */
export function anQuery(): string {
  return `SELECT metrics.cost_micros, metrics.conversions_value
          FROM campaign WHERE segments.date DURING LAST_365_DAYS`;
}

export function agregaAn(randuri: RandAn[]): TotaluriAn {
  let cost = 0;
  let valoare = 0;
  for (const r of randuri) {
    cost += Number(r.metrics?.costMicros ?? 0) / 1_000_000;
    valoare += Number(r.metrics?.conversionsValue ?? 0);
  }
  return { cost, valoare, roas: cost > 0 ? valoare / cost : null };
}

/**
 * Cat cheltuie pe luna. Cu totalurile pe an: anul / 12. Fara ele, cheltuiala ultimelor 30 de
 * zile ESTE cheltuiala unei luni — nu se mai imparte inca o data.
 */
export function bugetLunarDin(an: TotaluriAn | null, cheltuiala30z = 0): number {
  if (an && an.cost > 0) return Math.round(an.cost / 12);
  return Math.round(cheltuiala30z);
}

/** Nu aruncam: fara totaluri, paginile cad pe fereastra de 30 de zile. */
export async function citesteAn(
  customerId: string,
  auth: GoogleAdsAuth
): Promise<TotaluriAn | null> {
  try {
    const randuri = (await googleAdsSearch(customerId, anQuery(), auth)) as RandAn[];
    const t = agregaAn(randuri);
    return t.cost > 0 ? t : null;
  } catch {
    return null;
  }
}
