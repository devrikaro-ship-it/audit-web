// The Google Ads API search used by the Google Ads audit (moved apart from the site reads on 2026-10-05).

import { gadsApiUrl } from "./gads-api";

export type GoogleAdsAuth = {
  accessToken: string;
  developerToken: string;
  /** MCC-ul din care se face cererea, cand contul e sub un manager. Fara cratime. */
  loginCustomerId?: string;
};

/**
 * Un search GAQL pe Google Ads API (REST), cu paginare. Versiunea vine din lib/gads-api.
 * NB: endpointul `search` nu accepta `pageSize` (PAGE_SIZE_NOT_SUPPORTED) — doar pageToken.
 * Aici, nu in intake, pentru ca acesta e singurul fisier care are voie sa atinga fetch().
 * READ-ONLY prin natura endpoint-ului: `search` doar citeste.
 */
/**
 * Cate interogari Google Ads lasam sa mearga deodata.
 *
 * Auditul completat trimite ~11 interogari in paralel. Masurat pe DeHome: fiecare interogare
 * dureaza sub o secunda luata separat (4s toate, una dupa alta), dar trimise toate odata
 * raportul ajungea la 20 de secunde — Google le temporizeaza, iar reincercarile noastre pun
 * peste inca 1,5 si 3 secunde de asteptare. Cu o coada scurta, paralelismul ramane util fara
 * sa se transforme in asteptare.
 */
const MAX_PARALEL = 4;
let inZbor = 0;
const coada: (() => void)[] = [];

async function ocupaLoc(): Promise<void> {
  if (inZbor < MAX_PARALEL) {
    inZbor++;
    return;
  }
  await new Promise<void>((elibereaza) => coada.push(elibereaza));
  inZbor++;
}

function elibereazaLoc(): void {
  inZbor--;
  coada.shift()?.();
}

export async function googleAdsSearch(
  customerId: string,
  query: string,
  auth: GoogleAdsAuth
): Promise<Record<string, unknown>[]> {
  await ocupaLoc();
  try {
    return await interogheaza(customerId, query, auth);
  } finally {
    elibereazaLoc();
  }
}

async function interogheaza(
  customerId: string,
  query: string,
  auth: GoogleAdsAuth
): Promise<Record<string, unknown>[]> {
  const cid = customerId.replace(/-/g, "");
  const url = gadsApiUrl(`customers/${cid}/googleAds:search`);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.accessToken}`,
    "developer-token": auth.developerToken,
    "Content-Type": "application/json",
  };
  if (auth.loginCustomerId) headers["login-customer-id"] = auth.loginCustomerId.replace(/-/g, "");

  const rows: Record<string, unknown>[] = [];
  let pageToken: string | undefined;
  do {
    // Reincercare pe erori trecatoare. Motivul e concret: pe un catalog de ~15.000 de produse
    // (deci multe pagini) Google a intors o data 400 UNSUPPORTED_VERSION pe o versiune care
    // functiona inainte si dupa. Fara reincercare, o singura eroare de moment rupe tot auditul
    // prospectului si el vede o pagina de eroare in loc de raport.
    let res: Response | null = null;
    let ultimaEroare = "";
    for (let incercare = 0; incercare < 3; incercare++) {
      if (incercare > 0) await new Promise((r) => setTimeout(r, 1500 * incercare));
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 60000); // cataloagele mari sunt lente
      try {
        res = await fetch(url, {
          method: "POST",
          headers,
          signal: ctrl.signal,
          body: JSON.stringify({ query, pageToken }),
        });
      } catch (e) {
        ultimaEroare = e instanceof Error ? e.message : String(e);
        res = null;
        continue;
      } finally {
        clearTimeout(timer);
      }
      if (res.ok) break;
      ultimaEroare = `${res.status}: ${(await res.text().catch(() => "")).slice(0, 400)}`;
      // 4xx care nu e limita de rata inseamna cerere gresita — nu are rost sa insistam.
      if (res.status >= 400 && res.status < 500 && res.status !== 429 && !/UNSUPPORTED_VERSION|INTERNAL/i.test(ultimaEroare)) break;
      res = null;
    }
    if (!res || !res.ok) throw new Error(`Google Ads API ${ultimaEroare}`);

    const json = (await res.json()) as { results?: Record<string, unknown>[]; nextPageToken?: string };
    if (json.results) rows.push(...json.results);
    pageToken = json.nextPageToken;
  } while (pageToken);

  return rows;
}
