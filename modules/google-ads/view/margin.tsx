import { href } from "@/shared/route-table";
import Link from "next/link";
import { C, sora, inter } from "@/shared/theme";
import { GROSS_MARGIN_ERROR } from "@/modules/google-ads/model/margin";
import { salveazaMarja } from "@/modules/google-ads/controller/margin-actions";
import MarginForm from "@/modules/google-ads/view/margin-form";
import { publicOAuthAttributes } from "@/shared/public-contract/oauth-contract";
import type { MarginProps } from "@/modules/google-ads/controller/show-margin";


export function MarginView({ eroare, currencyCode, sugestie, nrProduse, baseline }: MarginProps) {
  return (
    <div {...publicOAuthAttributes("margin", eroare === "marja" ? "error" : "normal")} className="min-h-dvh px-6 py-16" style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
      <div className="mx-auto w-full max-w-[620px]">
        <Link href={href("gadsLanding")} className="mb-8 flex items-center justify-center gap-2.5 no-underline">
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
