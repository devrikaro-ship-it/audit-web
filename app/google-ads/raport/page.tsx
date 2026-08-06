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
import { fetchStructura } from "@/lib/gads-structure";
import { fetchPmaxData, analizeazaPmax } from "@/lib/gads-pmax";
import { fetchShoppingData, analizeazaShopping } from "@/lib/gads-shopping";
import { fetchSearchData, analizeazaSearch } from "@/lib/gads-search";
import { fetchKeywordData, analizeazaCuvinte } from "@/lib/gads-keywords";
import ContactForm from "./ContactForm";
import { salveazaContact } from "./actions";

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

  // Tot ce se poate cere in acelasi timp se cere in acelasi timp — pagina asta e ce asteapta
  // omul dupa ce si-a conectat contul. O analiza cazuta nu are voie sa doboare raportul.
  const [{ products, catalogComplete }, tracking, structura, brutCuvinte, brutPmax, brutShop, brutCautari] =
    await Promise.all([
    fetchShoppingProducts(session.customerId, auth),
    fetchTracking(session.customerId, auth),
    fetchStructura(session.customerId, auth).catch(() => undefined),
    fetchKeywordData(session.customerId, auth).catch(() => undefined),
    fetchPmaxData(session.customerId, auth).catch(() => undefined),
    fetchShoppingData(session.customerId, auth).catch(() => undefined),
    fetchSearchData(session.customerId, auth).catch(() => undefined),
  ]);
  // Doar potrivirile care au nevoie de alt rezultat se fac dupa: cuvintele au nevoie de
  // catalog, PMax de cheltuiala pe campanie.
  const cuvinte = brutCuvinte
    ? analizeazaCuvinte(brutCuvinte.negative, products, brutCuvinte.termeni, session.customerName)
    : undefined;
  const pmax = brutPmax && structura ? analizeazaPmax(brutPmax, structura.campanii) : undefined;
  const shopping = brutShop ? analizeazaShopping(brutShop, tracking.ok) : undefined;
  const cautari = brutCautari ? analizeazaSearch(brutCautari) : undefined;

  const minRoas = breakEvenRoas(session.marginPct);
  const rep = buildReport(
    audit(products, minRoas),
    tracking,
    session.marginPct,
    minRoas,
    catalogComplete,
    { structura, cuvinte, pmax, shopping, cautari }
  );

  // Doua sectiuni, nu o lista plata: banii pierduti si setarile de reparat sunt lucruri
  // diferite, iar un om care le vede amestecate nu stie ce sa faca luni dimineata.
  const bani = rep.findings.filter((f) => !f.quarantined);
  const nejudecabile = rep.findings.filter((f) => f.quarantined);

  return (
    <div className="min-h-dvh px-5 py-12 sm:px-6 sm:py-14" style={{ fontFamily: inter, background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
      <div className="mx-auto w-full max-w-[780px]">
        <Link href="/google-ads" className="mb-8 flex items-center justify-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={34} height={34} className="h-[34px] w-[34px]" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>

        {/* Cifra de impact */}
        <div className="rounded-t-2xl p-8 text-center text-white" style={{ background: brandGradient }}>
          <p className="mb-2 text-[13px] font-bold uppercase tracking-[2px]" style={{ color: "rgba(255,255,255,0.8)" }}>
            {session.customerName || "Contul tau"} · ultimele 12 luni
          </p>
          <p className="mb-2 font-black leading-none tabular-nums" style={{ fontFamily: sora, fontSize: "clamp(38px,8vw,64px)" }}>
            {lei(rep.headline.ron)}
          </p>
          <p className="text-[15.5px]" style={{ color: "rgba(255,255,255,0.9)" }}>{rep.headline.label}</p>
        </div>

        {/* Sumarul: ce urmeaza, inainte de detaliu */}
        <div className="mb-7 grid grid-cols-2 gap-px rounded-b-2xl border border-t-0 sm:grid-cols-4"
          style={{ borderColor: C.border, background: C.border }}>
          {[
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

        {/* ── Unde pierzi bani ── */}
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

        {/* ── Setari gresite ── */}
        {rep.puncte.length > 0 && (
          <>
            <SectionTitle nr="2" text="Ce e setat gresit in cont" />
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
          </>
        )}

        {/* ── Ce nu se poate judeca inca ── */}
        {nejudecabile.length > 0 && (
          <div className="mb-9 flex flex-col gap-3">
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
          </div>
        )}

        {/* Contact — dupa ce a vazut valoarea, nu inainte */}
        <div className="mb-6 rounded-2xl border bg-white p-7" style={{ borderColor: C.border }}>
          <h2 className="mb-2 text-[19px] font-bold" style={{ fontFamily: sora, color: "#0f172a" }}>
            Vrei sa iti aratam si cum se repara?
          </h2>
          <p className="mb-5 text-[14.5px] leading-relaxed" style={{ color: C.gray500 }}>
            Lasa-ne un contact si iti trimitem raportul complet, cu toate produsele pe nume si
            ordinea in care merita atacate. Fara obligatii.
          </p>
          <ContactForm action={salveazaContact} />
        </div>

        {/* Onestitate */}
        <div className="rounded-2xl border p-6" style={{ borderColor: C.border, background: "#fafbff" }}>
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
