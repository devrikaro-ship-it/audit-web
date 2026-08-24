import Link from "next/link";
import { C, sora, inter } from "@/lib/theme";
import { publicOAuthAttributes, publicOAuthProjection, publicOAuthStatement } from "@/lib/gads-public-oauth-contract";

// Termenii APLICATIEI, pe acelasi host cu home page-ul declarat in consent screen.
// Vezi nota din app/confidentialitate/page.tsx pentru motivul tehnic.

export const metadata = {
  title: "Termeni si conditii — Audit Devrika",
  description: publicOAuthProjection.termsMetadata,
};

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-3 mt-9 text-[19px] font-bold" style={{ fontFamily: sora, color: "#0f172a" }}>{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-3 text-[15px] leading-relaxed" style={{ color: C.gray600 }}>{children}</p>
);

export default function Termeni() {
  return (
    <div {...publicOAuthAttributes("terms")} className="min-h-dvh px-6 py-14" style={{ fontFamily: inter, background: "#fff" }}>
      <span className="sr-only">{publicOAuthProjection.surfaceDisclosure}</span>
      <div className="mx-auto w-full max-w-[720px]">
        <Link href="/google-ads" className="mb-9 flex items-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={32} height={32} className="h-8 w-8" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>

        <h1 className="mb-2 font-extrabold leading-[1.2] tracking-[-0.5px]"
          style={{ fontFamily: sora, fontSize: "clamp(26px,4vw,36px)", color: "#0f172a" }}>
          Termeni si conditii
        </h1>
        <p className="mb-8 text-[14px]" style={{ color: C.gray400 }}>
          Aplicatia <b>Audit Devrika</b> — analiza contului de Google Ads. Ultima actualizare: august 2026.
        </p>

        <H2>Ce este acest serviciu</H2>
        <P>
          Audit Devrika este o aplicatie care analizeaza contul tau de Google Ads si iti arata unde se
          duc banii din campaniile de Shopping: ce produse consuma buget fara sa vanda, ce produse
          nu au fost afisate niciodata si daca masurarea conversiilor e configurata corect.
          Serviciul e oferit gratuit, fara obligatia de a cumpara ceva.
        </P>

        <H2>Ce iti cerem</H2>
        <P>
          Sa ne dai acces la contul tau de Google Ads, prin mecanismul oficial de
          autorizare Google, si sa ne spui aproximativ ce marja de profit ai — din ea calculam
          pragul sub care un produs pierde bani. Nu iti cerem parole, date de card sau documente.
        </P>

        <H2>Ce garantam si ce nu</H2>
        <P>
          Cifrele din raport sunt citite direct din contul tau si le marcam ca atare. Acolo unde
          folosim un reper de piata in loc de o masuratoare — de exemplu diferenta tipica de cost
          pe click intre magazinele cu si fara CSS — scrie explicit <b>ESTIMARE</b>. Nu prezentam
          niciodata o estimare drept fapt masurat.
        </P>
        <P>
          Raportul e o analiza, nu o garantie de rezultat. Deciziile pe care le iei in contul tau
          iti apartin, iar Devrika nu raspunde pentru efectele lor comerciale. Daca masurarea
          conversiilor din contul tau e configurata gresit, o spunem in raport — dar in acel caz
          cifrele de performanta nu pot fi judecate pana nu e reparata.
        </P>

        <H2>Ce nu facem niciodata</H2>
        <P>
          {publicOAuthStatement("application-performs-no-mutations")} Accesul pe care ni-l dai il poti retrage oricand din
          setarile contului tau Google.
        </P>

        <H2>Datele tale</H2>
        <P>
          Modul in care tratam datele e descris pe larg in{" "}
          <Link href="/confidentialitate" style={{ color: C.indigo }}>politica de confidentialitate</Link>.
          Pe scurt: citim doar ce e necesar pentru raport, nu stocam datele contului tau dupa
          generarea lui si nu le dam nimanui.
        </P>

        <H2>Disponibilitate</H2>
        <P>
          Fiind un serviciu gratuit, il oferim &laquo;asa cum este&raquo; si putem sa il oprim sau
          sa il modificam oricand, fara notificare prealabila.
        </P>

        <H2>Contact</H2>
        <P>
          Pentru orice intrebare legata de acesti termeni:{" "}
          <a href="mailto:hello@devrika.ro" style={{ color: C.indigo }}>hello@devrika.ro</a>.
        </P>

        <div className="mt-12 flex gap-5 border-t pt-6 text-[14px]" style={{ borderColor: "#e6ebf4" }}>
          <Link href="/google-ads" style={{ color: C.indigo }}>← Inapoi la aplicatie</Link>
          <Link href="/confidentialitate" style={{ color: C.indigo }}>Politica de confidentialitate</Link>
        </div>
      </div>
    </div>
  );
}
