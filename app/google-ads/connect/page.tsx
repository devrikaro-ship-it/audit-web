import Link from "next/link";
import { C, sora, inter, brandGradient } from "@/lib/theme";

// Destinatia CTA-ului din /google-ads. Fluxul de OAuth + citirea contului NU e
// construit inca; pana atunci pagina spune asta pe fata, in loc sa lase butonul
// in 404. Cand vine fluxul, aceasta ruta devine pasul de conectare.

export const metadata = {
  title: "Conectare cont Google Ads · Devrika",
};

export default function Connect() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center"
      style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>

      <Link href="/google-ads" className="mb-10 flex items-center gap-2.5 no-underline">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-devrika.png" alt="Devrika" width={36} height={36} className="h-9 w-9" />
        <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
      </Link>

      <div className="w-full max-w-[520px] rounded-2xl border bg-white p-8 md:p-10"
        style={{ borderColor: "#e6ebf4", boxShadow: "0 8px 32px rgba(11,31,58,0.06)" }}>

        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "#eef0ff" }}>
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
        </div>

        <h1 className="mb-4 font-extrabold leading-[1.2] tracking-[-0.5px]"
          style={{ fontFamily: sora, fontSize: "clamp(22px,3.5vw,30px)", color: "#0f172a" }}>
          Conectarea se activeaza in curand
        </h1>

        <p className="mb-8 text-[15.5px] leading-relaxed" style={{ color: C.gray500 }}>
          Auditul pe cont conectat e in ultima faza de pregatire. Pana atunci iti facem analiza
          manual, pe aceleasi cifre: scrie-ne si iti spunem ce produse iti consuma bugetul in Shopping.
        </p>

        <a href="mailto:hello@devrika.ro?subject=Audit%20Google%20Ads%20Shopping"
          className="inline-flex min-h-11 items-center gap-2.5 rounded-[14px] px-8 py-[15px] text-[16px] font-bold text-white transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
          style={{ background: brandGradient, boxShadow: "0 8px 24px rgba(71,73,158,0.28)", outlineColor: C.indigo }}>
          Scrie-ne pentru audit
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </a>

        <p className="mt-6 text-[13.5px]" style={{ color: C.gray500 }}>
          hello@devrika.ro · Razvan 0742 374 325 · Vlad 0756 281 176
        </p>
      </div>

      <Link href="/google-ads" className="mt-8 text-[13.5px] font-semibold hover:underline" style={{ color: C.indigo }}>
        ← Inapoi la pagina auditului
      </Link>
    </div>
  );
}
