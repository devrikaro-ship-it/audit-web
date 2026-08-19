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
 * Cum afli rapid ce mai e viu (fara token, doar dupa codul de raspuns):
 *   401 = versiunea exista, 404 = a fost retrasa
 *   curl -s -o /dev/null -w "%{http_code}" https://googleads.googleapis.com/v26/customers:listAccessibleCustomers
 */

/** Verificat pe 19.08.2026: v21 si mai vechi -> 404; v22..v26 -> 401; v27 nu exista inca. */
const IMPLICIT = "v26";

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
