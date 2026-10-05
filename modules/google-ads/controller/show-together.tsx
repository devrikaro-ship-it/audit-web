import { href } from "@/shared/route-table";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseGrossMargin, unseal, SESSION_COOKIE } from "@/modules/google-ads/model/data/session";
import { accessTokenFrom, oauthConfig } from "@/modules/google-ads/model/data/oauth";
import { fetchStructura } from "@/modules/google-ads/model/data/structure";
import { runGoogleAdsRead } from "@/shared/public-contract/read-disclosure";
import { citesteAn, type TotaluriAn } from "@/modules/google-ads/model/data/an";
import { demoOn, demoData } from "@/modules/google-ads/model/data/demo";
import { bugetLunarDin } from "@/modules/google-ads/model/data/an";
import { isValidElement, type ReactElement } from "react";
import { TogetherView } from "@/modules/google-ads/view/together";

/**
 * Cheltuiala si randamentul contului — singurele doua cifre de care are nevoie proiectia.
 * The 365-day totals match the account-calendar window shown in the audit; structure remains for
 * cazul in care interogarea pe an nu raspunde.
 */
async function citesteCifre(
  refreshToken: string,
  customerId: string,
  customerTimeZone: string,
  loginCustomerId?: string
) {
  if (demoOn()) return { structura: demoData().structura, an: null as TotaluriAn | null };

  const cfg = oauthConfig();
  const token = await accessTokenFrom(refreshToken).catch(() => null);
  if (!token) redirect(`${href("gadsConnect")}?eroare=expirat`);

  const auth = { accessToken: token, developerToken: cfg.developerToken, loginCustomerId };
  const [structura, an] = await Promise.all([
    runGoogleAdsRead("fetchStructura", () => fetchStructura(customerId, auth).catch(() => null)),
    runGoogleAdsRead("citesteAn", () => citesteAn(customerId, auth, customerTimeZone)),
  ]);
  return { structura, an };
}

export async function loadTogether() {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect(`${href("gadsConnect")}?eroare=sesiune`);
  if (!session.customerId) redirect(href("gadsAccounts"));
  if (!session.customerTimeZone) redirect(href("gadsAccounts"));
  const marginPct = parseGrossMargin(session.marginPct);
  if (marginPct === null) redirect(session.marginStatus === "invalid" ? `${href("gadsMargin")}?eroare=marja` : href("gadsMargin"));
  const { structura, an } = await citesteCifre(
    session.refreshToken,
    session.customerId,
    session.customerTimeZone,
    session.loginCustomerId
  );
  return { marginPct, structura, an, demo: demoOn(), bugetLunar: structura ? bugetLunarDin(an, structura.cheltuialaTotala) : 0 };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type TogetherProps = Exclude<Awaited<ReturnType<typeof loadTogether>>, ReactElement>;

export async function showTogether() {
  const loaded = await loadTogether();
  return isValidElement(loaded) ? loaded : <TogetherView {...(loaded as TogetherProps)} />;
}

export const metadata = { title: "Ce ar insemna cu Devrika · Audit Google Ads Devrika" };
