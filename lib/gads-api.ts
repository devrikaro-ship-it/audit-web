/**
 * Singurul loc care stie ce versiune de Google Ads API chemam.
 *
 * De ce exista fisierul asta: pe 19.08.2026 auditul a picat pe cont real cu
 * "listare conturi esuata: 404 <!DOCTYPE html> ... Error 404 (Not Found)". Nu era o
 * problema de permisiuni — Google retrasese v21, pe care o aveam scrisa de mana in doua
 * fisiere. Cand o versiune moare, API-ul nu raspunde cu o eroare JSON explicativa, ci cu
 * pagina HTML de 404 a Google, care in interfata noastra arata ca "contul nu are acces".
 *
 * Google tine o versiune cam un an si publica una noua la ~4 luni, deci ziua asta se
 * repeta. De aceea: un singur loc de schimbat, plus `GADS_API_VERSION` in mediu, ca pe
 * server sa se poata muta fara sa asteptam un build.
 *
 * Cum verifici, si de ce nu e de ajuns un curl:
 *   curl -s -o /dev/null -w "%{http_code}" https://googleads.googleapis.com/v23/customers:listAccessibleCustomers
 *   404 = versiunea a fost retrasa (raspunsul e pagina HTML a Google, nu JSON).
 *   401 = versiunea e rutata — DAR nimic mai mult: autentificarea raspunde inainte ca Google
 *   sa verifice metoda, deci o versiune prea NOUA da tot 401 aici si abia cu token real
 *   arata `404 {"error":{"message":"Method not found."}}`. Proba adevarata cere token.
 */

/**
 * Verificat pe 19.08.2026, in doi pasi:
 *  - fara token: v21 si mai vechi -> 404 (pagina HTML = versiunea nu mai exista);
 *    v22..v26 -> 401. ATENTIE: 401 vine de la autentificare, INAINTE ca Google sa se uite
 *    daca metoda exista — deci nu dovedeste decat ca versiunea traieste.
 *  - cu token real, pe cont adevarat: v26 raspunde
 *    `404 {"error":{"code":404,"message":"Method not found."}}` la listAccessibleCustomers.
 *    Adica versiunea e rutata, dar metoda nu e in ea.
 * v23 e cea mai noua versiune pentru care metoda e documentata explicit
 * (developers.google.com/google-ads/api/reference/rpc/v23/CustomerService/ListAccessibleCustomers).
 */
const IMPLICIT = "v23";

export function gadsApiVersion(): string {
  const v = process.env.GADS_API_VERSION?.trim();
  if (!v) return IMPLICIT;
  if (!/^v\d+$/.test(v)) {
    throw new Error(`GADS_API_VERSION are o valoare invalida: "${v}". Se asteapta forma vNN, de exemplu ${IMPLICIT}.`);
  }
  return v;
}

export function gadsApiUrl(cale: string): string {
  return `https://googleads.googleapis.com/${gadsApiVersion()}/${cale}`;
}
