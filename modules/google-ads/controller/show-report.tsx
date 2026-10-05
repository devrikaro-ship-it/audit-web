import { href } from "@/shared/route-table";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { C, sora, inter, brandGradient } from "@/shared/theme";
import { parseGrossMargin, unseal, SESSION_COOKIE } from "@/modules/google-ads/model/data/session";
import { accessTokenFrom, oauthConfig } from "@/modules/google-ads/model/data/oauth";
import { FERESTRE, WINDOW_DAYS } from "@/shared/public-contract/audit-window";
import { dateRange, fetchShoppingProducts, fetchShoppingProductsForRange } from "@/modules/google-ads/model/data/intake";
import { fetchTracking } from "@/modules/google-ads/model/data/tracking";
import { audit, breakEvenRoas } from "@/modules/google-ads/model/audit";
import { buildReport, segmenteaza, type Segmentare } from "@/modules/google-ads/model/findings";
import { fetchStructura } from "@/modules/google-ads/model/data/structure";
import { registeredPublicOAuthAttributes } from "@/shared/public-contract/oauth-contract";
import { citesteAn, bugetLunarDin, type TotaluriAn } from "@/modules/google-ads/model/data/an";
import { fetchPmaxData, analizeazaPmax } from "@/modules/google-ads/model/data/pmax";
import { fetchShoppingData, analizeazaShopping } from "@/modules/google-ads/model/data/shopping";
import { fetchSearchData, analizeazaSearch } from "@/modules/google-ads/model/data/search";
import { fetchKeywordData, analizeazaCuvinte } from "@/modules/google-ads/model/data/keywords";
import { demoOn, demoData } from "@/modules/google-ads/model/data/demo";
import { roasImbunatatit } from "@/modules/google-ads/model/calc";
import type { GadsSession } from "@/modules/google-ads/model/data/session";
import type { Product } from "@/modules/google-ads/model/audit";
import type { StructuraAudit } from "@/modules/google-ads/model/data/structure";
import type { TrackingState } from "@/modules/google-ads/model/data/tracking";
import type { PmaxData } from "@/modules/google-ads/model/data/pmax";
import type { ShoppingData } from "@/modules/google-ads/model/data/shopping";
import type { SearchData } from "@/modules/google-ads/model/data/search";
import type { TermenBrut } from "@/modules/google-ads/model/data/keywords";
import { comparisonRanges, type ReportPeriodRanges } from "@/modules/google-ads/model/report-periods";
import { classifyReportProducts, type ReportProductInput } from "@/modules/google-ads/model/product-classification";
import { buildGoogleAdsReportV2, type ReportPeriodInput, type ReportProductInputV2 } from "@/modules/google-ads/model/report-metrics";
import { ReportSurface, runReportStep } from "@/modules/google-ads/view/report-contract";
import { runGoogleAdsRead } from "@/shared/public-contract/read-disclosure";
import { analyzeProducts, simulateOptimizedBudget } from "@/modules/google-ads/model/product-simulation";
import { normalizeReportProductsToPeriod, openReportSnapshot, sealReportSnapshot, type GadsReportSnapshot } from "@/modules/google-ads/model/data/report-delivery";
import { persistGeneratedReport, stagePendingReportSnapshot } from "@/modules/google-ads/model/data/pending-report";
import { isValidElement, type ReactElement } from "react";
import { ReportView } from "@/modules/google-ads/view/report";

/**
 * Aducerea datelor — singurul loc care atinge contul. In demo intoarce cifre simulate, fara
 * niciun apel catre Google. Pe cont real: token cazut -> reconectare (nu 500), catalog cazut
 * -> null, adica pagina de indisponibilitate. Restul analizelor sunt optionale prin natura lor.
 */
async function surse(session: GadsSession): Promise<SurseAudit | null> {
  const customerTimeZone = session.customerTimeZone as string;
  const ranges = comparisonRanges(dateRange(new Date(), WINDOW_DAYS, customerTimeZone));
  if (demoOn()) {
    const data = demoData();
    return {
      ...data,
      reportPeriods: {
        ranges,
        previous: {
          products: data.reportComparisonProducts?.previous ?? data.products,
          catalogComplete: data.catalogComplete,
        },
        previousYear: {
          products: data.reportComparisonProducts?.previousYear ?? data.products,
          catalogComplete: data.catalogComplete,
        },
      },
    };
  }

  const cfg = oauthConfig();
  // Un refresh token revocat sau expirat nu e o eroare de server, ci o sesiune care trebuie
  // reluata. Fara plasa asta, omul care se intoarce peste doua ore primea 500.
  const token = await accessTokenFrom(session.refreshToken).catch(() => null);
  if (!token) redirect(`${href("gadsConnect")}?eroare=expirat`);

  const auth = {
    accessToken: token,
    developerToken: cfg.developerToken,
    // Fara managerul prin care e accesibil contul, Google raspunde USER_PERMISSION_DENIED.
    loginCustomerId: session.loginCustomerId,
  };
  const customerId = session.customerId as string;

  // Tot ce se poate cere in acelasi timp se cere in acelasi timp — pagina asta e ce asteapta
  // omul dupa ce si-a conectat contul. O analiza cazuta nu are voie sa doboare raportul.
  const [
    catalog,
    previousCatalog,
    previousYearCatalog,
    tracking,
    structura,
    brutCuvinte,
    brutPmax,
    brutShop,
    brutCautari,
    an,
    ferestre,
  ] = await Promise.all([
    runGoogleAdsRead("fetchShoppingProducts", () =>
      fetchShoppingProductsForRange(customerId, auth, customerTimeZone, ranges.selected).catch(
        () => null,
      ),
    ),
    runGoogleAdsRead("fetchShoppingProducts", () =>
      fetchShoppingProductsForRange(customerId, auth, customerTimeZone, ranges.previous).catch(
        () => null,
      ),
    ),
    runGoogleAdsRead("fetchShoppingProducts", () =>
      fetchShoppingProductsForRange(customerId, auth, customerTimeZone, ranges.previousYear).catch(
        () => null,
      ),
    ),
    runGoogleAdsRead("fetchTracking", () =>
      fetchTracking(customerId, auth).catch(() => TRACKING_NECUNOSCUT),
    ),
    runGoogleAdsRead("fetchStructura", () =>
      fetchStructura(customerId, auth, session.currencyCode).catch(() => undefined),
    ),
    runGoogleAdsRead("fetchKeywordData", () =>
      fetchKeywordData(customerId, auth).catch(() => undefined),
    ),
    runGoogleAdsRead("fetchPmaxData", () =>
      fetchPmaxData(customerId, auth).catch(() => undefined),
    ),
    runGoogleAdsRead("fetchShoppingData", () =>
      fetchShoppingData(customerId, auth).catch(() => undefined),
    ),
    runGoogleAdsRead("fetchSearchData", () =>
      fetchSearchData(customerId, auth).catch(() => undefined),
    ),
    runGoogleAdsRead("citesteAn", () =>
      citesteAn(customerId, auth, customerTimeZone),
    ),
    // Harta catalogului se citeste pe ferestre scurte, deci le cerem pe toate odata: patru
    // interogari in paralel costa cat cea mai lenta dintre ele, iar omul comuta apoi instant.
    Promise.all(
      FERESTRE.map((w) =>
        runGoogleAdsRead("fetchShoppingProducts", () =>
          fetchShoppingProducts(
            customerId,
            auth,
            customerTimeZone,
            new Date(),
            w.zile,
          ),
        )
          .then((r) => ({
            zile: w.zile,
            eticheta: w.eticheta,
            products: r.products,
          }))
          .catch(() => null),
      ),
    ),
  ]);

  // Catalogul e singurul de care depinde tot restul: fara el nu exista nici produse, nici cifra
  // de impact. Atunci spunem cinstit ca nu am putut citi, in loc sa aruncam o pagina de eroare.
  if (!catalog) return null;
  return {
    ...catalog,
    reportPeriods: {
      ranges,
      previous: previousCatalog,
      previousYear: previousYearCatalog,
    },
    tracking,
    structura,
    brutCuvinte,
    brutPmax,
    brutShop,
    brutCautari,
    an,
    ferestre,
  };
}
function reportPeriodInput(
  range: ReportPeriodInput["range"],
  products: Product[],
): ReportPeriodInput {
  return {
    range,
    spend: products.reduce((total, product) => total + product.cost, 0),
    salesVolume: products.reduce((total, product) => total + product.conversionValue, 0),
    numberOfSales: products.reduce((total, product) => total + product.conversions, 0),
  };
}
function reportProductsV2(
  products: Product[],
  catalogComplete: boolean,
  minimumRoasTarget: number,
): ReportProductInputV2[] {
  const inputs: ReportProductInput[] = products.map((product) => ({
    productId: product.productId,
    title: product.title,
    cost: product.cost,
    conversionValue: product.conversionValue,
    conversions: product.conversions,
    clicks: product.clicks,
    impressions: product.impressions,
    catalogEligible: catalogComplete,
  }));
  const sourceLabels = new Map(
    classifyReportProducts(inputs, minimumRoasTarget).map((product) => [product.productId, product.label]),
  );
  return inputs.map((product) => ({
    ...product,
    sourceLabel: sourceLabels.get(product.productId),
  }));
}
/**
 * Ce vede omul cand catalogul de Shopping nu se poate citi. Nu e un 500: e o pagina care spune
 * ce s-a intamplat, ce poate face acum si cum ne scrie daca tot nu merge.
 */
function Indisponibil() {
  return (
    <ReportSurface
      {...registeredPublicOAuthAttributes.report["catalog-unavailable"]}
      id="catalog-unavailable-recovery"
      className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center"
      style={{
        fontFamily: inter,
        background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)",
      }}
    >
      <div
        className="w-full max-w-[520px] rounded-2xl border bg-white p-8 md:p-10"
        style={{
          borderColor: "#e6ebf4",
          boxShadow: "0 8px 32px rgba(11,31,58,0.06)",
        }}
      >
        <h1
          className="mb-4 font-extrabold leading-[1.2] tracking-[-0.5px]"
          style={{
            fontFamily: sora,
            fontSize: "clamp(20px,3.2vw,26px)",
            color: "#0f172a",
          }}
        >
          We could not read the Shopping catalog
        </h1>
        <p
          className="mb-7 text-[15px] leading-relaxed"
          style={{ color: C.gray500 }}
        >
          This can happen when the account has no Shopping products yet, API access was recently
          withdrawn, or Google is responding slowly. Nothing was changed in your account.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link
            href={href("gadsReport")}
            className="inline-flex min-h-11 items-center rounded-[14px] px-7 text-[15.5px] font-bold text-white"
            style={{ background: brandGradient, fontFamily: sora }}
          >
            Try again
          </Link>
          <a
            href="mailto:hello@devrika.ro?subject=Audit%20Google%20Ads%20-%20raportul%20nu%20s-a%20generat"
            className="text-[13.5px] font-semibold hover:underline"
            style={{ color: C.indigo }}
          >
            Contact us and we will prepare it manually
          </a>
        </div>
      </div>
    </ReportSurface>
  );
}
type SurseAudit = {
  products: Product[];
  catalogComplete: boolean;
  reportPeriods: {
    ranges: ReportPeriodRanges;
    previous: { products: Product[]; catalogComplete: boolean } | null;
    previousYear: { products: Product[]; catalogComplete: boolean } | null;
  };
  tracking: TrackingState;
  structura?: StructuraAudit;
  an?: TotaluriAn | null;
  /** Catalogul pe fiecare fereastra scurta. `null` acolo unde interogarea a cazut. */
  ferestre?: ({ zile: number; eticheta: string; products: Product[] } | null)[];
  brutCuvinte?: { negative: string[]; termeni: TermenBrut[] };
  brutPmax?: PmaxData;
  brutShop?: ShoppingData;
  brutCautari?: SearchData;
};
/** Cand nu putem citi masurarea, raportul spune "nu stiu" — nu presupune ca e in regula. */
const TRACKING_NECUNOSCUT: TrackingState = {
  ok: false,
  conversions: [],
  junkPrimary: [],
  hasSalePrimary: false,
  reasons: ["the account measurement settings could not be read"],
};

export async function loadReport() {
  const jar = await cookies();
  const sealedSession = jar.get(SESSION_COOKIE)?.value;
  const session = unseal(sealedSession);
  if (!session) redirect(`${href("gadsConnect")}?eroare=sesiune`);
  if (!session.customerId) redirect(href("gadsAccounts"));
  if (!session.customerTimeZone) redirect(href("gadsAccounts"));
  const currencyCode = session.currencyCode;
  if (!currencyCode) redirect(href("gadsAccounts"));
  const marginPct = parseGrossMargin(session.marginPct);
  if (marginPct === null)
    redirect(
      session.marginStatus === "invalid"
        ? `${href("gadsMargin")}?eroare=marja`
        : href("gadsMargin"),
    );
  const demo = demoOn();
  const s = await surse(session);
  if (!s) return <Indisponibil />;
  const { products, catalogComplete, tracking, structura, an } = s;
  // Doar potrivirile care au nevoie de alt rezultat se fac dupa: cuvintele au nevoie de
  // catalog, PMax de cheltuiala pe campanie.
  const cuvinte = s.brutCuvinte
    ? runReportStep("analizeazaCuvinte", () =>
        analizeazaCuvinte(
          s.brutCuvinte!.negative,
          products,
          s.brutCuvinte!.termeni,
          session.customerName,
        ),
      )
    : undefined;
  const pmax =
    s.brutPmax && structura
      ? runReportStep("analizeazaPmax", () =>
          analizeazaPmax(s.brutPmax!, structura.campanii, currencyCode),
        )
      : undefined;
  const shopping = s.brutShop
    ? runReportStep("analizeazaShopping", () =>
        analizeazaShopping(s.brutShop!, tracking.ok),
      )
    : undefined;
  const cautari = s.brutCautari
    ? runReportStep("analizeazaSearch", () => analizeazaSearch(s.brutCautari!))
    : undefined;
  const minRoas =
    session.breakEvenRoas ??
    runReportStep("breakEvenRoas", () => breakEvenRoas(marginPct));
  const snapshotProductsV2 = reportProductsV2(products, catalogComplete, minRoas);
  const snapshotPeriodsV2 = {
    selected: reportPeriodInput(s.reportPeriods.ranges.selected, products),
    previous: s.reportPeriods.previous
      ? reportPeriodInput(s.reportPeriods.ranges.previous, s.reportPeriods.previous.products)
      : null,
    previousYear: s.reportPeriods.previousYear
      ? reportPeriodInput(s.reportPeriods.ranges.previousYear, s.reportPeriods.previousYear.products)
      : null,
  };
  const rep = runReportStep("buildReport", () =>
    buildReport(
      runReportStep("audit", () => audit(products, minRoas)),
      tracking,
      marginPct,
      minRoas,
      catalogComplete,
      { structura, cuvinte, pmax, shopping, cautari, an },
      currencyCode,
    ),
  );
  // Harta catalogului, cate una pe fereastra. Pragul de trafic e acelasi pe toate: intrebarea
  // "am destule date cat sa judec produsul asta" nu se schimba cu lungimea ferestrei.
  const hartiCatalog: { eticheta: string; segmentare: Segmentare }[] = (
    s.ferestre ?? []
  )
    .filter((w): w is NonNullable<typeof w> => w !== null)
    .map((w) => ({
      eticheta: w.eticheta,
      segmentare: runReportStep("segmenteaza", () =>
        segmenteaza(
          runReportStep("audit", () => audit(w.products, minRoas)),
          tracking.ok,
        ),
      ),
    }));
  // Ipoteza casei pentru sectiunea "Cu Devrika": CPC -20% si conversie +20%, adica exact ce
  // misca omul cu cursoarele in pagina urmatoare. Cifra vine din acelasi motor, nu dintr-un
  // inmultitor scris de mana aici.
  const bugetLunar = runReportStep("bugetLunarDin", () =>
    bugetLunarDin(an ?? null, structura?.cheltuialaTotala ?? 0),
  );
  const roasAzi = an?.roas ?? structura?.roasCont ?? 0;
  const venitInPlusLunar = Math.round(
    bugetLunar *
      ((runReportStep("roasImbunatatit", () =>
        roasImbunatatit(roasAzi, 20, 20),
      ) ?? roasAzi) -
        roasAzi),
  );
  // Doua sectiuni, nu o lista plata: banii pierduti si setarile de reparat sunt lucruri
  // diferite, iar un om care le vede amestecate nu stie ce sa faca luni dimineata.
  const bani = rep.findings.filter((f) => !f.quarantined);
  const nejudecabile = rep.findings.filter((f) => f.quarantined);
  const profitability = runReportStep("analyzeProducts", () =>
    analyzeProducts(products, { breakEvenRoas: minRoas, months: 12 }),
  );
  const optimized = simulateOptimizedBudget(
    profitability,
    profitability.currentMonthlySpend,
  );
  const currentRevenue = products.reduce(
    (sum, product) => sum + product.conversionValue / 12,
    0,
  );
  const currentOrders = products.reduce(
    (sum, product) => sum + product.conversions / 12,
    0,
  );
  const currentClicks = products.reduce(
    (sum, product) => sum + product.clicks / 12,
    0,
  );
  const currentImpressions = products.reduce(
    (sum, product) => sum + product.impressions / 12,
    0,
  );
  const snapshot: GadsReportSnapshot = {
    generatedAt: new Date().toISOString(),
    evidenceMonths: 12,
    website: session.website ?? "",
    accountName: session.customerName || "Your account",
    averageOrderValue: session.averageOrderValue ?? 0,
    goodsCost: session.goodsCost ?? 0,
    breakEvenCpa: session.breakEvenCpa ?? 0,
    breakEvenRoas: minRoas,
    current: {
      spend: profitability.currentMonthlySpend,
      revenue: currentRevenue,
      orders: currentOrders,
      cpa:
        currentOrders > 0
          ? profitability.currentMonthlySpend / currentOrders
          : null,
      roas:
        profitability.currentMonthlySpend > 0
          ? currentRevenue / profitability.currentMonthlySpend
          : 0,
      clicks: currentClicks,
      impressions: currentImpressions,
    },
    optimized: {
      spend: optimized.budget,
      revenue: optimized.expectedRevenue,
      orders: optimized.expectedOrders,
      cpa:
        optimized.expectedOrders > 0
          ? optimized.budget / optimized.expectedOrders
          : null,
      roas: optimized.expectedRoas ?? 0,
    },
    losses: profitability.losses.map((row) => ({
      productId: row.productId,
      title: row.title,
      cost: row.monthlyCost,
      revenue: row.monthlyRevenue,
      orders: row.monthlyOrders,
      cpa: row.cpa,
      roas: row.roas,
      amount: row.monthlyMoneyAtRisk,
    })),
    opportunities: profitability.opportunities.map((row) => ({
      productId: row.productId,
      title: row.title,
      cost: row.monthlyCost,
      revenue: row.monthlyRevenue,
      orders: row.monthlyOrders,
      cpa: row.cpa,
      roas: row.roas,
      amount: row.estimatedSalesOpportunity,
    })),
    campaigns: structura?.campanii
      .filter((campaign) => campaign.cost > 0 || campaign.status === "ENABLED")
      .sort((left, right) => right.cost - left.cost)
      .slice(0, 10)
      .map((campaign) => ({
        name: campaign.nume,
        channel: campaign.canal,
        spend: campaign.cost,
        revenue: campaign.valoare,
        roas: campaign.cost > 0 ? campaign.valoare / campaign.cost : 0,
        status: campaign.status,
      })),
    productAnalysis: profitability,
    reportProducts: normalizeReportProductsToPeriod(
      products.map((product) => ({
        ...product,
        catalogEligible: catalogComplete,
      })),
      12,
    ),
    reportV2: {
      version: 2,
      currencyCode,
      periods: snapshotPeriodsV2,
      products: snapshotProductsV2,
      productPopulationStatus: catalogComplete ? "COMPLETE" : "PARTIAL",
      classificationDiagnostics: buildGoogleAdsReportV2({
        currencyCode,
        minimumRoasTarget: minRoas,
        maximumCpaTarget: session.breakEvenCpa,
        periods: snapshotPeriodsV2,
        products: snapshotProductsV2,
        productPopulationStatus: catalogComplete ? "COMPLETE" : "PARTIAL",
      }).classificationDiagnostics,
    },
  };
  const signedReportSnapshot = sealReportSnapshot(snapshot);
  const openedReportSnapshot = openReportSnapshot(signedReportSnapshot);
  if (!openedReportSnapshot?.reportV2) {
    throw new Error("Signed V2 report snapshot validation failed");
  }
  if (!sealedSession) throw new Error("Sealed report session is unavailable");
  await persistGeneratedReport({ signedSnapshot: signedReportSnapshot, sealedSession });
  const { reference: pendingReportReference } = await stagePendingReportSnapshot(
    signedReportSnapshot,
    sealedSession,
  );
  const snapshotViewV2 = buildGoogleAdsReportV2({
    currencyCode: openedReportSnapshot.reportV2.currencyCode,
    minimumRoasTarget: openedReportSnapshot.breakEvenRoas,
    maximumCpaTarget: openedReportSnapshot.breakEvenCpa,
    periods: openedReportSnapshot.reportV2.periods,
    products: openedReportSnapshot.reportV2.products,
    productPopulationStatus: openedReportSnapshot.reportV2.productPopulationStatus,
  });
  return { session, currencyCode, demo, products, structura, minRoas, rep, hartiCatalog, venitInPlusLunar, bani, nejudecabile, pendingReportReference, snapshotViewV2 };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type ReportProps = Exclude<Awaited<ReturnType<typeof loadReport>>, ReactElement>;

export async function showReport() {
  const loaded = await loadReport();
  return isValidElement(loaded) ? loaded : <ReportView {...(loaded as ReportProps)} />;
}

export const metadata = { title: "Your report · Devrika Google Ads Audit" };
