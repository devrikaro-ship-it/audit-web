import Link from "next/link";
import { C, sora, inter, brandGradient } from "@/lib/theme";
import { GADS_LOCALIZED_COPY } from "@/lib/gads-localized-copy";
import { AUDIT_WINDOW_LABEL } from "@/lib/gads-intake";

// Pagina-umbrela: "Audit Devrika" = locul din care pleaca TOATE auditurile.
// Serveste la radacina audit.devrika.ro (vezi rewrite-ul din next.config.ts) si e pagina
// declarata ca home page al aplicatiei in ecranul de consimtamant Google. De aceea spune
// raspicat, sus, cine e aplicatia, ce face si ce date atinge — asta verifica reviewerul.

export const metadata = {
  title: "Audit Devrika — audit gratuit pentru magazine online",
  description:
    "Audit Devrika analizeaza magazinul si conturile tale de publicitate si iti arata unde "
    + "pierzi bani: pe site, in Google Ads si in campaniile de Shopping.",
};

const audituri = [
  {
    href: "/google-ads",
    eticheta: "Disponibil",
    titlu: "Audit Google Ads",
    text:
      `Iti conectezi contul de Google Ads si vezi pe cifrele tale reale din ultimele ${AUDIT_WINDOW_LABEL} `
      + "ce produse consuma buget fara sa vanda, cate produse nu au fost afisate niciodata si "
      + "daca masurarea conversiilor e configurata corect.",
    date: "Se conecteaza la contul tau de Google Ads, doar cu drept de citire.",
    activ: true,
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
  },
  {
    href: "/audit-seo",
    eticheta: "Disponibil",
    titlu: "Audit magazin online",
    text:
      "Pornind doar de la adresa magazinului, iti aratam unde pierzi cumparatori: masurarea "
      + "vanzarilor, vizibilitatea in Google, experienta de cumparare si felul in care arati "
      + "in Google Shopping.",
    date: "Nu cere acces la niciun cont — analizeaza doar ce e public pe site.",
    activ: true,
    icon: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  },
  {
    eticheta: "In pregatire",
    titlu: "Audit Meta Ads",
    text:
      "Aceeasi analiza pentru campaniile de Facebook si Instagram: ce reclame consuma buget "
      + "fara sa aduca vanzari si cat de credibile sunt cifrele raportate de platforma.",
    date: "Va cere acces de citire la contul tau de reclame Meta.",
    activ: false,
    icon: <><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></>,
  },
];

export default function Hub() {
  return (
    <div className="overflow-x-hidden" style={{ fontFamily: inter }}>

      <nav className="fixed top-0 left-0 right-0 z-50 border-b px-8"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(12px)", borderColor: "rgba(71,73,158,0.08)" }}>
        <div className="mx-auto flex h-16 max-w-[1100px] items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-devrika.png" alt="Audit Devrika" width={36} height={36} className="h-9 w-9" />
            <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Audit Devrika</span>
          </Link>
          <a href="https://devrika.ro" className="text-sm font-semibold" style={{ color: C.indigo }}>devrika.ro →</a>
        </div>
      </nav>

      {/* HERO — cine e aplicatia si ce face, in primele randuri */}
      <section className="relative overflow-hidden px-8 pb-16 pt-36 text-center"
        style={{ background: "linear-gradient(180deg,#f8f7ff 0%,#fff 100%)" }}>
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[-200px] h-[800px] w-[800px] -translate-x-1/2 rounded-full"
          style={{ background: "radial-gradient(circle,rgba(71,73,158,0.08) 0%,transparent 70%)" }} />

        <h1 className="mx-auto mb-6 max-w-[820px] font-black leading-[1.06] tracking-[-2px]"
          style={{ fontFamily: sora, fontSize: "clamp(34px,5.5vw,60px)", color: "#0f172a" }}>
          Audit{" "}
          <em className="not-italic" style={{
            background: brandGradient, WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>Devrika</em>
        </h1>

        <p className="mx-auto mb-5 max-w-[680px] text-xl leading-relaxed" style={{ color: "#334155" }}>
          O aplicatie web care analizeaza magazinul si conturile tale de publicitate si iti arata,
          pe cifre, unde pierzi bani.
        </p>
        <p className="mx-auto mb-10 max-w-[660px] text-[16.5px] leading-relaxed" style={{ color: C.gray500 }}>
          Alegi ce vrei analizat, iar acolo unde e nevoie iti conectezi contul de publicitate — cu
          drept <b>exclusiv de citire</b>. Aplicatia citeste datele, le compara cu pragurile
          afacerii tale si iti arata rezultatul pe loc. <b>Nu modifica nimic</b> in conturile tale
          si poti retrage accesul oricand.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px]" style={{ color: C.gray500 }}>
          {["Gratuit", "Fara card bancar", "Acces doar de citire", "Rezultat pe loc"].map((t) => (
            <span key={t} className="rounded-full border px-3.5 py-1.5" style={{ borderColor: "#e2e8f0", background: "#fff" }}>{t}</span>
          ))}
        </div>
      </section>

      {/* AUDITURILE */}
      <section className="bg-white px-8 pb-24 pt-4">
        <h2 className="mb-3 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontFamily: sora, fontSize: "clamp(25px,3.5vw,36px)", color: "#0f172a" }}>
          Ce poti analiza
        </h2>
        <p className="mx-auto mb-12 max-w-[560px] text-center text-base leading-relaxed" style={{ color: C.gray500 }}>
          Fiecare audit spune de ce date are nevoie inainte sa il pornesti.
        </p>

        <div className="mx-auto flex max-w-[900px] flex-col gap-4">
          {audituri.map((a) => {
            const inner = (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: a.activ ? "#eef0ff" : "#f1f5f9" }}>
                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none"
                      stroke={a.activ ? C.indigo : C.gray400} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {a.icon}
                    </svg>
                  </div>
                  <h3 className="text-[19px] font-bold" style={{ fontFamily: sora, color: a.activ ? "#0f172a" : C.gray500 }}>{a.titlu}</h3>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide"
                    style={{ background: a.activ ? C.greenBg : "#f1f5f9", color: a.activ ? C.green : C.gray500 }}>
                    {a.eticheta}
                  </span>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed" style={{ color: C.gray600 }}>{a.text}</p>
                <p className="mt-2.5 text-[13.5px]" style={{ color: C.gray400 }}>{a.date}</p>
                {a.activ && (
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[15px] font-bold" style={{ color: C.indigo }}>
                    Incepe auditul
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </span>
                )}
              </>
            );
            return a.activ && a.href ? (
              <Link key={a.titlu} href={a.href}
                className="block rounded-2xl border bg-white p-6 no-underline transition-colors hover:border-[#47499E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ borderColor: "#e2e8f0", outlineColor: C.indigo }}>
                {inner}
              </Link>
            ) : (
              <div key={a.titlu} className="rounded-2xl border p-6" style={{ borderColor: "#eef1f7", background: "#fafbff" }}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* CUM TRATAM DATELE */}
      <section className="px-8 py-20" style={{ background: "linear-gradient(180deg,#fff 0%,#f8f7ff 100%)" }}>
        <div className="mx-auto max-w-[720px]">
          <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
            style={{ fontFamily: sora, fontSize: "clamp(24px,3.5vw,34px)", color: "#0f172a" }}>
            Ce facem cu datele tale
          </h2>
          <p className="mb-8 text-center text-[15.5px] leading-relaxed" style={{ color: C.gray500 }}>
            Cand un audit are nevoie de acces la un cont de publicitate, ti-l cerem prin
            mecanismul oficial al platformei si numai pentru citire.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { t: "Citim doar ce e necesar", d: "Pentru Google Ads: campaniile de Shopping si configurarea conversiilor. Nimic din Gmail, Drive sau alte servicii." },
              { t: "Nu modificam nimic", d: "Accesul e exclusiv de citire. Nu putem porni sau opri campanii si nu putem cheltui bani." },
              { t: GADS_LOCALIZED_COPY.accountDataRetention, d: "Analiza se face cat esti pe site. Dupa raport, datele contului nu raman la noi." },
              { t: "Retragi accesul cand vrei", d: "Dintr-un click, din setarile contului tau — fara sa ne intrebi pe noi." },
            ].map((r) => (
              <div key={r.t} className="rounded-2xl border bg-white p-5" style={{ borderColor: "#e6ebf4" }}>
                <p className="mb-1.5 text-[15px] font-bold" style={{ fontFamily: sora, color: "#1e293b" }}>{r.t}</p>
                <p className="text-[13.5px] leading-relaxed" style={{ color: C.gray500 }}>{r.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-7 text-center text-[14px]" style={{ color: C.gray500 }}>
            Detaliile complete:{" "}
            <Link href="/confidentialitate" style={{ color: C.indigo }}>politica de confidentialitate</Link>
            {" · "}
            <Link href="/termeni" style={{ color: C.indigo }}>termeni si conditii</Link>
          </p>
        </div>
      </section>

      <footer className="px-8 py-10 text-center" style={{ background: "#0f172a" }}>
        <div className="mb-4 flex items-center justify-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Audit Devrika" width={30} height={30} className="h-[30px] w-[30px]" />
          <span className="text-base font-extrabold text-white">Audit Devrika</span>
        </div>
        <p className="mb-2 text-[13px]" style={{ color: "#475569" }}>
          <Link href="/confidentialitate" style={{ color: C.cyan }}>Politica de confidentialitate</Link>
          {" · "}
          <Link href="/termeni" style={{ color: C.cyan }}>Termeni si conditii</Link>
        </p>
        <p className="text-[13px]" style={{ color: "#475569" }}>
          © {new Date().getFullYear()} Devrika · <a href="https://devrika.ro" style={{ color: C.cyan }}>devrika.ro</a>
        </p>
      </footer>
    </div>
  );
}
