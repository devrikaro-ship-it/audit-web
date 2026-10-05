import { href } from "@/shared/route-table";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unseal, SESSION_COOKIE } from "@/modules/google-ads/model/data/session";
import { accessTokenFrom, oauthConfig } from "@/modules/google-ads/model/data/oauth";
import { fetchShoppingProducts } from "@/modules/google-ads/model/data/intake";
import { runGoogleAdsRead } from "@/shared/public-contract/read-disclosure";
import { suggestMargin } from "@/modules/google-ads/model/audit";
import { demoOn, demoData } from "@/modules/google-ads/model/data/demo";
import { aggregatePurchaseBaseline, readPurchaseBaseline, type PurchaseBaseline } from "@/modules/google-ads/model/data/an";
import { isValidElement, type ReactElement } from "react";
import { MarginView } from "@/modules/google-ads/view/margin";


export async function loadMargin({
  searchParams,
}: {
  searchParams: Promise<{ eroare?: string }>;
}) {
  const { eroare } = await searchParams;
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect(`${href("gadsConnect")}?eroare=sesiune`);
  if (!session.customerId) redirect(href("gadsAccounts"));
  if (!session.customerTimeZone) redirect(href("gadsAccounts"));
  if (!session.currencyCode) redirect(href("gadsAccounts"));
  const customerId = session.customerId;
  const customerTimeZone = session.customerTimeZone;
  const currencyCode = session.currencyCode;
  const cfg = oauthConfig();
  let sugestie = { label: "online store", marginPct: 35, detected: false };
  let nrProduse = 0;
  let baseline: PurchaseBaseline | null = null;
  if (demoOn()) {
    const { products, structura } = demoData();
    nrProduse = products.length;
    sugestie = suggestMargin(products);
    baseline = aggregatePurchaseBaseline(
      structura?.cheltuialaTotala ?? 0,
      products.map((product) => ({ metrics: { conversions: product.conversions, conversionsValue: product.conversionValue } }))
    );
  } else try {
    const token = await accessTokenFrom(session.refreshToken);
    const auth = {
      accessToken: token,
      developerToken: cfg.developerToken,
      loginCustomerId: session.loginCustomerId,
    };
    const [{ products }, measuredBaseline] = await Promise.all([
      runGoogleAdsRead("fetchShoppingProducts", () => fetchShoppingProducts(customerId, auth, customerTimeZone)),
      runGoogleAdsRead("readPurchaseBaseline", () => readPurchaseBaseline(customerId, auth, customerTimeZone)),
    ]);
    nrProduse = products.length;
    sugestie = suggestMargin(products);
    baseline = measuredBaseline;
  } catch {
    // If the catalog read fails, the question remains valid with its default value.
  }
  return { eroare, currencyCode, sugestie, nrProduse, baseline };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type MarginProps = Exclude<Awaited<ReturnType<typeof loadMargin>>, ReactElement>;

export async function showMargin(props: Parameters<typeof loadMargin>[0]) {
  const loaded = await loadMargin(props);
  return isValidElement(loaded) ? loaded : <MarginView {...(loaded as MarginProps)} />;
}

export const metadata = { title: "Your margin · Devrika Google Ads Audit" };
