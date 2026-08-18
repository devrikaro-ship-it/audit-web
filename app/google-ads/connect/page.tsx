import Link from "next/link";
import { C, sora, inter, brandGradient } from "@/lib/theme";
import { missingConfig } from "@/lib/gads-oauth";

// Ecranul de dinaintea consimtamantului Google. Rolul lui e sa scada frica: omul e pe punctul
// sa dea acces la contul in care tine bani, deci spune EXACT ce cerem si ce nu.

export const dynamic = "force-dynamic";
export const metadata = { title: "Conecteaza contul Google Ads · Devrika" };

const ERORI: Record<string, string> = {
  anulat: "Ai oprit conectarea la Google. Nu s-a intamplat nimic — poti relua oricand.",
  state: "Conectarea a expirat inainte sa fie finalizata. Mai incearca o data.",
  sesiune: "Sesiunea a expirat. Reconecteaza contul ca sa continuam.",
  expirat: "Accesul la contul tau de Google a expirat sau a fost retras intre timp. Reconecteaza-te si reluam auditul — dureaza zece secunde.",
  schimb: "Google nu a putut confirma conectarea. Mai incearca o data.",
  fara_cod: "Raspunsul de la Google a venit incomplet. Mai incearca o data.",
  google: "Google a refuzat conectarea. Mai incearca o data.",
  config: "Conectarea nu e activa inca pe acest server.",
};

export default async function Connect({
  searchParams,
}: {
  searchParams: Promise<{ eroare?: string; lipsa?: string }>;
}) {
  const { eroare, lipsa } = await searchParams;
  const notConfigured = missingConfig().length > 0;
  const mesaj = eroare ? (ERORI[eroare] ?? ERORI.google) : null;

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

        {mesaj && (
          <p className="mb-6 rounded-xl px-4 py-3 text-left text-[13.5px] leading-relaxed"
            style={{ background: C.yellowBg, color: C.yellow }}>
            {mesaj}{lipsa ? ` (${lipsa})` : ""}
          </p>
        )}

        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "#eef0ff" }}>
          <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <h1 className="mb-4 font-extrabold leading-[1.2] tracking-[-0.5px]"
          style={{ fontFamily: sora, fontSize: "clamp(22px,3.5vw,30px)", color: "#0f172a" }}>
          {notConfigured ? "Conectarea se activeaza in curand" : "Conecteaza contul Google Ads"}
        </h1>

        {notConfigured ? (
          <>
            <p className="mb-8 text-[15.5px] leading-relaxed" style={{ color: C.gray500 }}>
              Auditul pe cont conectat e in ultima faza de pregatire. Pana atunci iti facem analiza
              manual, pe aceleasi cifre: scrie-ne si iti spunem ce produse iti consuma bugetul.
            </p>
            <a href="mailto:hello@devrika.ro?subject=Audit%20Google%20Ads%20Shopping"
              className="inline-flex min-h-11 items-center gap-2.5 rounded-[14px] px-8 py-[15px] text-[16px] font-bold text-white transition-all hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              style={{ background: brandGradient, boxShadow: "0 8px 24px rgba(71,73,158,0.28)" }}>
              Scrie-ne pentru audit
            </a>
          </>
        ) : (
          <>
            <p className="mb-7 text-[15.5px] leading-relaxed" style={{ color: C.gray500 }}>
              Google iti va cere confirmarea. Iti aratam mai jos exact ce primim si ce nu.
            </p>

            <ul className="mb-8 flex flex-col gap-2.5 text-left">
              {[
                { ok: true, t: "Citim datele de Shopping din ultimele 12 luni" },
                { ok: false, t: "NU putem modifica nimic — nici bugete, nici campanii" },
                { ok: false, t: "NU cerem acces la Gmail, Drive sau alte servicii" },
                { ok: true, t: "Poti retrage accesul oricand, dintr-un click, din contul tau Google" },
              ].map((r) => (
                <li key={r.t} className="flex items-start gap-2.5 text-[14px]" style={{ color: "#334155" }}>
                  <span aria-hidden="true" className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: r.ok ? C.green : C.gray400 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      {r.ok ? <path d="M20 6 9 17l-5-5" /> : <path d="M18 6 6 18M6 6l12 12" />}
                    </svg>
                  </span>
                  {r.t}
                </li>
              ))}
            </ul>

            <a href="/api/google-ads/start"
              className="inline-flex min-h-11 items-center gap-2.5 rounded-[14px] px-8 py-[15px] text-[16px] font-bold text-white transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              style={{ background: brandGradient, boxShadow: "0 8px 24px rgba(71,73,158,0.28)", outlineColor: C.indigo }}>
              Continua catre Google
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </>
        )}
      </div>

      <Link href="/google-ads" className="mt-8 text-[13.5px] font-semibold hover:underline" style={{ color: C.indigo }}>
        ← Inapoi la pagina auditului
      </Link>
    </div>
  );
}
