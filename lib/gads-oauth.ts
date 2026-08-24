// LANG: pending full translation to EN
// Google exposes only the broad `adwords` OAuth scope. This application enforces non-mutating
// behavior by implementing read operations only; the scope itself is not read-only.
//
// Un singur scope: `adwords`. Nu cerem Gmail, nu cerem Drive, nu cerem profil — cu cat lista
// de permisiuni e mai scurta, cu atat mai putini oameni abandoneaza ecranul de consimtamant.
//
// `access_type=offline` + `prompt=consent` ne dau refresh token de fiecare data. Fara
// `prompt=consent`, Google trimite refresh token DOAR la prima autorizare, iar un prospect
// care revine a doua oara ar ramane fara — bug clasic, greu de reprodus la testare.

import { googleAdsSearch, type GoogleAdsAuth } from "./net";
import { demoOn } from "./gads-demo";
import { gadsApiUrl } from "./gads-api";

export const SCOPE = "https://www.googleapis.com/auth/adwords";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export function oauthConfig() {
  const clientId = process.env.GADS_OAUTH_CLIENT_ID ?? "";
  const clientSecret = process.env.GADS_OAUTH_CLIENT_SECRET ?? "";
  const developerToken = process.env.GADS_DEVELOPER_TOKEN ?? "";
  const redirectUri =
    process.env.GADS_REDIRECT_URI ?? "http://localhost:3000/api/google-ads/callback";
  return { clientId, clientSecret, developerToken, redirectUri };
}

/** Ce lipseste ca fluxul sa poata rula — pentru o pagina de eroare cinstita, nu un 500 sec. */
export function missingConfig(): string[] {
  // In demo nu vorbim cu Google deloc, deci nu lipseste nimic.
  if (demoOn()) return [];
  const c = oauthConfig();
  const out: string[] = [];
  if (!c.clientId) out.push("GADS_OAUTH_CLIENT_ID");
  if (!c.clientSecret) out.push("GADS_OAUTH_CLIENT_SECRET");
  if (!c.developerToken) out.push("GADS_DEVELOPER_TOKEN");
  return out;
}

export function authUrl(state: string): string {
  const c = oauthConfig();
  const p = new URLSearchParams({
    client_id: c.clientId,
    redirect_uri: c.redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_URL}?${p}`;
}

export async function exchangeCode(code: string): Promise<{ refreshToken: string; accessToken: string }> {
  const c = oauthConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      redirect_uri: c.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`schimb de cod esuat: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const j = (await res.json()) as { refresh_token?: string; access_token?: string };
  if (!j.refresh_token || !j.access_token) throw new Error("Google nu a intors refresh token");
  return { refreshToken: j.refresh_token, accessToken: j.access_token };
}

/** Access token-urile traiesc ~1h; sesiunea tine refresh token-ul si reimprospateaza la nevoie. */
export async function accessTokenFrom(refreshToken: string): Promise<string> {
  const c = oauthConfig();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: c.clientId,
      client_secret: c.clientSecret,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`reimprospatare token esuata: ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

export type AccessibleAccount = {
  customerId: string;
  name: string;
  manager: boolean;
  currency: string;
  /**
   * Contul-radacina prin care avem acces la el. Obligatoriu la interogari: fara
   * `login-customer-id`, un cont aflat sub un manager raspunde USER_PERMISSION_DENIED.
   * Se retine per cont, NU se hardcodeaza MCC-ul nostru — prospectul are managerul lui.
   */
  loginCustomerId: string;
};

export function validateCustomerTimeZone(value: string | undefined): string {
  if (!value) throw new Error("Google Ads account time zone is unavailable");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
  } catch {
    throw new Error("Google Ads account time zone is invalid");
  }
  return value;
}

export async function fetchCustomerTimeZone(
  customerId: string,
  auth: GoogleAdsAuth
): Promise<string> {
  type Row = { customer?: { timeZone?: string } };
  const rows = (await googleAdsSearch(
    customerId,
    "SELECT customer.time_zone FROM customer LIMIT 1",
    auth
  )) as Row[];
  return validateCustomerTimeZone(rows[0]?.customer?.timeZone);
}

/**
 * Conturile pe care le poate audita omul asta. `customer_client` cere un cont-radacina, deci
 * pornim de la lista bruta de resurse accesibile si intrebam fiecare radacina ce are sub ea.
 * Conturile de tip manager le pastram marcate: nu au date proprii de Shopping, dar trebuie
 * afisate ca sa se inteleaga structura.
 */
export async function listAccounts(accessToken: string): Promise<AccessibleAccount[]> {
  const c = oauthConfig();
  const res = await fetch(gadsApiUrl("customers:listAccessibleCustomers"), {
    headers: { Authorization: `Bearer ${accessToken}`, "developer-token": c.developerToken },
  });
  if (!res.ok) throw new Error(`listare conturi esuata: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const { resourceNames = [] } = (await res.json()) as { resourceNames?: string[] };

  const out: AccessibleAccount[] = [];
  const seen = new Set<string>();
  for (const rn of resourceNames) {
    const rootId = rn.split("/")[1];
    if (!rootId) continue;
    const auth: GoogleAdsAuth = { accessToken, developerToken: c.developerToken, loginCustomerId: rootId };
    try {
      type Row = { customerClient?: { id?: string; descriptiveName?: string; manager?: boolean; currencyCode?: string } };
      const rows = (await googleAdsSearch(
        rootId,
        `SELECT customer_client.id, customer_client.descriptive_name,
         customer_client.manager, customer_client.currency_code
         FROM customer_client WHERE customer_client.status = 'ENABLED'`,
        auth
      )) as Row[];
      for (const r of rows) {
        const id = r.customerClient?.id;
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push({
          customerId: id,
          name: r.customerClient?.descriptiveName || `Cont ${id}`,
          manager: r.customerClient?.manager === true,
          currency: r.customerClient?.currencyCode || "RON",
          loginCustomerId: rootId,
        });
      }
    } catch {
      // Un cont-radacina inaccesibil nu trebuie sa doboare toata lista.
      if (!seen.has(rootId)) {
        seen.add(rootId);
        out.push({ customerId: rootId, name: `Cont ${rootId}`, manager: false, currency: "RON", loginCustomerId: rootId });
      }
    }
  }
  // Conturile reale sus, managerele jos — omul cauta magazinul lui, nu structura de agentie.
  return out.sort((a, b) => Number(a.manager) - Number(b.manager) || a.name.localeCompare(b.name));
}
