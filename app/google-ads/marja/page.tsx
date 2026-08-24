import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { C, sora, inter } from "@/lib/theme";
import { GROSS_MARGIN_ERROR, unseal, SESSION_COOKIE } from "@/lib/gads-session";
import { accessTokenFrom, oauthConfig } from "@/lib/gads-oauth";
import { fetchShoppingProducts } from "@/lib/gads-intake";
import { suggestMargin } from "@/lib/gads-audit";
import { demoOn, demoData } from "@/lib/gads-demo";
import { salveazaMarja } from "./actions";
import MarginForm from "./MarginForm";

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

  const cfg = oauthConfig();
  let sugestie = { label: "magazin online", marginPct: 35, detected: false };
  let nrProduse = 0;
  if (demoOn()) {
    const { products } = demoData();
    nrProduse = products.length;
    sugestie = suggestMargin(products);
  } else try {
    const token = await accessTokenFrom(session.refreshToken);
    const { products } = await fetchShoppingProducts(session.customerId, {
      accessToken: token,
      developerToken: cfg.developerToken,
      loginCustomerId: session.loginCustomerId,
    }, session.customerTimeZone);
    nrProduse = products.length;
    sugestie = suggestMargin(products);
  } catch {
    // Daca citirea catalogului pica, intrebarea ramane valabila cu valoarea implicita.
  }

  return (
    <div className="min-h-dvh px-6 py-16" style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
      <div className="mx-auto w-full max-w-[620px]">
        <Link href="/google-ads" className="mb-8 flex items-center justify-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={34} height={34} className="h-[34px] w-[34px]" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>

        <div className="rounded-2xl border bg-white p-7 md:p-9" style={{ borderColor: "#e6ebf4", boxShadow: "0 8px 32px rgba(11,31,58,0.06)" }}>
          <p className="mb-2 text-[13px] font-bold uppercase tracking-[2px]" style={{ color: C.cyan }}>Pasul 2 din 3</p>
          <h1 className="mb-3 font-extrabold leading-[1.2] tracking-[-0.5px]" style={{ fontFamily: sora, fontSize: "clamp(22px,3.5vw,30px)", color: "#0f172a" }}>
            Cat iti ramane din 100 de lei vanzare?
          </h1>
          <p className="mb-1 text-[15px] leading-relaxed" style={{ color: C.gray500 }}>
            Dupa ce platesti produsul catre furnizor, inainte de reclame si salarii. Din asta
            calculam cat trebuie sa aduca minim fiecare leu bagat in reclame.
          </p>
          {nrProduse > 0 && (
            <p className="mb-6 text-[13.5px]" style={{ color: C.gray400 }}>
              {sugestie.detected
                ? `Am citit ${nrProduse} produse din contul tau si arata a ${sugestie.label}. Magazinele din categoria asta au tipic ${sugestie.marginPct}% — am pornit de acolo, schimba daca la tine e altfel.`
                : `Am citit ${nrProduse} produse din contul tau, dar nu am putut deduce categoria. Am pus o valoare medie de ${sugestie.marginPct}% — pune-o pe a ta.`}
            </p>
          )}

          {eroare === "marja" && (
            <p className="mb-6 rounded-xl px-4 py-3 text-[13.5px] leading-relaxed"
              style={{ background: C.yellowBg, color: C.yellow }}>
              {GROSS_MARGIN_ERROR}
            </p>
          )}

          <MarginForm initial={sugestie.marginPct} action={salveazaMarja} />
        </div>

        <p className="mt-6 text-center text-[12.5px]" style={{ color: C.gray400 }}>
          Nu iti cerem preturi, facturi sau acces la contabilitate. Un singur procent, aproximativ.
        </p>
      </div>
    </div>
  );
}
