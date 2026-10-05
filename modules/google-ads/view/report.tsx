import { href } from "@/shared/route-table";
import Link from "next/link";
import { C, sora, inter, brandGradient } from "@/shared/theme";
import { AUDIT_WINDOW_LABEL_ENGLISH as AUDIT_WINDOW_LABEL } from "@/shared/public-contract/audit-window";
import { type Tier } from "@/modules/google-ads/model/findings";
import CatalogPePerformanta from "@/modules/google-ads/view/catalog-by-performance";
import { registeredPublicOAuthAttributes } from "@/shared/public-contract/oauth-contract";
import ContactForm from "@/modules/google-ads/view/contact-form";
import { salveazaContact } from "@/modules/google-ads/controller/report-actions";
import { ReportSurface, reportGuards } from "@/modules/google-ads/view/report-contract";
import ReportingDashboard from "@/modules/google-ads/view/reporting-dashboard";
import type { ReportProps } from "@/modules/google-ads/controller/show-report";

const TIER_STYLE: Record<Tier, { bg: string; fg: string; label: string }> = {
  MASURAT: { bg: C.greenBg, fg: C.green, label: "MEASURED" },
  ESTIMARE: { bg: C.yellowBg, fg: C.yellow, label: "ESTIMATE" },
  SIMULARE: { bg: "#eef0ff", fg: C.indigo, label: "SIMULATION" },
};
// Culoarea de severitate e separata de accentul de brand: rosu/portocaliu/albastru inseamna
// "cat de grav", nu "Devrika". Eticheta scrisa dubleaza culoarea, ca sa nu depinda de ea.
const GRAD_STYLE = {
  critic: { bg: C.redBg, fg: C.red, label: "blocks sales" },
  costa: { bg: C.orangeBg, fg: C.orange, label: "costs money" },
  reglaj: { bg: "#eef0ff", fg: C.indigo, label: "needs adjustment" },
} as const;
const money = (n: number, currencyCode: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(n);
function SectionTitle({ nr, text }: { nr: string; text: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span
        aria-hidden="true"
        className="text-[13px] font-black tabular-nums"
        style={{ fontFamily: sora, color: C.cyan }}
      >
        {nr}
      </span>
      <h2
        className="text-[15px] font-extrabold uppercase tracking-[1.5px]"
        style={{ fontFamily: sora, color: C.navy }}
      >
        {text}
      </h2>
      <span
        aria-hidden="true"
        className="h-px flex-1"
        style={{ background: C.border }}
      />
    </div>
  );
}
/**
 * Tabelul concret de sub o constatare. Scroll pe orizontala in propriul container: pe telefon,
 * un titlu lung de produs nu are voie sa faca toata pagina sa alunece lateral.
 */
function Tabel({
  capete,
  randuri,
  restante,
  numeRestante,
  incastrat,
}: {
  capete: string[];
  randuri: { cheie: string; celule: string[]; alarma: boolean }[];
  restante?: number;
  numeRestante: string;
  incastrat?: boolean;
}) {
  return (
    <div
      className={
        incastrat ? "mt-4 overflow-hidden rounded-lg border" : "border-t"
      }
      style={{ borderColor: C.border }}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr style={{ background: C.slate }}>
              {capete.map((c, i) => (
                <th
                  key={c}
                  scope="col"
                  className={`px-5 py-2.5 text-[11px] font-extrabold uppercase tracking-wide ${i > 0 ? "text-right" : ""}`}
                  style={{ color: C.gray400 }}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {randuri.map((r) => (
              <tr
                key={r.cheie}
                className="border-t"
                style={{ borderColor: C.border }}
              >
                {r.celule.map((val, i) => (
                  <td
                    key={i}
                    className={`px-5 py-2.5 text-[13.5px] ${i > 0 ? "text-right tabular-nums" : ""}`}
                    style={{
                      color: i === 0 ? C.gray800 : C.gray600,
                      fontWeight: i === 0 ? 500 : 600,
                      // Alarma marcheaza randul unde cifra e sub prag — culoarea nu e singurul
                      // semnal, cifra insasi e acolo langa ea.
                      ...(r.alarma && i === capete.length - 1
                        ? { color: C.red }
                        : {}),
                      ...(i === 0 ? { minWidth: 200 } : {}),
                    }}
                  >
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {restante && restante > 0 ? (
        <p
          className="px-5 py-2.5 text-[12.5px]"
          style={{ background: C.slate, color: C.gray500 }}
        >
          … and {restante} more {numeRestante}. The complete list is included in the detailed
          report.
        </p>
      ) : null}
    </div>
  );
}

export function ReportView({ session, currencyCode, demo, products, structura, minRoas, rep, hartiCatalog, venitInPlusLunar, bani, nejudecabile, pendingReportReference, snapshotViewV2 }: ReportProps) {
  return (
    <div
      {...registeredPublicOAuthAttributes.report.success}
      className="min-h-dvh"
      style={{ fontFamily: inter, background: "#f7f8fc" }}
    >
      <main
        data-report-root
        data-report-version="profitability-v3-original"
        className="w-full"
      >
        <ReportSurface
          id="navigation"
          aria-hidden="true"
          style={{ display: "none" }}
        >
          <Link
            href={href("gadsLanding")}
            className="mb-8 flex items-center justify-center gap-2.5 no-underline"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-devrika.png"
              alt="Devrika"
              width={34}
              height={34}
              className="h-[34px] w-[34px]"
            />
            <span
              className="text-base font-extrabold tracking-[-0.3px]"
              style={{ color: "#1e1b4b" }}
            >
              Devrika
            </span>
          </Link>
        </ReportSurface>

        <ReportSurface
          id="demo-banner"
          when={reportGuards.demoBanner(demo)}
          aria-hidden="true"
          style={{ display: "none" }}
        >
          {/* Un raport demo care se da drept cifrele lui e o minciuna care ajunge la un client.
              Banda sta sus, inaintea cifrei de impact, si nu se poate rata. */}
          <div
            className="mb-4 rounded-xl px-5 py-3.5 text-center text-[13.5px] font-bold"
            style={{ background: C.yellowBg, color: C.yellow }}
          >
            DEMO MODE — the figures below are simulated and do not come from a real account
          </div>
        </ReportSurface>

        {/* Cifra de impact */}
        <ReportSurface
          id="headline-summary"
          aria-hidden="true"
          style={{ display: "none" }}
        >
          <div
            data-report-part="headline-gradient"
            className="rounded-t-2xl p-8 text-center text-white"
            style={{ background: brandGradient }}
          >
            <p
              className="mb-2 text-[13px] font-bold uppercase tracking-[2px]"
              style={{ color: "rgba(255,255,255,0.8)" }}
            >
              {session.customerName || "Your account"} · {AUDIT_WINDOW_LABEL}
            </p>
            <p
              className="mb-2 font-black leading-none tabular-nums"
              style={{ fontFamily: sora, fontSize: "clamp(38px,8vw,64px)" }}
            >
              {money(rep.headline.ron, currencyCode)}
            </p>
            <p
              className="text-[15.5px]"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              {rep.headline.label}
            </p>
          </div>
          {/* Sumarul: ce urmeaza, inainte de detaliu */}
          <div
            data-report-part="summary-grid"
            className="mb-7 grid grid-cols-2 gap-px rounded-b-2xl border border-t-0 sm:grid-cols-4"
            style={{ borderColor: C.border, background: C.border }}
          >
            {[
              // REVERTED 2026-08-21. A `ron > 0` filter here was worse than the defect it removed:
              // it also counts the SIMULARE finding, which is a projected GAIN rendered green with a
              // "+", and it left the header saying 4 above five numbered cards. Two reviews measured
              // it independently. The honest number on the demo account is 3, and reaching it needs
              // the sign of the money to be a declared property of a Finding rather than a guess made
              // in three places. That is a change with a contract, not a one-line filter, so this
              // stays as it was until then and the mismatch it carries is a known open point.
              { k: "Findings that cost money", v: String(bani.length) },
              { k: "Settings to fix", v: String(rep.puncte.length) },
              { k: "Products analyzed", v: String(products.length) },
              { k: "Your minimum threshold", v: `ROAS ${Math.round(minRoas)}x` },
            ].map((x) => (
              <div key={x.k} className="bg-white px-4 py-4 text-center">
                <p
                  className="mb-1 text-[19px] font-black tabular-nums"
                  style={{ fontFamily: sora, color: C.navy }}
                >
                  {x.v}
                </p>
                <p
                  className="text-[11.5px] font-semibold uppercase leading-tight tracking-wide"
                  style={{ color: C.gray400 }}
                >
                  {x.k}
                </p>
              </div>
            ))}
          </div>
        </ReportSurface>

        {/* ── Unde pierzi bani ── */}
        <ReportSurface
          id="money-findings"
          aria-hidden="true"
          style={{ display: "none" }}
        >
          <SectionTitle nr="1" text="Where you lose money" />
          <div className="mb-9 flex flex-col gap-3.5">
            {bani.map((f, i) => {
              const t = TIER_STYLE[f.tier];
              return (
                <article
                  key={f.key}
                  className="overflow-hidden rounded-2xl border bg-white"
                  style={{ borderColor: C.border }}
                >
                  <div className="p-6 pb-5">
                    <div className="mb-3 flex flex-wrap items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white"
                        style={{ background: C.indigo }}
                      >
                        {i + 1}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide"
                        style={{ background: t.bg, color: t.fg }}
                      >
                        {t.label}
                      </span>
                    </div>
                    <h3
                      className="mb-2 text-[18.5px] font-bold leading-snug"
                      style={{ fontFamily: sora, color: "#0f172a" }}
                    >
                      {f.title}
                    </h3>
                    {f.ron > 0 && (
                      // Simularea e castig, nu pierdere — verde cu "+", ca sa nu fie citita ca inca o gaura.
                      <p
                        className="mb-2 text-[26px] font-black leading-none tabular-nums"
                        style={{
                          fontFamily: sora,
                          color:
                            f.tier === "SIMULARE"
                              ? C.green
                              : f.tier === "ESTIMARE"
                                ? C.yellow
                                : C.red,
                        }}
                      >
                        {f.tier === "SIMULARE" ? `+${money(f.ron, currencyCode)}` : money(f.ron, currencyCode)}
                      </p>
                    )}
                    <p
                      className="text-[14.5px] leading-relaxed"
                      style={{ color: C.gray600 }}
                    >
                      {f.body}
                    </p>
                  </div>

                  {f.produse?.length ? (
                    <Tabel
                      capete={["Product", "Spent", "Return"]}
                      randuri={f.produse.map((p) => ({
                        cheie: p.titlu,
                        celule: [
                          p.titlu,
                          p.cost > 0 ? money(p.cost, currencyCode) : "—",
                          p.roas === undefined ? "—" : `${Math.round(p.roas)}x`,
                        ],
                        alarma: p.roas !== undefined && p.roas < minRoas,
                      }))}
                      restante={f.produseRestante}
                      numeRestante="products"
                    />
                  ) : null}

                  {f.termeni?.length ? (
                    <Tabel
                      capete={["Search query", "Clicks", "Spent"]}
                      randuri={f.termeni.map((t2) => ({
                        cheie: t2.termen,
                        celule: [
                          t2.termen,
                          String(t2.clicuri),
                          money(Math.round(t2.cost), currencyCode),
                        ],
                        alarma: true,
                      }))}
                      restante={f.termeniRestanti}
                      numeRestante="searches"
                    />
                  ) : null}
                </article>
              );
            })}
          </div>
        </ReportSurface>

        <ReportSurface
          id="profitability-simulator"
          when={reportGuards.catalogMap(products.length)}
          className="contents"
        >
          <ReportingDashboard
            report={snapshotViewV2}
            demo={demo}
          />
        </ReportSurface>

        {/* ── Catalogul pe performanta ── */}
        <ReportSurface
          id="catalog-map"
          when={reportGuards.catalogMap(hartiCatalog.length)}
          aria-hidden="true"
          style={{ display: "none" }}
        >
          <SectionTitle nr="2" text="How your catalog performs" />
          <CatalogPePerformanta harti={hartiCatalog} currencyCode={currencyCode} />
        </ReportSurface>

        {/* ── Setari gresite ── */}
        <ReportSurface
          id="account-settings"
          when={reportGuards.accountSettings(rep.puncte.length)}
          aria-hidden="true"
          style={{ display: "none" }}
        >
          <SectionTitle nr="3" text="What is configured incorrectly" />
          <p
            className="mb-4 text-[14px] leading-relaxed"
            style={{ color: C.gray500 }}
          >
            These amounts are not confirmed losses. They show how much budget passes through each
            misconfigured setting, not how much was wasted.
          </p>
          <div className="mb-9 flex flex-col gap-3">
            {rep.puncte.map((p) => {
              const g = GRAD_STYLE[p.grad];
              return (
                <article
                  key={p.cod}
                  className="flex gap-0 overflow-hidden rounded-xl border bg-white"
                  style={{ borderColor: C.border }}
                >
                  <div
                    aria-hidden="true"
                    className="w-1 shrink-0"
                    style={{ background: g.fg }}
                  />
                  <div className="min-w-0 flex-1 p-5">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2.5 py-1 text-[10.5px] font-extrabold uppercase tracking-wide"
                        style={{ background: g.bg, color: g.fg }}
                      >
                        {g.label}
                      </span>
                      {p.ron > 0 && (
                        <span
                          className="text-[13px] font-bold tabular-nums"
                          style={{ color: C.gray600 }}
                        >
                          {money(p.ron, currencyCode)} budget affected
                        </span>
                      )}
                    </div>
                    <h3
                      className="mb-1.5 text-[16px] font-bold leading-snug"
                      style={{ fontFamily: sora, color: "#0f172a" }}
                    >
                      {p.titlu}
                    </h3>
                    <p
                      className="text-[14px] leading-relaxed"
                      style={{ color: C.gray600 }}
                    >
                      {p.detaliu}
                    </p>
                    {p.exemple?.length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.exemple.map((e) => (
                          <span
                            key={e}
                            className="rounded-md px-2 py-1 text-[12px]"
                            style={{ background: C.slate, color: C.gray600 }}
                          >
                            {e}
                          </span>
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
        <ReportSurface
          id="unsupported-conclusions"
          when={reportGuards.unsupportedConclusions(nejudecabile.length)}
          aria-hidden="true"
          style={{ display: "none" }}
        >
          {nejudecabile.map((f) => (
            <article
              key={f.key}
              className="overflow-hidden rounded-xl border p-6"
              style={{ borderColor: "#e2e8f0", background: "#fafbff" }}
            >
              <span
                className="mb-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide"
                style={{ background: "#f1f5f9", color: C.gray600 }}
              >
                cannot be assessed yet
              </span>
              <h3
                className="mb-2 text-[17px] font-bold leading-snug"
                style={{ fontFamily: sora, color: "#0f172a" }}
              >
                {f.title}
              </h3>
              <p
                className="text-[14.5px] leading-relaxed"
                style={{ color: C.gray600 }}
              >
                {f.body}
              </p>
              <Tabel
                capete={["Product", "Spent", "Return"]}
                randuri={f.produse!.map((p) => ({
                  cheie: p.titlu,
                  celule: [p.titlu, money(p.cost, currencyCode), "unknown"],
                  alarma: false,
                }))}
                restante={f.produseRestante}
                numeRestante="products"
                incastrat
              />
            </article>
          ))}
        </ReportSurface>

        {/* ── Cu Devrika ── */}
        {/* Sectiune intreaga, nu un buton in subsol: e a doua jumatate a discutiei, dupa ce omul
            a vazut ce pierde. Cifra de aici e SIMULARE si o spune, iar detaliul se joaca in
            pagina lui, unde el misca ipoteza si completeaza pretul din oferta. */}
        <ReportSurface
          id="simulator-call-to-action"
          when={reportGuards.simulator(
            Boolean(structura),
            structura?.roasCont ?? 0,
          )}
          aria-hidden="true"
          style={{ display: "none" }}
        >
          <div className="p-8 text-center text-white">
            <p
              className="mb-2 text-[12.5px] font-bold uppercase tracking-[2px]"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              Simulation · with Devrika, at the same budget
            </p>
            <p
              className="mb-2 font-black leading-none tabular-nums"
              style={{ fontFamily: sora, fontSize: "clamp(32px,7vw,54px)" }}
            >
              +{money(venitInPlusLunar, currencyCode)}
            </p>
            <p
              className="mx-auto mb-6 max-w-[520px] text-[15px] leading-relaxed"
              style={{ color: "rgba(255,255,255,0.92)" }}
            >
              This is the additional monthly sales the ads could generate if clicks become 20%
              cheaper and conversion improves by 20%. It is not a promise: open the calculation
              and adjust the assumptions yourself, including down to zero.
            </p>
            <Link
              href={href("gadsTogether")}
              className="inline-flex min-h-11 items-center gap-2.5 rounded-[14px] bg-white px-7 py-[14px] text-[15.5px] font-bold no-underline transition-all hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              style={{ color: "#1e1b4b", fontFamily: sora }}
            >
              See the calculation with your figures
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </ReportSurface>

        {/* Contact — dupa ce a vazut valoarea, nu inainte */}
        <ReportSurface
          id="contact-form"
          className="mx-auto my-6 max-w-[1120px] rounded-2xl border bg-white p-7"
          style={{ borderColor: C.border, width: "calc(100% - 40px)" }}
        >
          <h2
            className="mb-2 text-[19px] font-bold"
            style={{ fontFamily: sora, color: "#0f172a" }}
          >
            Would you like us to show you how to fix it?
          </h2>
          <p
            className="mb-5 text-[14.5px] leading-relaxed"
            style={{ color: C.gray500 }}
          >
            Leave your contact details and we will send the complete report, with every product
            named and the recommended order of action. No obligation.
          </p>
          <ContactForm
            action={salveazaContact}
            pendingReportReference={pendingReportReference}
          />
        </ReportSurface>

        {/* Onestitate */}
        <ReportSurface
          id="honesty-and-caveats"
          className="mx-auto mb-6 max-w-[1120px] rounded-2xl border p-6"
          style={{
            borderColor: C.border,
            background: "#fafbff",
            width: "calc(100% - 40px)",
          }}
        >
          <h2
            className="mb-3 text-[15px] font-bold"
            style={{ fontFamily: sora, color: "#0f172a" }}
          >
            What we could not verify
          </h2>
          <ul className="mb-4 flex flex-col gap-2">
            {rep.caveats.map((c) => (
              <li
                key={c}
                className="flex items-start gap-2 text-[13.5px]"
                style={{ color: C.gray600 }}
              >
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: C.gray400 }}
                />
                {c}
              </li>
            ))}
          </ul>
          <p
            className="text-[12.5px] leading-relaxed"
            style={{ color: C.gray400 }}
          >
            <b>MEASURED</b> = read directly from your account. <b>ESTIMATE</b> = a measured figure
            combined with a market benchmark and labeled accordingly. <b>SIMULATION</b> = a
            projection under stated assumptions, with an optimistic cap, expressed as sales and
            never profit. Estimates and simulations are never presented as facts.
          </p>
        </ReportSurface>
      </main>
    </div>
  );
}
