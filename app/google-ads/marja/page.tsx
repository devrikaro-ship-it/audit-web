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

// Singura intrebare de business din tot fluxul. NU intrebam ROAS-ul minim — oamenii nu si-l
// pot calcula si ii pierzi in formular. Intrebam marja, pe care orice comerciant o stie, si
// pornim de la valoarea tipica INDUSTRIEI LUI, dedusa din catalogul pe care tocmai l-am citit.

export const dynamic = "force-dynamic";
export const metadata = { title: "Marja ta · Audit Google Ads Devrika" };

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
  const customerId = session.customerId;
  const customerTimeZone = session.customerTimeZone;

  const cfg = oauthConfig();
  let sugestie = { label: "magazin online", marginPct: 35, detected: false };
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
    // Daca citirea catalogului pica, intrebarea ramane valabila cu valoarea implicita.
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
            Set the point where advertising stops making money
          </h1>
          <p className="mb-1 text-[15px] leading-relaxed" style={{ color: C.gray500 }}>
            Confirm the average order value and tell us how much the goods in that order cost.
            We calculate the maximum CPA and minimum ROAS for you.
          </p>
          {nrProduse > 0 && (
            <p className="mb-6 text-[13.5px]" style={{ color: C.gray400 }}>
              {sugestie.detected
                ? `Am citit ${nrProduse} produse din contul tau si arata a ${sugestie.label}. Magazinele din categoria asta au tipic ${sugestie.marginPct}% — am pornit de acolo, schimba daca la tine e altfel.`
                : `Am citit ${nrProduse} produse din contul tau, dar nu am putut deduce categoria. Am pus o valoare medie de ${sugestie.marginPct}% — pune-o pe a ta.`}
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
            action={salveazaMarja}
          />
        </div>

        <p className="mt-6 text-center text-[12.5px]" style={{ color: C.gray400 }}>
          No invoices or accounting access. You can adjust both values before the audit is generated.
        </p>
      </div>
    </div>
  );
}
