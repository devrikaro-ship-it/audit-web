import Link from "next/link";
import { C, sora, inter, brandGradient } from "@/lib/theme";
import { missingConfig } from "@/lib/gads-oauth";
import { projectOAuthClauses, publicOAuthAttributes, publicOAuthProjection } from "@/lib/gads-public-oauth-contract";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conecteaza contul Google Ads · Devrika" };

const ERROR_COPY: Record<string, string> = {
  anulat: "Ai oprit conectarea la Google. Nu s-a intamplat nimic — poti relua oricand.",
  state: "Conectarea a expirat inainte sa fie finalizata. Mai incearca o data.",
  sesiune: "Sesiunea a expirat. Reconecteaza contul ca sa continuam.",
  expirat: "Accesul la contul tau de Google a expirat sau a fost retras intre timp. Reconecteaza-te si reluam auditul — dureaza zece secunde.",
  schimb: "Google nu a putut confirma conectarea. Mai incearca o data.",
  fara_cod: "Raspunsul de la Google a venit incomplet. Mai incearca o data.",
  google: "Google a refuzat conectarea. Mai incearca o data.",
  config: "Conectarea nu e activa inca pe acest server.",
  website: "Introdu adresa magazinului inainte sa conectezi contul Google Ads.",
};

const previewRows = [
  ["Produse care consuma buget", "Pierderi ordonate dupa cost", C.red],
  ["Produse profitabile fara trafic", "Potential ordonat dupa vanzari", C.green],
  ["Contul dupa optimizare", "Simulare cu buget controlat", C.cyan],
] as const;

function CheckIcon() {
  return <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>;
}

export default async function Connect({ searchParams }: { searchParams: Promise<{ eroare?: string; lipsa?: string }> }) {
  const { eroare, lipsa } = await searchParams;
  const notConfigured = missingConfig().length > 0;
  const message = eroare ? (ERROR_COPY[eroare] ?? ERROR_COPY.google) : null;

  return (
    <div {...publicOAuthAttributes("connect", message ? "error" : "normal")} className="min-h-dvh px-5 py-8 sm:px-8 sm:py-10" style={{ fontFamily: inter, background: "linear-gradient(145deg,#f7f7fd 0%,#ffffff 58%,#f1fbfc 100%)" }}>
      <div className="mx-auto max-w-[1120px]">
        <Link href="/google-ads" className="inline-flex items-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={38} height={38} className="h-[38px] w-[38px]" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: C.navy }}>Audit Devrika</span>
        </Link>

        <main className="mt-8 grid overflow-hidden rounded-[28px] border bg-white lg:grid-cols-[0.92fr_1.08fr]" style={{ borderColor: C.border, boxShadow: "0 28px 80px rgba(19,22,58,0.10)" }}>
          <section className="relative overflow-hidden px-7 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14" style={{ background: C.navy }}>
            <div aria-hidden="true" className="absolute -right-28 -top-28 h-72 w-72 rounded-full" style={{ background: "radial-gradient(circle,rgba(10,190,207,0.26),transparent 68%)" }} />
            <div className="relative">
              <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: C.cyan }}>Ultimul pas inainte de analiza</p>
              <h1 className="mt-5 max-w-[480px] text-3xl font-black leading-[1.08] tracking-[-1.2px] text-white sm:text-4xl" style={{ fontFamily: sora }}>
                {notConfigured ? "Conectarea se activeaza in curand" : "Conecteaza contul si vezi performanta fiecarui produs"}
              </h1>
              <p className="mt-5 max-w-[500px] text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>Auditul citeste ultimele 365 de zile si iti arata cu nume si cifre ce produse pierd bani, ce produse merita mai mult trafic si cum s-ar putea redistribui bugetul.</p>

              <div className="mt-9 overflow-hidden rounded-2xl border" style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.07)" }}>
                <div className="border-b px-5 py-4" style={{ borderColor: "rgba(255,255,255,0.12)" }}><p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: "rgba(255,255,255,0.55)" }}>Ce vei vedea in raport</p></div>
                {previewRows.map(([label, value, color], index) => (
                  <div key={label} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b px-5 py-4 last:border-b-0" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                    <span className="text-sm font-extrabold" style={{ color }}>0{index + 1}</span>
                    <div><p className="text-sm font-bold text-white">{label}</p><p className="mt-1 text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{value}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="px-7 py-10 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
            {message && <p className="mb-6 rounded-xl px-4 py-3 text-left text-sm leading-relaxed" style={{ background: C.yellowBg, color: C.yellow }}>{message}{lipsa ? ` (${lipsa})` : ""}</p>}
            {notConfigured ? (
              <>
                <p className="text-base leading-relaxed" style={{ color: C.gray500 }}>Auditul automat este in ultima faza de pregatire. Pana atunci, iti putem analiza manual aceleasi cifre.</p>
                <a href="mailto:hello@devrika.ro?subject=Audit%20Google%20Ads%20Shopping" className="mt-7 inline-flex min-h-14 items-center rounded-xl px-7 text-base font-extrabold text-white" style={{ background: brandGradient }}>Scrie-ne pentru audit</a>
              </>
            ) : (
              <>
                <p className="text-xs font-extrabold uppercase tracking-[0.14em]" style={{ color: C.indigo }}>Conectare securizata prin Google</p>
                <h2 className="mt-3 text-2xl font-black leading-tight tracking-[-0.7px] sm:text-3xl" style={{ fontFamily: sora, color: C.navy }}>Spune-ne ce magazin analizam</h2>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: C.gray500 }}>Dupa ce continui, alegi contul Google Ads si confirmi accesul direct in pagina Google.</p>

                <form action="/api/google-ads/start" method="get" className="mt-7">
                  <label htmlFor="website" className="block text-left text-sm font-bold" style={{ color: C.gray800 }}>Site-ul magazinului</label>
                  <input id="website" name="website" type="url" required placeholder="https://magazinul-tau.ro" className="mt-2 min-h-14 w-full rounded-xl border px-4 text-base outline-none focus:ring-2" style={{ borderColor: C.border, color: C.navy }} />
                  <p className="mt-2 text-left text-xs leading-relaxed" style={{ color: C.gray500 }}>Folosim adresa doar ca sa identificam magazinul in raport. Valoarea medie reala a comenzii vine din conversiile Purchase din Google Ads.</p>
                  <button type="submit" className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl px-7 text-base font-extrabold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none motion-reduce:hover:translate-y-0" style={{ background: brandGradient, boxShadow: "0 12px 30px rgba(71,73,158,0.24)", outlineColor: C.indigo }}>Continua in siguranta cu Google<svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg></button>
                </form>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {["Nu modificam campanii sau bugete", "Nu cerem Gmail sau Drive", "Retragi accesul oricand"].map((assurance) => (
                    <div key={assurance} data-connect-assurance="visible" className="flex items-start gap-2 border-t pt-3 text-xs leading-relaxed" style={{ borderColor: C.border, color: C.gray600 }}><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white" style={{ background: C.green }}><CheckIcon /></span>{assurance}</div>
                  ))}
                </div>

                <details data-oauth-disclosure="progressive" className="group mt-7 border-t pt-5" style={{ borderColor: C.border }}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold" style={{ color: C.indigo }}>Exact ce date citim si ce permite accesul Google<span aria-hidden="true" className="text-lg transition-transform group-open:rotate-45">+</span></summary>
                  <div className="mt-4 space-y-3 text-left text-xs leading-relaxed" style={{ color: C.gray500 }}>
                    <p>{publicOAuthProjection.auditDataReadDisclosure}</p>
                    <p>{projectOAuthClauses("oauth-permission-not-read-only")}</p>
                    <p>{projectOAuthClauses("mutation-none")}</p>
                    <p>Nu cerem acces la Gmail, Drive sau alte servicii. Poti retrage accesul oricand din contul tau Google.</p>
                  </div>
                </details>
              </>
            )}
          </section>
        </main>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs" style={{ color: C.gray500 }}>
          <Link href="/google-ads" className="font-bold hover:underline" style={{ color: C.indigo }}>← Inapoi la pagina auditului</Link>
          <span>Fara card · Fara abonament · Raport PDF salvat</span>
        </div>
      </div>
    </div>
  );
}
