// Totalurile contului pe 12 luni, exact cum le vede omul in Google Ads la "Toate campaniile".
//
// De ce exista fisierul asta: pagina de simulare promitea "pe cifrele tale din ultimele 12 luni",
// dar lua cheltuiala din `citesteStructura` — care intreaba `LAST_30_DAYS` — si o mai si impartea
// la 12. Pe MagazinFitness.ro (20.08.2026) iesea un buget de 989 RON/luna in loc de ~12.400, iar
// randamentul afisat era al ultimei luni, nu al anului. Cifra pe care prospectul o compara cu
// interfata trebuie sa fie cifra din interfata.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";
import { dateRange, WINDOW_DAYS } from "./gads-intake";

export type TotaluriAn = { cost: number; valoare: number; roas: number | null };

export type RandAn = { metrics?: { costMicros?: string | number; conversionsValue?: string | number } };

/**
 * Fara filtru de status: interfata arata "Toate campaniile", deci si noi.
 *
 * Interval explicit de date, NU `DURING LAST_365_DAYS`. Operatorul `DURING` accepta doar o lista
 * inchisa de constante, iar cea mai lunga e `LAST_30_DAYS` — pentru un an nu exista niciuna.
 * Scrisa cu `DURING LAST_365_DAYS`, interogarea raspundea de fiecare data cu
 * `INVALID_VALUE_WITH_DURING_OPERATOR`, iar raportul cadea tacut pe cifra din feed: pe
 * MagazinFitness.ro arata 129.195 RON in loc de totalul contului — exact cifra pe care prospectul
 * o compara cu interfata si n-o regaseste. Peste 30 de zile se folosesc date calendaristice.
 *
 * `campaign.id` are si el rostul lui: un SELECT format numai din metrici e respins.
 */
export function anQuery(from: string, to: string): string {
  return `SELECT campaign.id, metrics.cost_micros, metrics.conversions_value
          FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
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

/**
 * Nu aruncam: fara totaluri, paginile cad pe fereastra de 30 de zile.
 *
 * Dar nici nu tacem. Prima versiune inghitea eroarea fara urma, si de aceea o interogare gresita
 * a trecut neobservata pana cand cineva a comparat cifra cu interfata Google Ads. Un esec aici
 * schimba cifra de pe prima pagina a raportului, deci merita un rand in log.
 */
export async function citesteAn(
  customerId: string,
  auth: GoogleAdsAuth
): Promise<TotaluriAn | null> {
  try {
    const { from, to } = dateRange(new Date(), WINDOW_DAYS);
    const randuri = (await googleAdsSearch(customerId, anQuery(from, to), auth)) as RandAn[];
    const t = agregaAn(randuri);
    if (t.cost > 0) return t;
    console.error("[gads-an] totaluri pe 12 luni fara cheltuiala; raportul cade pe 30 de zile");
    return null;
  } catch (e) {
    console.error("[gads-an] totalurile pe 12 luni nu au putut fi citite:", e);
    return null;
  }
}
