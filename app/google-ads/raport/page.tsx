import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { C, sora, inter, brandGradient } from "@/lib/theme";
import { unseal, SESSION_COOKIE } from "@/lib/gads-session";
import { accessTokenFrom, oauthConfig } from "@/lib/gads-oauth";
import { fetchShoppingProducts } from "@/lib/gads-intake";
import { fetchTracking } from "@/lib/gads-tracking";
import { audit, breakEvenRoas } from "@/lib/gads-audit";
import { buildReport, type Tier } from "@/lib/gads-findings";
import ContactForm from "./ContactForm";
import { salveazaContact } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Raportul tau · Audit Google Ads Devrika" };

const TIER_STYLE: Record<Tier, { bg: string; fg: string; label: string }> = {
  MASURAT: { bg: C.greenBg, fg: C.green, label: "MASURAT" },
  ESTIMARE: { bg: C.yellowBg, fg: C.yellow, label: "ESTIMARE" },
  SIMULARE: { bg: "#eef0ff", fg: C.indigo, label: "SIMULARE" },
};

const lei = (n: number) => `${n.toLocaleString("ro-RO")} RON`;

export default async function Raport() {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/google-ads/connect?eroare=sesiune");
  if (!session.customerId) redirect("/google-ads/conturi");
  if (!session.marginPct) redirect("/google-ads/marja");

  const cfg = oauthConfig();
  const token = await accessTokenFrom(session.refreshToken);
  const auth = {
    accessToken: token,
    developerToken: cfg.developerToken,
    // Fara managerul prin care e accesibil contul, Google raspunde USER_PERMISSION_DENIED.
    loginCustomerId: session.loginCustomerId,
  };

  const [{ products, catalogComplete }, tracking] = await Promise.all([
    fetchShoppingProducts(session.customerId, auth),
    fetchTracking(session.customerId, auth),
  ]);

  const minRoas = breakEvenRoas(session.marginPct);
  const rep = buildReport(
    audit(products, minRoas),
    tracking,
    session.marginPct,
    minRoas,
    catalogComplete
  );

  return (
    <div className="min-h-dvh px-6 py-14" style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
      <div className="mx-auto w-full max-w-[720px]">
        <Link href="/google-ads" className="mb-8 flex items-center justify-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={34} height={34} className="h-[34px] w-[34px]" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>

        {/* Cifra de impact */}
        <div className="mb-6 rounded-2xl p-8 text-center text-white" style={{ background: brandGradient }}>
          <p className="mb-2 text-[13px] font-bold uppercase tracking-[2px]" style={{ color: "rgba(255,255,255,0.8)" }}>
            {session.customerName || "Contul tau"} · ultimele 12 luni
          </p>
          <p className="mb-2 font-black leading-none tabular-nums" style={{ fontFamily: sora, fontSize: "clamp(38px,8vw,64px)" }}>
            {lei(rep.headline.ron)}
          </p>
          <p className="text-[15.5px]" style={{ color: "rgba(255,255,255,0.9)" }}>{rep.headline.label}</p>
          <p className="mt-4 text-[13px]" style={{ color: "rgba(255,255,255,0.75)" }}>
            La marja de {session.marginPct}%, pragul tau minim e ROAS {minRoas.toFixed(2)}×
          </p>
        </div>

        {/* Findings */}
        <div className="mb-6 flex flex-col gap-3.5">
          {rep.findings.map((f, i) => {
            const t = TIER_STYLE[f.tier];
            return (
              <div key={f.key} className="rounded-2xl border bg-white p-6"
                style={{ borderColor: f.quarantined ? "#e2e8f0" : "#e6ebf4", opacity: f.quarantined ? 0.85 : 1 }}>
                <div className="mb-3 flex flex-wrap items-center gap-2.5">
                  <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-extrabold text-white"
                    style={{ background: f.quarantined ? C.gray400 : C.indigo }}>
                    {i + 1}
                  </span>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide"
                    style={{ background: t.bg, color: t.fg }}>{t.label}</span>
                  {f.quarantined && (
                    <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide"
                      style={{ background: "#f1f5f9", color: C.gray600 }}>nu se poate judeca inca</span>
                  )}
                </div>
                <h2 className="mb-2 text-[18px] font-bold leading-snug" style={{ fontFamily: sora, color: "#0f172a" }}>
                  {f.title}
                </h2>
                {f.ron > 0 && (
                  <p className="mb-2 text-[22px] font-black tabular-nums" style={{ fontFamily: sora, color: f.tier === "ESTIMARE" ? C.yellow : C.red }}>
                    {lei(f.ron)}
                  </p>
                )}
                <p className="text-[14.5px] leading-relaxed" style={{ color: C.gray600 }}>{f.body}</p>
              </div>
            );
          })}
        </div>

        {/* Contact — dupa ce a vazut valoarea, nu inainte */}
        <div className="mb-6 rounded-2xl border bg-white p-7" style={{ borderColor: "#e6ebf4" }}>
          <h2 className="mb-2 text-[19px] font-bold" style={{ fontFamily: sora, color: "#0f172a" }}>
            Vrei sa iti aratam si cum se repara?
          </h2>
          <p className="mb-5 text-[14.5px] leading-relaxed" style={{ color: C.gray500 }}>
            Lasa-ne un contact si iti trimitem raportul complet, cu produsele pe nume si ordinea
            in care merita atacate. Fara obligatii.
          </p>
          <ContactForm action={salveazaContact} />
        </div>

        {/* Onestitate */}
        <div className="rounded-2xl border p-6" style={{ borderColor: "#e6ebf4", background: "#fafbff" }}>
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
            cu un reper de piata, marcata ca atare. Nu prezentam niciodata o estimare drept fapt.
          </p>
        </div>
      </div>
    </div>
  );
}
