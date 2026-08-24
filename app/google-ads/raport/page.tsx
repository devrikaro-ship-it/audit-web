import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { C, sora, inter, brandGradient } from "@/lib/theme";
import { parseGrossMargin, unseal, SESSION_COOKIE } from "@/lib/gads-session";
import { accessTokenFrom, oauthConfig } from "@/lib/gads-oauth";
import { AUDIT_WINDOW_LABEL, fetchShoppingProducts, FERESTRE } from "@/lib/gads-intake";
import { fetchTracking } from "@/lib/gads-tracking";
import { audit, breakEvenRoas } from "@/lib/gads-audit";
import { buildReport, segmenteaza, type Tier, type Segmentare } from "@/lib/gads-findings";
import CatalogPePerformanta from "./CatalogPePerformanta";
import { fetchStructura } from "@/lib/gads-structure";
import { publicOAuthProjection, registeredPublicOAuthAttributes } from "@/lib/gads-public-oauth-contract";
import { citesteAn, bugetLunarDin, type TotaluriAn } from "@/lib/gads-an";
import { fetchPmaxData, analizeazaPmax } from "@/lib/gads-pmax";
import { fetchShoppingData, analizeazaShopping } from "@/lib/gads-shopping";
import { fetchSearchData, analizeazaSearch } from "@/lib/gads-search";
import { fetchKeywordData, analizeazaCuvinte } from "@/lib/gads-keywords";
import ContactForm from "./ContactForm";
import { salveazaContact } from "./actions";
import { demoOn, demoData } from "@/lib/gads-demo";
import { roasImbunatatit } from "@/lib/calc";
import type { GadsSession } from "@/lib/gads-session";
import type { Product } from "@/lib/gads-audit";
import type { StructuraAudit } from "@/lib/gads-structure";
import type { TrackingState } from "@/lib/gads-tracking";
import type { PmaxData } from "@/lib/gads-pmax";
import type { ShoppingData } from "@/lib/gads-shopping";
import type { SearchData } from "@/lib/gads-search";
import type { TermenBrut } from "@/lib/gads-keywords";
import { ReportSurface, reportGuards, runReportStep } from "./report-contract";

export const dynamic = "force-dynamic";
export const metadata = { title: "Raportul tau · Audit Google Ads Devrika" };

const TIER_STYLE: Record<Tier, { bg: string; fg: string; label: string }> = {
  MASURAT: { bg: C.greenBg, fg: C.green, label: "MASURAT" },
  ESTIMARE: { bg: C.yellowBg, fg: C.yellow, label: "ESTIMARE" },
  SIMULARE: { bg: "#eef0ff", fg: C.indigo, label: "SIMULARE" },
};

// Culoarea de severitate e separata de accentul de brand: rosu/portocaliu/albastru inseamna
// "cat de grav", nu "Devrika". Eticheta scrisa dubleaza culoarea, ca sa nu depinda de ea.
const GRAD_STYLE = {
  critic: { bg: C.redBg, fg: C.red, label: "opreste vanzari" },
  costa: { bg: C.orangeBg, fg: C.orange, label: "costa bani" },
  reglaj: { bg: "#eef0ff", fg: C.indigo, label: "de reglat" },
} as const;

const lei = (n: number) => `${n.toLocaleString("ro-RO")} RON`;

type SurseAudit = {
  products: Product[];
  catalogComplete: boolean;
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
  reasons: ["nu am putut citi setarile de masurare din cont"],
};

/**
 * Aducerea datelor — singurul loc care atinge contul. In demo intoarce cifre simulate, fara
 * niciun apel catre Google. Pe cont real: token cazut -> reconectare (nu 500), catalog cazut
 * -> null, adica pagina de indisponibilitate. Restul analizelor sunt optionale prin natura lor.
 */
async function surse(session: GadsSession): Promise<SurseAudit | null> {
  if (demoOn()) return demoData();

  const cfg = oauthConfig();
  // Un refresh token revocat sau expirat nu e o eroare de server, ci o sesiune care trebuie
  // reluata. Fara plasa asta, omul care se intoarce peste doua ore primea 500.
  const token = await accessTokenFrom(session.refreshToken).catch(() => null);
  if (!token) redirect("/google-ads/connect?eroare=expirat");

  const auth = {
    accessToken: token,
    developerToken: cfg.developerToken,
    // Fara managerul prin care e accesibil contul, Google raspunde USER_PERMISSION_DENIED.
    loginCustomerId: session.loginCustomerId,
  };
  const customerId = session.customerId as string;
  const customerTimeZone = session.customerTimeZone as string;

  // Tot ce se poate cere in acelasi timp se cere in acelasi timp — pagina asta e ce asteapta
  // omul dupa ce si-a conectat contul. O analiza cazuta nu are voie sa doboare raportul.
  const [catalog, tracking, structura, brutCuvinte, brutPmax, brutShop, brutCautari, an, ferestre] = await Promise.all([
    runReportStep("fetchShoppingProducts", () => fetchShoppingProducts(customerId, auth, customerTimeZone).catch(() => null)),
    runReportStep("fetchTracking", () => fetchTracking(customerId, auth).catch(() => TRACKING_NECUNOSCUT)),
    runReportStep("fetchStructura", () => fetchStructura(customerId, auth).catch(() => undefined)),
    runReportStep("fetchKeywordData", () => fetchKeywordData(customerId, auth).catch(() => undefined)),
    runReportStep("fetchPmaxData", () => fetchPmaxData(customerId, auth).catch(() => undefined)),
    runReportStep("fetchShoppingData", () => fetchShoppingData(customerId, auth).catch(() => undefined)),
    runReportStep("fetchSearchData", () => fetchSearchData(customerId, auth).catch(() => undefined)),
    runReportStep("citesteAn", () => citesteAn(customerId, auth, customerTimeZone)),
    // Harta catalogului se citeste pe ferestre scurte, deci le cerem pe toate odata: patru
    // interogari in paralel costa cat cea mai lenta dintre ele, iar omul comuta apoi instant.
    Promise.all(
      FERESTRE.map((w) =>
        runReportStep("fetchShoppingProducts", () => fetchShoppingProducts(customerId, auth, customerTimeZone, new Date(), w.zile))
          .then((r) => ({ zile: w.zile, eticheta: w.eticheta, products: r.products }))
          .catch(() => null)
      )
    ),
  ]);

  // Catalogul e singurul de care depinde tot restul: fara el nu exista nici produse, nici cifra
  // de impact. Atunci spunem cinstit ca nu am putut citi, in loc sa aruncam o pagina de eroare.
  if (!catalog) return null;
  return { ...catalog, tracking, structura, brutCuvinte, brutPmax, brutShop, brutCautari, an, ferestre };
}

export default async function Raport() {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/google-ads/connect?eroare=sesiune");
  if (!session.customerId) redirect("/google-ads/conturi");
  if (!session.customerTimeZone) redirect("/google-ads/conturi");
  const marginPct = parseGrossMargin(session.marginPct);
  if (marginPct === null) redirect(session.marginStatus === "invalid" ? "/google-ads/marja?eroare=marja" : "/google-ads/marja");

  const demo = demoOn();
  const s = await surse(session);
  if (!s) return <Indisponibil />;
  const { products, catalogComplete, tracking, structura, an } = s;

  // Doar potrivirile care au nevoie de alt rezultat se fac dupa: cuvintele au nevoie de
  // catalog, PMax de cheltuiala pe campanie.
  const cuvinte = s.brutCuvinte
    ? runReportStep("analizeazaCuvinte", () => analizeazaCuvinte(s.brutCuvinte!.negative, products, s.brutCuvinte!.termeni, session.customerName))
    : undefined;
  const pmax = s.brutPmax && structura ? runReportStep("analizeazaPmax", () => analizeazaPmax(s.brutPmax!, structura.campanii)) : undefined;
  const shopping = s.brutShop ? runReportStep("analizeazaShopping", () => analizeazaShopping(s.brutShop!, tracking.ok)) : undefined;
  const cautari = s.brutCautari ? runReportStep("analizeazaSearch", () => analizeazaSearch(s.brutCautari!)) : undefined;

  const minRoas = runReportStep("breakEvenRoas", () => breakEvenRoas(marginPct));
  const rep = runReportStep("buildReport", () => buildReport(
    runReportStep("audit", () => audit(products, minRoas)),
    tracking,
    marginPct,
    minRoas,
    catalogComplete,
    { structura, cuvinte, pmax, shopping, cautari, an }
  ));

  // Harta catalogului, cate una pe fereastra. Pragul de trafic e acelasi pe toate: intrebarea
  // "am destule date cat sa judec produsul asta" nu se schimba cu lungimea ferestrei.
  const hartiCatalog: { eticheta: string; segmentare: Segmentare }[] = (s.ferestre ?? [])
    .filter((w): w is NonNullable<typeof w> => w !== null)
    .map((w) => ({
      eticheta: w.eticheta,
      segmentare: runReportStep("segmenteaza", () => segmenteaza(runReportStep("audit", () => audit(w.products, minRoas)), tracking.ok)),
    }));

  // Ipoteza casei pentru sectiunea "Cu Devrika": CPC -20% si conversie +20%, adica exact ce
  // misca omul cu cursoarele in pagina urmatoare. Cifra vine din acelasi motor, nu dintr-un
  // inmultitor scris de mana aici.
  const bugetLunar = runReportStep("bugetLunarDin", () => bugetLunarDin(an ?? null, structura?.cheltuialaTotala ?? 0));
  const roasAzi = an?.roas ?? structura?.roasCont ?? 0;
  const venitInPlusLunar = Math.round(bugetLunar * ((runReportStep("roasImbunatatit", () => roasImbunatatit(roasAzi, 20, 20)) ?? roasAzi) - roasAzi));

  // Doua sectiuni, nu o lista plata: banii pierduti si setarile de reparat sunt lucruri
  // diferite, iar un om care le vede amestecate nu stie ce sa faca luni dimineata.
  const bani = rep.findings.filter((f) => !f.quarantined);
  const nejudecabile = rep.findings.filter((f) => f.quarantined);

  return (
    <div {...registeredPublicOAuthAttributes.report.success} className="min-h-dvh px-5 py-12 sm:px-6 sm:py-14" style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
      <main data-report-root className="mx-auto w-full max-w-[780px]">
        <ReportSurface id="navigation" className="contents">
        <span className="sr-only">{publicOAuthProjection.surfaceDisclosure}</span>
        <Link href="/google-ads" className="mb-8 flex items-center justify-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={34} height={34} className="h-[34px] w-[34px]" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>
        </ReportSurface>

        <ReportSurface id="demo-banner" when={reportGuards.demoBanner(demo)} className="contents">
          {/* Un raport demo care se da drept cifrele lui e o minciuna care ajunge la un client.
              Banda sta sus, inaintea cifrei de impact, si nu se poate rata. */}
          <div className="mb-4 rounded-xl px-5 py-3.5 text-center text-[13.5px] font-bold"
            style={{ background: C.yellowBg, color: C.yellow }}>
            MOD DEMO — cifrele de mai jos sunt simulate, nu vin din niciun cont real
          </div>
        </ReportSurface>

        {/* Cifra de impact */}
        <ReportSurface id="headline-summary" className="contents">
        <div data-report-part="headline-gradient" className="rounded-t-2xl p-8 text-center text-white" style={{ background: brandGradient }}>
          <p className="mb-2 text-[13px] font-bold uppercase tracking-[2px]" style={{ color: "rgba(255,255,255,0.8)" }}>
            {session.customerName || "Contul tau"} · {AUDIT_WINDOW_LABEL}
          </p>
          <p className="mb-2 font-black leading-none tabular-nums" style={{ fontFamily: sora, fontSize: "clamp(38px,8vw,64px)" }}>
            {lei(rep.headline.ron)}
          </p>
          <p className="text-[15.5px]" style={{ color: "rgba(255,255,255,0.9)" }}>{rep.headline.label}</p>
        </div>
        {/* Sumarul: ce urmeaza, inainte de detaliu */}
        <div data-report-part="summary-grid" className="mb-7 grid grid-cols-2 gap-px rounded-b-2xl border border-t-0 sm:grid-cols-4"
          style={{ borderColor: C.border, background: C.border }}>
          {[
            // REVERTED 2026-08-21. A `ron > 0` filter here was worse than the defect it removed:
            // it also counts the SIMULARE finding, which is a projected GAIN rendered green with a
            // "+", and it left the header saying 4 above five numbered cards. Two reviews measured
            // it independently. The honest number on the demo account is 3, and reaching it needs
            // the sign of the money to be a declared property of a Finding rather than a guess made
            // in three places. That is a change with a contract, not a one-line filter, so this
            // stays as it was until then and the mismatch it carries is a known open point.
            { k: "Constatari care costa bani", v: String(bani.length) },
            { k: "Setari de reparat", v: String(rep.puncte.length) },
            { k: "Produse analizate", v: String(products.length) },
            { k: "Pragul tau minim", v: `ROAS ${minRoas.toFixed(2)}x` },
          ].map((x) => (
            <div key={x.k} className="bg-white px-4 py-4 text-center">
              <p className="mb-1 text-[19px] font-black tabular-nums" style={{ fontFamily: sora, color: C.navy }}>{x.v}</p>
              <p className="text-[11.5px] font-semibold uppercase leading-tight tracking-wide" style={{ color: C.gray400 }}>{x.k}</p>
            </div>
          ))}
        </div>
        </ReportSurface>

        {/* ── Unde pierzi bani ── */}
        <ReportSurface id="money-findings" className="contents">
        <SectionTitle nr="1" text="Unde pierzi bani" />
        <div className="mb-9 flex flex-col gap-3.5">
          {bani.map((f, i) => {
            const t = TIER_STYLE[f.tier];
            return (
              <article key={f.key} className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: C.border }}>
                <div className="p-6 pb-5">
                  <div className="mb-3 flex flex-wrap items-center gap-2.5">
                    <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: C.indigo }}>
                      {i + 1}
                    </span>
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide" style={{ background: t.bg, color: t.fg }}>{t.label}</span>
                  </div>
                  <h3 className="mb-2 text-[18.5px] font-bold leading-snug" style={{ fontFamily: sora, color: "#0f172a" }}>{f.title}</h3>
                  {f.ron > 0 && (
                    // Simularea e castig, nu pierdere — verde cu "+", ca sa nu fie citita ca inca o gaura.
                    <p className="mb-2 text-[26px] font-black leading-none tabular-nums"
                      style={{ fontFamily: sora, color: f.tier === "SIMULARE" ? C.green : f.tier === "ESTIMARE" ? C.yellow : C.red }}>
                      {f.tier === "SIMULARE" ? `+${lei(f.ron)}` : lei(f.ron)}
                    </p>
                  )}
                  <p className="text-[14.5px] leading-relaxed" style={{ color: C.gray600 }}>{f.body}</p>
                </div>

                {f.produse?.length ? (
                  <Tabel
                    capete={["Produs", "Cheltuit", "Se intoarce"]}
                    randuri={f.produse.map((p) => ({
                      cheie: p.titlu,
                      celule: [
                        p.titlu,
                        p.cost > 0 ? lei(p.cost) : "—",
                        p.roas === undefined ? "—" : `${p.roas.toFixed(2)}x`,
                      ],
                      alarma: p.roas !== undefined && p.roas < minRoas,
                    }))}
                    restante={f.produseRestante}
                    numeRestante="produse"
                  />
                ) : null}

                {f.termeni?.length ? (
                  <Tabel
                    capete={["Ce a cautat omul", "Clicuri", "Cheltuit"]}
                    randuri={f.termeni.map((t2) => ({
                      cheie: t2.termen,
                      celule: [t2.termen, String(t2.clicuri), lei(Math.round(t2.cost))],
                      alarma: true,
                    }))}
                    restante={f.termeniRestanti}
                    numeRestante="cautari"
                  />
                ) : null}
              </article>
            );
          })}
        </div>
        </ReportSurface>

        {/* ── Catalogul pe performanta ── */}
        <ReportSurface id="catalog-map" when={reportGuards.catalogMap(hartiCatalog.length)} className="contents">
            <SectionTitle nr="2" text="Cum sta catalogul tau" />
            <CatalogPePerformanta harti={hartiCatalog} />
        </ReportSurface>

        {/* ── Setari gresite ── */}
        <ReportSurface id="account-settings" when={reportGuards.accountSettings(rep.puncte.length)} className="contents">
            <SectionTitle nr="3" text="Ce e setat gresit in cont" />
            <p className="mb-4 text-[14px] leading-relaxed" style={{ color: C.gray500 }}>
              Astea nu sunt bani deja pierduti, ci robinete deschise gresit. Sumele arata cat
              buget trece prin fiecare — nu cat s-a irosit.
            </p>
            <div className="mb-9 flex flex-col gap-3">
              {rep.puncte.map((p) => {
                const g = GRAD_STYLE[p.grad];
                return (
                  <article key={p.cod} className="flex gap-0 overflow-hidden rounded-xl border bg-white" style={{ borderColor: C.border }}>
                    <div aria-hidden="true" className="w-1 shrink-0" style={{ background: g.fg }} />
                    <div className="min-w-0 flex-1 p-5">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide" style={{ background: g.bg, color: g.fg }}>{g.label}</span>
                        {p.ron > 0 && (
                          <span className="text-[13px] font-bold tabular-nums" style={{ color: C.gray600 }}>{lei(p.ron)} buget afectat</span>
                        )}
                      </div>
                      <h3 className="mb-1.5 text-[16px] font-bold leading-snug" style={{ fontFamily: sora, color: "#0f172a" }}>{p.titlu}</h3>
                      <p className="text-[14px] leading-relaxed" style={{ color: C.gray600 }}>{p.detaliu}</p>
                      {p.exemple?.length ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {p.exemple.map((e) => (
                            <span key={e} className="rounded-md px-2 py-1 text-[12px]" style={{ background: C.slate, color: C.gray600 }}>{e}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
        </ReportSurface>

        {/* ── Ce nu se poate judeca inca ── */}
        <ReportSurface id="unsupported-conclusions" when={reportGuards.unsupportedConclusions(nejudecabile.length)} className="mb-9 flex flex-col gap-3">
            {nejudecabile.map((f) => (
              <article key={f.key} className="overflow-hidden rounded-xl border p-6" style={{ borderColor: "#e2e8f0", background: "#fafbff" }}>
                <span className="mb-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide" style={{ background: "#f1f5f9", color: C.gray600 }}>
                  nu se poate judeca inca
                </span>
                <h3 className="mb-2 text-[17px] font-bold leading-snug" style={{ fontFamily: sora, color: "#0f172a" }}>{f.title}</h3>
                <p className="text-[14.5px] leading-relaxed" style={{ color: C.gray600 }}>{f.body}</p>
                {f.produse?.length ? (
                  <Tabel
                    capete={["Produs", "Cheltuit", "Se intoarce"]}
                    randuri={f.produse.map((p) => ({ cheie: p.titlu, celule: [p.titlu, lei(p.cost), "necunoscut"], alarma: false }))}
                    restante={f.produseRestante}
                    numeRestante="produse"
                    incastrat
                  />
                ) : null}
              </article>
            ))}
        </ReportSurface>

        {/* ── Cu Devrika ── */}
        {/* Sectiune intreaga, nu un buton in subsol: e a doua jumatate a discutiei, dupa ce omul
            a vazut ce pierde. Cifra de aici e SIMULARE si o spune, iar detaliul se joaca in
            pagina lui, unde el misca ipoteza si completeaza pretul din oferta. */}
        <ReportSurface id="simulator-call-to-action" when={reportGuards.simulator(Boolean(structura), structura?.roasCont ?? 0)} className="mb-6 overflow-hidden rounded-2xl" style={{ background: brandGradient }}>
            <div className="p-8 text-center text-white">
              <p className="mb-2 text-[12.5px] font-bold uppercase tracking-[2px]" style={{ color: "rgba(255,255,255,0.75)" }}>
                Simulare · cu Devrika, la acelasi buget
              </p>
              <p className="mb-2 font-black leading-none tabular-nums" style={{ fontFamily: sora, fontSize: "clamp(32px,7vw,54px)" }}>
                +{lei(venitInPlusLunar)}
              </p>
              <p className="mx-auto mb-6 max-w-[520px] text-[15px] leading-relaxed" style={{ color: "rgba(255,255,255,0.92)" }}>
                Atat ar insemna in plus pe luna din reclame daca clicurile ajung cu 20% mai ieftine
                si conversia creste cu 20% — cele doua lucruri la care lucram efectiv. Nu e o
                promisiune: intra si misca tu ipoteza, pana la zero daca vrei.
              </p>
              <Link href="/google-ads/impreuna"
                className="inline-flex min-h-11 items-center gap-2.5 rounded-[14px] bg-white px-7 py-[14px] text-[15.5px] font-bold no-underline transition-all hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                style={{ color: "#1e1b4b", fontFamily: sora }}>
                Vezi calculul pe cifrele tale
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
        </ReportSurface>

        {/* Contact — dupa ce a vazut valoarea, nu inainte */}
        <ReportSurface id="contact-form" className="mb-6 rounded-2xl border bg-white p-7" style={{ borderColor: C.border }}>
          <h2 className="mb-2 text-[19px] font-bold" style={{ fontFamily: sora, color: "#0f172a" }}>
            Vrei sa iti aratam si cum se repara?
          </h2>
          <p className="mb-5 text-[14.5px] leading-relaxed" style={{ color: C.gray500 }}>
            Lasa-ne un contact si iti trimitem raportul complet, cu toate produsele pe nume si
            ordinea in care merita atacate. Fara obligatii.
          </p>
          <ContactForm action={salveazaContact} />
        </ReportSurface>

        {/* Onestitate */}
        <ReportSurface id="honesty-and-caveats" className="rounded-2xl border p-6" style={{ borderColor: C.border, background: "#fafbff" }}>
          <h2 className="mb-3 text-[15px] font-bold" style={{ fontFamily: sora, color: "#0f172a" }}>
            Ce nu am putut verifica
          </h2>
          <ul className="mb-4 flex flex-col gap-2">
            {rep.caveats.map((c) => (
              <li key={c} className="flex items-start gap-2 text-[13.5px]" style={{ color: C.gray600 }}>
                <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.gray400 }} />
                {c}
              </li>
            ))}
          </ul>
          <p className="text-[12.5px] leading-relaxed" style={{ color: C.gray400 }}>
            <b>MASURAT</b> = citit direct din contul tau. <b>ESTIMARE</b> = cifra reala inmultita
            cu un reper de piata, marcata ca atare. <b>SIMULARE</b> = o proiectie sub ipoteze scrise,
            plafon optimist si incasari, niciodata profit. Nu prezentam niciodata o estimare sau o
            simulare drept fapt.
          </p>
        </ReportSurface>
      </main>
    </div>
  );
}

/**
 * Ce vede omul cand catalogul de Shopping nu se poate citi. Nu e un 500: e o pagina care spune
 * ce s-a intamplat, ce poate face acum si cum ne scrie daca tot nu merge.
 */
function Indisponibil() {
  return (
    <ReportSurface {...registeredPublicOAuthAttributes.report["catalog-unavailable"]} id="catalog-unavailable-recovery" className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center"
      style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
      <span className="sr-only">{publicOAuthProjection.surfaceDisclosure}</span>
      <div className="w-full max-w-[520px] rounded-2xl border bg-white p-8 md:p-10"
        style={{ borderColor: "#e6ebf4", boxShadow: "0 8px 32px rgba(11,31,58,0.06)" }}>
        <h1 className="mb-4 font-extrabold leading-[1.2] tracking-[-0.5px]"
          style={{ fontFamily: sora, fontSize: "clamp(20px,3.2vw,26px)", color: "#0f172a" }}>
          Nu am putut citi catalogul de Shopping
        </h1>
        <p className="mb-7 text-[15px] leading-relaxed" style={{ color: C.gray500 }}>
          Se intampla cand contul nu are inca produse in Shopping, cand accesul prin API tocmai
          a fost retras sau cand Google raspunde greu. Nu s-a modificat nimic in contul tau.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link href="/google-ads/raport"
            className="inline-flex min-h-11 items-center rounded-[14px] px-7 text-[15.5px] font-bold text-white"
            style={{ background: brandGradient, fontFamily: sora }}>
            Incearca din nou
          </Link>
          <a href="mailto:hello@devrika.ro?subject=Audit%20Google%20Ads%20-%20raportul%20nu%20s-a%20generat"
            className="text-[13.5px] font-semibold hover:underline" style={{ color: C.indigo }}>
            Scrie-ne si il facem noi manual
          </a>
        </div>
      </div>
    </ReportSurface>
  );
}

function SectionTitle({ nr, text }: { nr: string; text: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span aria-hidden="true" className="text-[13px] font-black tabular-nums" style={{ fontFamily: sora, color: C.cyan }}>{nr}</span>
      <h2 className="text-[15px] font-extrabold uppercase tracking-[1.5px]" style={{ fontFamily: sora, color: C.navy }}>{text}</h2>
      <span aria-hidden="true" className="h-px flex-1" style={{ background: C.border }} />
    </div>
  );
}

/**
 * Tabelul concret de sub o constatare. Scroll pe orizontala in propriul container: pe telefon,
 * un titlu lung de produs nu are voie sa faca toata pagina sa alunece lateral.
 */
function Tabel({
  capete, randuri, restante, numeRestante, incastrat,
}: {
  capete: string[];
  randuri: { cheie: string; celule: string[]; alarma: boolean }[];
  restante?: number;
  numeRestante: string;
  incastrat?: boolean;
}) {
  return (
    <div className={incastrat ? "mt-4 overflow-hidden rounded-lg border" : "border-t"} style={{ borderColor: C.border }}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr style={{ background: C.slate }}>
              {capete.map((c, i) => (
                <th key={c} scope="col"
                  className={`px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}
                  style={{ color: C.gray400 }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {randuri.map((r) => (
              <tr key={r.cheie} className="border-t" style={{ borderColor: C.border }}>
                {r.celule.map((val, i) => (
                  <td key={i}
                    className={`px-5 py-2.5 text-[13.5px] ${i > 0 ? "text-right tabular-nums" : ""}`}
                    style={{
                      color: i === 0 ? C.gray800 : C.gray600,
                      fontWeight: i === 0 ? 500 : 600,
                      // Alarma marcheaza randul unde cifra e sub prag — culoarea nu e singurul
                      // semnal, cifra insasi e acolo langa ea.
                      ...(r.alarma && i === capete.length - 1 ? { color: C.red } : {}),
                      ...(i === 0 ? { minWidth: 200 } : {}),
                    }}>
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {restante && restante > 0 ? (
        <p className="px-5 py-2.5 text-[12.5px]" style={{ background: C.slate, color: C.gray500 }}>
          … si inca {restante} {numeRestante}. Lista completa vine cu raportul detaliat.
        </p>
      ) : null}
    </div>
  );
}
