// LANG: pending full translation to EN
"use server";

import { href } from "@/shared/route-table";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  unseal,
  seal,
  SESSION_COOKIE,
  cookieOptions,
  validateCurrencyCode,
} from "@/modules/google-ads/model/data/session";
import {
  accessTokenFrom,
  fetchCustomerReportMetadata as fetchCustomerTimeZoneAndCurrency,
  oauthConfig,
} from "@/modules/google-ads/model/data/oauth";
import { demoAccounts, demoOn } from "@/modules/google-ads/model/data/demo";
import { runGoogleAdsRead } from "@/shared/public-contract/read-disclosure";

/** Salveaza contul ales in sesiune si trece la pasul urmator (marja). */
export async function alegeCont(formData: FormData) {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect(`${href("gadsConnect")}?eroare=sesiune`);

  const customerId = String(formData.get("customerId") ?? "").replace(/\D/g, "");
  if (!customerId) redirect(href("gadsAccounts"));
  const loginCustomerId = String(formData.get("loginCustomerId") ?? "").replace(/\D/g, "") || undefined;
  const customerReportMetadata = demoOn()
    ? {
        timeZone: "UTC",
        currencyCode: validateCurrencyCode(
          demoAccounts().find((account) => account.customerId === customerId)?.currency,
        ),
      }
    : await runGoogleAdsRead("fetchCustomerTimeZone", async () => fetchCustomerTimeZoneAndCurrency(customerId, {
        accessToken: await accessTokenFrom(session.refreshToken),
        developerToken: oauthConfig().developerToken,
        loginCustomerId,
      })).catch(() => redirect(`${href("gadsAccounts")}?eroare=cont`));

  jar.set(
    SESSION_COOKIE,
    seal({
      refreshToken: session.refreshToken,
      website: session.website,
      customerId,
      customerName: String(formData.get("name") ?? "") || undefined,
      customerTimeZone: customerReportMetadata.timeZone,
      currencyCode: customerReportMetadata.currencyCode,
      loginCustomerId,
      marginPct: session.marginPct,
      marginStatus: session.marginStatus,
    }),
    cookieOptions()
  );
  redirect(href("gadsMargin"));
}
