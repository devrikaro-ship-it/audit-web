import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { C, sora, inter, brandGradient } from "@/lib/theme";
import { unseal, SESSION_COOKIE } from "@/lib/gads-session";
import { accessTokenFrom, listAccounts, type AccessibleAccount } from "@/lib/gads-oauth";
import { demoOn, demoAccounts } from "@/lib/gads-demo";
import { alegeCont } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Alege contul · Audit Google Ads Devrika" };

export default async function Conturi() {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/google-ads/connect?eroare=sesiune");

  let accounts: AccessibleAccount[] = [];
  let error: string | null = null;
  if (demoOn()) {
    accounts = demoAccounts();
  } else {
    try {
      accounts = await listAccounts(await accessTokenFrom(session.refreshToken));
    } catch (e) {
      error = e instanceof Error ? e.message : "necunoscuta";
    }
  }

  const usable = accounts.filter((a) => !a.manager);

  return (
    <div className="min-h-dvh px-6 py-16" style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
      <div className="mx-auto w-full max-w-[620px]">
        <Link href="/google-ads" className="mb-8 flex items-center justify-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={34} height={34} className="h-[34px] w-[34px]" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>

        <div className="rounded-2xl border bg-white p-7 md:p-9" style={{ borderColor: "#e6ebf4", boxShadow: "0 8px 32px rgba(11,31,58,0.06)" }}>
          <p className="mb-2 text-[13px] font-bold uppercase tracking-[2px]" style={{ color: C.cyan }}>Pasul 1 din 3</p>
          <h1 className="mb-3 font-extrabold leading-[1.2] tracking-[-0.5px]" style={{ fontFamily: sora, fontSize: "clamp(22px,3.5vw,30px)", color: "#0f172a" }}>
            Ce cont analizam?
          </h1>

          {error ? (
            <>
              <p className="mb-6 text-[15px] leading-relaxed" style={{ color: C.gray500 }}>
                Nu am putut citi lista de conturi. Se intampla cand contul nu are inca acces la
                Google Ads API sau cand conectarea a expirat.
              </p>
              <p className="mb-6 rounded-lg px-4 py-3 text-[13px]" style={{ background: C.redBg, color: C.red }}>{error}</p>
              <Link href="/api/google-ads/start" className="inline-flex min-h-11 items-center rounded-xl px-6 text-[15px] font-bold text-white" style={{ background: brandGradient }}>
                Reincearca conectarea
              </Link>
            </>
          ) : usable.length === 0 ? (
            <>
              <p className="mb-6 text-[15px] leading-relaxed" style={{ color: C.gray500 }}>
                Contul cu care te-ai conectat nu are niciun cont de Google Ads pe care sa-l putem
                analiza. Daca administrezi magazinul din alt cont Google, conecteaza-te cu acela.
              </p>
              <Link href="/api/google-ads/start" className="inline-flex min-h-11 items-center rounded-xl px-6 text-[15px] font-bold text-white" style={{ background: brandGradient }}>
                Incearca alt cont Google
              </Link>
            </>
          ) : (
            <>
              <p className="mb-7 text-[15px] leading-relaxed" style={{ color: C.gray500 }}>
                Am gasit {usable.length === 1 ? "un cont" : `${usable.length} conturi`}. Alege
                magazinul pe care vrei sa-l vezi analizat.
              </p>
              <div className="flex flex-col gap-2.5">
                {usable.map((a) => (
                  <form key={a.customerId} action={alegeCont}>
                    <input type="hidden" name="customerId" value={a.customerId} />
                    <input type="hidden" name="name" value={a.name} />
                    <input type="hidden" name="loginCustomerId" value={a.loginCustomerId} />
                    <button
                      type="submit"
                      className="flex w-full min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border bg-white px-4 py-3.5 text-left transition-colors hover:border-[#47499E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                      style={{ borderColor: "#e2e8f0", outlineColor: C.indigo }}
                    >
                      <span>
                        <span className="block text-[15px] font-bold" style={{ fontFamily: sora, color: "#1e293b" }}>{a.name}</span>
                        <span className="block text-[12.5px]" style={{ color: C.gray400 }}>
                          {a.customerId.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3")} · {a.currency}
                        </span>
                      </span>
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.indigo} strokeWidth="2.5" strokeLinecap="round">
                        <path d="M9 6l6 6-6 6" />
                      </svg>
                    </button>
                  </form>
                ))}
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[12.5px]" style={{ color: C.gray400 }}>
          Citim doar datele de Shopping. Nu modificam nimic si poti retrage accesul oricand din contul tau Google.
        </p>
      </div>
    </div>
  );
}
