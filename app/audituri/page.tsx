import Link from "next/link";
import "../dvk.css";

// Romanian home page of audit.devrika.ro (operator, 2026-09-23): the three audits, only the website audit open,
// with its own link to the website-audit landing. The English /hub on .io stays the page declared to Google.
export const metadata = {
  title: "Audituri gratuite pentru magazine online — Devrika",
  description: "Alege ce vrei sa analizam: site-ul magazinului (disponibil acum), Google Ads sau Meta Ads (in curand).",
};

type Audit = { href?: string; eticheta: string; titlu: string; text: string; date: string; icon: React.ReactNode };

const audituri: Audit[] = [
  {
    href: "/audit-seo",
    eticheta: "Disponibil",
    titlu: "Audit site",
    text: "Pornind doar de la adresa magazinului, iti aratam unde pierzi cumparatori: cum iti gaseste Google paginile si cat de usor cumpara un vizitator, verificat pe categoriile si produsele tale.",
    date: "Fara acces la conturi — analizeaza doar paginile publice ale site-ului.",
    icon: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  },
  {
    eticheta: "In curand",
    titlu: "Audit Google Ads",
    text: "Conectezi contul Google Ads si vezi, pe datele tale reale, ce produse consuma buget fara sa vanda si cum merg campaniile, masurarea si cautarile.",
    date: "Se conecteaza la contul tau Google Ads.",
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
  },
  {
    eticheta: "In curand",
    titlu: "Audit Meta Ads",
    text: "Aceeasi analiza pentru campaniile de pe Facebook si Instagram: ce reclame consuma buget fara sa aduca vanzari si cat de reale sunt cifrele raportate de platforma.",
    date: "Se conecteaza la contul tau de reclame Meta.",
    icon: <><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></>,
  },
];

function AuditCard({ a, feature }: { a: Audit; feature: boolean }) {
  const inner = (
    <>
      <div className="row">
        <span className="ic">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{a.icon}</svg>
        </span>
        <span className="st">{a.eticheta}</span>
      </div>
      <h3>{a.titlu}</h3>
      <p>{a.text}</p>
      <span className="data">{a.date}</span>
      {a.href && <span className="go">Incepe auditul →</span>}
    </>
  );
  return a.href
    ? <Link href={a.href} className={`a-card${feature ? " feature" : ""}`}>{inner}</Link>
    : <div className="a-card soon">{inner}</div>;
}

export default function Audituri() {
  return (
    <div className="dvk">
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/devrika-logo.svg" alt="Devrika" width={142} height={34} />
            <span>Audit Devrika</span>
          </Link>
          <nav className="nav" aria-label="Pagina">
            <a href="#audituri">Ce poti analiza</a>
            <Link href="/audit-seo">Audit site</Link>
          </nav>
          <div className="right"><Link className="btn-indigo" href="/audit-seo">Scaneaza magazinul →</Link></div>
        </div>
      </header>

      <section className="hero">
        <div className="wrap">
          <div className="eyebrow on-dark">Audituri gratuite pentru magazine online</div>
          <h1>Audit <em>Devrika</em></h1>
          <p className="lead">Afla unde pierde clienti si bani magazinul tau online, pe cifrele magazinului tau.</p>
          <p className="sub">Alegi ce vrei sa analizam. Auditul de site porneste doar de la adresa magazinului, fara acces la conturi, si iti arata rezultatul in cateva minute.</p>
          <div className="badges">{["Gratuit", "Fara card", "Fara acces la conturi", "Rezultat in cateva minute"].map((t) => <span key={t}>{t}</span>)}</div>
        </div>
      </section>

      <section className="audits" id="audituri">
        <div className="wrap">
          <div className="head">
            <div className="eyebrow">Audituri</div>
            <h2>Ce poti analiza</h2>
            <p>Fiecare audit iti spune de ce date are nevoie inainte sa incepi.</p>
          </div>
          <div className="a-grid">
            {audituri.map((a, i) => <AuditCard key={a.titlu} a={a} feature={i === 0} />)}
          </div>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span className="name">Audit Devrika</span>
          <span><Link href="/confidentialitate">Confidentialitate</Link> · <Link href="/termeni">Termeni</Link></span>
          <span>© {new Date().getFullYear()} Devrika Agency · <a href="https://devrika.ro">devrika.ro</a></span>
        </div>
      </footer>
    </div>
  );
}
