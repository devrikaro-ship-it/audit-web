import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { C, sora, inter } from "@/lib/theme";
import { GROSS_MARGIN_ERROR, unseal, SESSION_COOKIE } from "@/lib/gads-session";
import { accessTokenFrom, oauthConfig } from "@/lib/gads-oauth";
import { fetchShoppingProducts } from "@/lib/gads-intake";
import { runGoogleAdsRead } from "@/lib/gads-read-disclosure";
import { suggestMargin } from "@/lib/gads-audit";
import { demoOn, demoData } from "@/lib/gads-demo";
import { salveazaMarja } from "./actions";
import MarginForm from "./MarginForm";
import { publicOAuthAttributes } from "@/lib/gads-public-oauth-contract";
import { aggregatePurchaseBaseline, readPurchaseBaseline, type PurchaseBaseline } from "@/lib/gads-an";

// This is the only business question in the flow. We do not ask for minimum ROAS because
// merchants cannot reliably calculate it. We ask for margin and start from the typical value
// for the detected industry, based on the catalog we just read.

export const dynamic = "force-dynamic";
export const metadata = { title: "Your margin · Devrika Google Ads Audit" };

export default async function Marja({
  searchParams,
}: {
  searchParams: Promise<{ eroare?: string }>;
}) {
  const { eroare } = await searchParams;
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/google-ads/connect?eroare=sesiune");
  if (!session.customerId) redirect("/google-ads/conturi");
  if (!session.customerTimeZone) redirect("/google-ads/conturi");
  if (!session.currencyCode) redirect("/google-ads/conturi");
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

  return (
    <div {...publicOAuthAttributes("margin", eroare === "marja" ? "error" : "normal")} className="min-h-dvh px-6 py-16" style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
      <div className="mx-auto w-full max-w-[620px]">
        <Link href="/google-ads" className="mb-8 flex items-center justify-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={34} height={34} className="h-[34px] w-[34px]" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>

        <div className="rounded-2xl border bg-white p-7 md:p-9" style={{ borderColor: "#e6ebf4", boxShadow: "0 8px 32px rgba(11,31,58,0.06)" }}>
          <p className="mb-2 text-[13px] font-bold uppercase tracking-[2px]" style={{ color: C.cyan }}>Step 2 of 3</p>
          <h1 className="mb-3 font-extrabold leading-[1.2] tracking-[-0.5px]" style={{ fontFamily: sora, fontSize: "clamp(22px,3.5vw,30px)", color: "#0f172a" }}>
            Let&apos;s set the point where your Google Ads campaigns start making or losing money
          </h1>
          <p className="mb-1 text-[15px] leading-relaxed" style={{ color: C.gray500 }}>
            Confirm the average order value and tell us the cost of goods in that order.
            We calculate the maximum CPA and minimum ROAS at which you still break even.
          </p>
          {nrProduse > 0 && (
            <p className="mb-6 text-[13.5px]" style={{ color: C.gray400 }}>
              {sugestie.detected
                ? `We read ${nrProduse} products from your account and they look like ${sugestie.label}. Stores in this category typically have a ${sugestie.marginPct}% margin — we started there, but change it if yours is different.`
                : `We read ${nrProduse} products from your account but could not identify the category. We used an average margin of ${sugestie.marginPct}% — replace it with yours.`}
            </p>
          )}

          {(eroare === "marja" || eroare === "financiar") && (
            <p className="mb-6 rounded-xl px-4 py-3 text-[13.5px] leading-relaxed"
              style={{ background: C.yellowBg, color: C.yellow }}>
              {GROSS_MARGIN_ERROR}
            </p>
          )}

          <MarginForm
            initialAverageOrderValue={Math.round(baseline?.averageOrderValue ?? 300)}
            initialGoodsCost={Math.round((baseline?.averageOrderValue ?? 300) * (1 - sugestie.marginPct / 100))}
            measured={baseline?.averageOrderValue !== null && baseline?.averageOrderValue !== undefined}
            currencyCode={currencyCode}
            action={salveazaMarja}
          />
        </div>

        <p className="mt-6 text-center text-[12.5px]" style={{ color: C.gray400 }}>
          We do not ask for invoices or access your accounting records. You can adjust the values before generating the audit.
        </p>
      </div>
    </div>
  );
}
