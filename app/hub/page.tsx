import Link from "next/link";
import "../dvk.css";
import { GADS_LOCALIZED_COPY } from "@/lib/gads-localized-copy";
import { AUDIT_WINDOW_LABEL_ENGLISH as AUDIT_WINDOW_LABEL } from "@/lib/gads-intake";
import { publicOAuthAttributes, publicOAuthProjection, publicOAuthStatement } from "@/lib/gads-public-oauth-contract";

// The Audit Devrika hub is the starting point for every audit.
// It is the application's declared home page in Google's consent screen, so its opening
// copy states who operates the application, what it does, and which data it accesses.

export const metadata = {
  title: "Audit Devrika — free audits for online stores",
  description: publicOAuthProjection.hubMetadata,
};

type Audit = { href?: string; eticheta: string; titlu: string; text: string; date: string; icon: React.ReactNode };

// Only the website audit is open for now (operator, 2026-09-23); the Google Ads and Meta Ads audits are shown as
// coming soon. The /google-ads route itself stays reachable.
const audituri: Audit[] = [
  {
    href: "/audit-seo",
    eticheta: "Available",
    titlu: "Online store audit",
    text:
      "Starting only from your store address, we show where you lose buyers: how Google finds your "
      + "pages and how easily a visitor can buy, checked on the category and product pages.",
    date: "Requires no account access — it analyzes only public website content.",
    icon: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  },
  {
    eticheta: "Coming soon",
    titlu: "Audit Google Ads",
    text:
      `Connect your Google Ads account and use your real data from the last ${AUDIT_WINDOW_LABEL} to see `
      + "which products spend budget without selling and how your campaigns, tracking, and searches perform.",
    date: "Connects to your Google Ads account.",
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
  },
  {
    eticheta: "Coming soon",
    titlu: "Audit Meta Ads",
    text:
      "The same analysis for Facebook and Instagram campaigns: which ads spend budget without "
      + "generating sales and how reliable the platform's reported figures are.",
    date: "Connects to your Meta advertising account.",
    icon: <><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></>,
  },
];

const dataCards = [
  { t: "We read only what is needed", d: `${publicOAuthProjection.auditDataReadDisclosure} Nothing from Gmail, Drive, or other services.` },
  { t: publicOAuthProjection.noChangesBadge, d: publicOAuthProjection.noCampaignMutations },
  { t: GADS_LOCALIZED_COPY.accountDataRetention, d: "Your signed Google authorization expires after one hour and is not stored with your contact record. Requested PDFs and delivery context are retained so we can deliver and support them." },
  { t: "Revoke access whenever you want", d: "Use your Google account settings at any time; you do not need to contact us first." },
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
      {a.href && <span className="go">Start the audit →</span>}
    </>
  );
  return a.href
    ? <Link href={a.href} className={`a-card${feature ? " feature" : ""}`}>{inner}</Link>
    : <div className="a-card soon">{inner}</div>;
}

export default function Hub() {
  return (
    <div {...publicOAuthAttributes("hub")} className="dvk">
      <header className="top">
        <div className="wrap">
          <Link href="/" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/devrika-logo.svg" alt="Devrika" width={142} height={34} />
            <span>Audit Devrika</span>
          </Link>
          <nav className="nav" aria-label="Page">
            <a href="#audits">What you can analyze</a>
            <a href="#data">How we handle your data</a>
          </nav>
          <div className="right"><a className="btn-indigo" href="https://devrika.ro">devrika.ro →</a></div>
        </div>
      </header>

      {/* The opening copy identifies the application and its purpose. */}
      <section className="hero">
        <div className="wrap">
          <div className="eyebrow on-dark">Free audits for online stores</div>
          <h1>Audit <em>Devrika</em></h1>
          <p className="lead">
            A web application that analyzes your store and advertising accounts and shows, using
            your numbers, where you are losing money.
          </p>
          <p className="sub">
            Choose what you want analyzed and connect an advertising account only when the audit needs it. {publicOAuthStatement("application-performs-no-mutations")} You can revoke access at any time.
          </p>
          <div className="badges">
            {["Free", "No payment card", publicOAuthProjection.noChangesBadge, "Immediate result"].map((t) => <span key={t}>{t}</span>)}
          </div>
        </div>
      </section>

      <section className="audits" id="audits">
        <div className="wrap">
          <div className="head">
            <div className="eyebrow">Audits</div>
            <h2>What you can analyze</h2>
            <p>Each audit tells you which data it needs before you start.</p>
          </div>
          <div className="a-grid">
            {audituri.map((a, i) => <AuditCard key={a.titlu} a={a} feature={i === 0} />)}
          </div>
        </div>
      </section>

      <section className="data-sec" id="data">
        <div className="wrap">
          <div className="head">
            <div className="eyebrow">Your data</div>
            <h2>How we handle your data</h2>
            <p>{publicOAuthProjection.officialAccessMechanism}</p>
          </div>
          <div className="d-grid">
            {dataCards.map((r) => <div key={r.t} className="d-card"><b>{r.t}</b><span>{r.d}</span></div>)}
          </div>
          <p className="links">
            Full details: <Link href="/confidentialitate">privacy policy</Link> · <Link href="/termeni">terms and conditions</Link>
          </p>
        </div>
      </section>

      <footer>
        <div className="wrap">
          <span className="name">Audit Devrika</span>
          <span><Link href="/confidentialitate">Privacy Policy</Link> · <Link href="/termeni">Terms and Conditions</Link></span>
          <span>© {new Date().getFullYear()} Devrika · <a href="https://devrika.ro">devrika.ro</a></span>
        </div>
      </footer>
    </div>
  );
}
