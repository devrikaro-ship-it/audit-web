// LANG: pending full translation to EN
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unseal, seal, SESSION_COOKIE, cookieOptions } from "@/lib/gads-session";
import { accessTokenFrom, fetchCustomerTimeZone, oauthConfig } from "@/lib/gads-oauth";
import { demoOn } from "@/lib/gads-demo";
import { runGoogleAdsRead } from "@/lib/gads-read-disclosure";

/** Salveaza contul ales in sesiune si trece la pasul urmator (marja). */
export async function alegeCont(formData: FormData) {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/google-ads/connect?eroare=sesiune");

  const customerId = String(formData.get("customerId") ?? "").replace(/\D/g, "");
  if (!customerId) redirect("/google-ads/conturi");
  const loginCustomerId = String(formData.get("loginCustomerId") ?? "").replace(/\D/g, "") || undefined;
  const customerTimeZone = demoOn()
    ? "UTC"
    : await runGoogleAdsRead("fetchCustomerTimeZone", async () => fetchCustomerTimeZone(customerId, {
        accessToken: await accessTokenFrom(session.refreshToken),
        developerToken: oauthConfig().developerToken,
        loginCustomerId,
      })).catch(() => redirect("/google-ads/conturi?eroare=cont"));

  jar.set(
    SESSION_COOKIE,
    seal({
      refreshToken: session.refreshToken,
      customerId,
      customerName: String(formData.get("name") ?? "") || undefined,
      customerTimeZone,
      loginCustomerId,
      marginPct: session.marginPct,
      marginStatus: session.marginStatus,
    }),
    cookieOptions()
  );
  redirect("/google-ads/marja");
}
