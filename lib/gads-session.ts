// LANG: pending full translation to EN
// Sesiunea prospectului in fluxul de audit Google Ads.
//
// Deliberat FARA dependinta noua (iron-session & co): tot ce trebuie e un cookie httpOnly
// semnat, iar semnatura o face `node:crypto` din stdlib. Cookie-ul tine refresh token-ul
// prospectului, deci: httpOnly (JS din pagina nu-l poate citi), Secure in productie,
// SameSite=Lax (supravietuieste redirectului de intoarcere de la Google).
//
// Ce NU facem: nu scriem tokenul in baza de date. Auditul se ruleaza cat timp omul e pe
// site; dupa aceea accesul nu ne mai trebuie, iar un token stocat degeaba e o raspundere.

import { createHmac, timingSafeEqual } from "node:crypto";
import { parseGrossMargin, requireGrossMargin } from "./gads-margin";

export { GROSS_MARGIN_ERROR, parseGrossMargin, requireGrossMargin } from "./gads-margin";

export const SESSION_COOKIE = "gads_session";
/** O ora: destul pentru un audit, nu destul cat sa devina un token uitat prin browser. */
export const SESSION_MAX_AGE = 60 * 60;

export type GadsSession = {
  refreshToken: string;
  /** Contul ales de prospect, cand a ajuns la pasul ala. */
  customerId?: string;
  /** Numele contului, doar ca sa-l putem afisa fara inca un apel. */
  customerName?: string;
  /** IANA time zone reported by Google Ads for account-calendar date boundaries. */
  customerTimeZone?: string;
  /** Managerul prin care contul e accesibil (login-customer-id la interogari). */
  loginCustomerId?: string;
  /** Marja confirmata de om (procent). Lipsa = inca n-a raspuns. */
  marginPct?: number;
  exp: number;
};

function secret(): string {
  const s = process.env.GADS_SESSION_SECRET;
  if (!s) {
    // In productie refuzam sa semnam cu o valoare cunoscuta public.
    if (process.env.NODE_ENV === "production") {
      throw new Error("GADS_SESSION_SECRET lipseste — sesiunile nu pot fi semnate");
    }
    return "dev-only-nu-folosi-in-productie";
  }
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function seal(session: Omit<GadsSession, "exp">): string {
  if (session.marginPct !== undefined) requireGrossMargin(session.marginPct);
  const withExp: GadsSession = { ...session, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
  const payload = Buffer.from(JSON.stringify(withExp)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Intoarce sesiunea doar daca semnatura e valida SI nu a expirat. Altfel null. */
export function unseal(raw: string | undefined): GadsSession | null {
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx < 1) return null;
  const payload = raw.slice(0, idx);
  const got = raw.slice(idx + 1);
  const want = sign(payload);
  // Comparatie in timp constant: altfel semnatura se poate ghici caracter cu caracter.
  const a = Buffer.from(got);
  const b = Buffer.from(want);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as GadsSession;
    if (!s.refreshToken || s.exp * 1000 < Date.now()) return null;
    if (s.marginPct !== undefined && parseGrossMargin(s.marginPct) === null) delete s.marginPct;
    return s;
  } catch {
    return null;
  }
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}
