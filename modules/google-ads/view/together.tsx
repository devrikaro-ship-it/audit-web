import { href } from "@/shared/route-table";
import Link from "next/link";
import { C, sora, inter } from "@/shared/theme";
import { AUDIT_WINDOW_LABEL } from "@/shared/public-contract/audit-window";
import Simulator from "@/modules/google-ads/view/simulator";
import { publicOAuthAttributes } from "@/shared/public-contract/oauth-contract";
import type { TogetherProps } from "@/modules/google-ads/controller/show-together";


export function TogetherView({ marginPct, structura, an, demo, bugetLunar }: TogetherProps) {
  return (
    <div {...publicOAuthAttributes("simulator")} className="min-h-dvh px-5 py-12 sm:px-6 sm:py-14" style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
      <div className="mx-auto w-full max-w-[780px]">
        <Link href={href("gadsReport")} className="mb-8 flex items-center justify-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={34} height={34} className="h-[34px] w-[34px]" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>

        {demo && (
          <div className="mb-4 rounded-xl px-5 py-3.5 text-center text-[13.5px] font-bold"
            style={{ background: C.yellowBg, color: C.yellow }}>
            MOD DEMO — cifrele de mai jos sunt simulate, nu vin din niciun cont real
          </div>
        )}

        <h1 className="mb-3 font-extrabold leading-[1.15] tracking-[-0.5px]"
          style={{ fontFamily: sora, fontSize: "clamp(26px,4.5vw,38px)", color: "#0f172a" }}>
          Ce ar insemna sa lucram impreuna
        </h1>
        <p className="mb-8 text-[15.5px] leading-relaxed" style={{ color: C.gray500 }}>
          Pe cifrele tale din ultimele {AUDIT_WINDOW_LABEL}, nu pe un exemplu. Tu misti ipoteza
          si completezi pretul din oferta; noi nu ascundem nimic in spatele lor.
        </p>

        {structura ? (
          <Simulator
            bugetLunar={bugetLunar}
            roasAzi={an?.roas ?? structura.roasCont ?? 0}
            marjaPct={marginPct}
          />
        ) : (
          <div className="rounded-2xl border bg-white p-7" style={{ borderColor: C.border }}>
            <h2 className="mb-2 text-[17px] font-bold" style={{ fontFamily: sora, color: "#0f172a" }}>
              Nu am putut citi cheltuiala contului
            </h2>
            <p className="text-[14.5px] leading-relaxed" style={{ color: C.gray500 }}>
              Fara ea, orice proiectie ar fi o cifra inventata — si aia nu facem. Reia raportul in
              cateva minute sau scrie-ne si o facem impreuna, pe ecran.
            </p>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href={href("gadsReport")} className="text-[13.5px] font-semibold hover:underline" style={{ color: C.indigo }}>
            ← Inapoi la raportul tau
          </Link>
        </div>
      </div>
    </div>
  );
}
