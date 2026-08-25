import Link from "next/link";
import { C, sora, inter } from "@/lib/theme";
import { publicOAuthAttributes, publicOAuthProjection, publicOAuthStatement } from "@/lib/gads-public-oauth-contract";

// LANG: pending full translation to EN

// Politica de confidentialitate a APLICATIEI (nu a agentiei). Google o cere pe acelasi host
// cu home page-ul declarat in consent screen si linkata DIN home page — cele doua tipare
// clasice de respingere la brand verification.
//
// Continutul trebuie sa spuna concret ce date Google atingem si ce facem cu ele, inclusiv
// conformarea cu "Google API Services User Data Policy" si cerinta Limited Use. O politica
// generala de agentie nu acopera asta si pica verificarea.

export const metadata = {
  title: "Politica de confidentialitate — Audit Devrika",
  description: publicOAuthProjection.privacyMetadata,
};

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-3 mt-9 text-[19px] font-bold" style={{ fontFamily: sora, color: "#0f172a" }}>{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 text-[15px] leading-relaxed" style={{ color: C.gray600 }}>{children}</p>
);

export default function Confidentialitate() {
  return (
    <div {...publicOAuthAttributes("privacy")} className="min-h-dvh px-6 py-14" style={{ fontFamily: inter, background: "#fff" }}>
      <div className="mx-auto w-full max-w-[720px]">
        <Link href="/google-ads" className="mb-9 flex items-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={32} height={32} className="h-8 w-8" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>

        <h1 className="mb-2 font-extrabold leading-[1.2] tracking-[-0.5px]"
          style={{ fontFamily: sora, fontSize: "clamp(26px,4vw,36px)", color: "#0f172a" }}>
          Politica de confidentialitate
        </h1>
        <p className="mb-8 text-[14px]" style={{ color: C.gray400 }}>
          Aplicatia <b>Audit Devrika</b> — analiza contului de Google Ads. Ultima actualizare: august 2026.
        </p>

        <P>
          Aceasta politica descrie cum aplicatia Audit Devrika trateaza datele la care ii dai acces
          atunci cand iti conectezi contul de Google Ads. E scrisa in limbaj obisnuit, pentru ca
          ai dreptul sa intelegi ce se intampla cu datele afacerii tale.
        </P>

        <H2>Cine suntem</H2>
        <P>
          Devrika este o agentie de marketing online din Romania. Aplicatia <b>Audit Devrika</b> descrisa aici ruleaza pe{" "}
          <b>audit.devrika.ro</b> si apartine aceleiasi firme. Ne poti scrie oricand la{" "}
          <a href="mailto:hello@devrika.ro" style={{ color: C.indigo }}>hello@devrika.ro</a>.
        </P>

        <H2>Ce date citim din contul tau Google</H2>
        <P>
          {publicOAuthStatement("oauth-is-not-read-only")}
          Aplicatia citeste urmatoarele date din contul tau de Google Ads:
        </P>
        <ul className="mb-3 flex flex-col gap-2">
          {[
            publicOAuthProjection.auditDataReadDisclosure,
            publicOAuthProjection.applicationReadsData,
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5 text-[15px]" style={{ color: C.gray600 }}>
              <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.indigo }} />
              {t}
            </li>
          ))}
        </ul>
        <P>
          <b>Nu cerem si nu obtinem acces</b> la Gmail, Google Drive, contacte, calendar sau orice
          alt serviciu Google. Nu putem face nicio modificare in contul tau de Google Ads: nu putem
          porni sau opri campanii, nu putem schimba bugete si nu putem cheltui bani.
        </P>

        <H2>Ce facem cu ele</H2>
        <P>
          Le folosim intr-un singur scop: sa generam raportul pe care il vezi pe ecran, folosind
          categoriile de date enumerate mai sus. Analiza se face in momentul in care esti pe site.
        </P>
        <P>
          Your Google authorization remains in a secure cookie for one hour and is not stored with
          the lead. If you request the PDF, we store your name, email, phone number, store website,
          selected account identity, confirmed financial inputs, calculated break-even values, the
          report PDF, and its delivery status. We use this record only to generate, deliver, and
          support the requested audit. You may request its deletion at any time.
        </P>

        <H2>Conformarea cu politicile Google</H2>
        <P>
          Folosirea si transferul catre orice alta aplicatie a informatiilor primite de la Google
          API-uri respecta{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: C.indigo }}>
            Google API Services User Data Policy
          </a>
          , inclusiv cerintele privind <i>Limited Use</i>. Concret: nu folosim datele pentru
          publicitate, nu le vindem, nu le transferam si nu permitem oamenilor sa le citeasca, in
          afara cazurilor strict necesare pentru operarea aplicatiei sau impuse de lege.
        </P>

        <H2>Cu cine le impartim</H2>
        <P>
          We do not sell, rent, or use this data for third-party advertising. When email delivery is
          configured, Resend processes the recipient address, message, and attached PDF solely to
          deliver the report. Infrastructure providers may process data only as required to operate
          the application.
        </P>

        <H2>Cum retragi accesul</H2>
        <P>
          Oricand, dintr-un singur loc si fara sa ne intrebi pe noi: intra la{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: C.indigo }}>
            myaccount.google.com/permissions
          </a>
          , gaseste <b>Audit Devrika</b> in lista si apasa &laquo;Remove access&raquo;. Din acel moment
          aplicatia nu mai poate citi nimic din contul tau.
        </P>

        <H2>Drepturile tale</H2>
        <P>
          Conform GDPR, ai dreptul sa ceri o copie a datelor pe care le detinem despre tine,
          rectificarea sau stergerea lor, si sa te opui prelucrarii. Scrie-ne la{" "}
          <a href="mailto:hello@devrika.ro" style={{ color: C.indigo }}>hello@devrika.ro</a> si
          raspundem in cel mult 30 de zile.
        </P>

        <H2>Modificari</H2>
        <P>
          Daca schimbam ceva important in modul in care tratam datele, actualizam aceasta pagina si
          data de la inceputul ei.
        </P>

        <div className="mt-12 flex gap-5 border-t pt-6 text-[14px]" style={{ borderColor: "#e6ebf4" }}>
          <Link href="/google-ads" style={{ color: C.indigo }}>← Inapoi la aplicatie</Link>
          <Link href="/termeni" style={{ color: C.indigo }}>Termeni si conditii</Link>
        </div>
      </div>
    </div>
  );
}
