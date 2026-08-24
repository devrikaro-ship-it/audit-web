import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { C, sora, inter } from "@/lib/theme";
import { unseal, SESSION_COOKIE } from "@/lib/gads-session";
import { accessTokenFrom, oauthConfig } from "@/lib/gads-oauth";
import { fetchStructura } from "@/lib/gads-structure";
import { citesteAn, bugetLunarDin, type TotaluriAn } from "@/lib/gads-an";
import { demoOn, demoData } from "@/lib/gads-demo";
import { AUDIT_WINDOW_LABEL } from "@/lib/gads-intake";
import Simulator from "./Simulator";

// Pagina "Cu Devrika": continuarea fireasca a raportului. Raportul spune ce pierde acum; asta
// spune ce ar insemna sa lucram impreuna, pe aceleasi cifre reale ale lui.
//
// Nu are formular de lead si nu vinde nimic singura — trage inapoi in raport, unde e contactul.

export const dynamic = "force-dynamic";
export const metadata = { title: "Ce ar insemna cu Devrika · Audit Google Ads Devrika" };

export default async function Impreuna() {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/google-ads/connect?eroare=sesiune");
  if (!session.customerId) redirect("/google-ads/conturi");
  if (!session.customerTimeZone) redirect("/google-ads/conturi");
  if (!session.marginPct) redirect("/google-ads/marja");

  const { structura, an } = await citesteCifre(
    session.refreshToken,
    session.customerId,
    session.customerTimeZone,
    session.loginCustomerId
  );

  return (
    <div className="min-h-dvh px-5 py-12 sm:px-6 sm:py-14" style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
      <div className="mx-auto w-full max-w-[780px]">
        <Link href="/google-ads/raport" className="mb-8 flex items-center justify-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={34} height={34} className="h-[34px] w-[34px]" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>

        {demoOn() && (
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
            bugetLunar={bugetLunarDin(an, structura.cheltuialaTotala)}
            roasAzi={an?.roas ?? structura.roasCont ?? 0}
            marjaPct={session.marginPct}
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
          <Link href="/google-ads/raport" className="text-[13.5px] font-semibold hover:underline" style={{ color: C.indigo }}>
            ← Inapoi la raportul tau
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Cheltuiala si randamentul contului — singurele doua cifre de care are nevoie proiectia.
 * The 365-day totals match the account-calendar window shown in the audit; structure remains for
 * cazul in care interogarea pe an nu raspunde.
 */
async function citesteCifre(
  refreshToken: string,
  customerId: string,
  customerTimeZone: string,
  loginCustomerId?: string
) {
  if (demoOn()) return { structura: demoData().structura, an: null as TotaluriAn | null };

  const cfg = oauthConfig();
  const token = await accessTokenFrom(refreshToken).catch(() => null);
  if (!token) redirect("/google-ads/connect?eroare=expirat");

  const auth = { accessToken: token, developerToken: cfg.developerToken, loginCustomerId };
  const [structura, an] = await Promise.all([
    fetchStructura(customerId, auth).catch(() => null),
    citesteAn(customerId, auth, customerTimeZone),
  ]);
  return { structura, an };
}
