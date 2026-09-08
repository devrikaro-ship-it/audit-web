import Link from "next/link";
import { C, sora, inter, brandGradient } from "@/lib/theme";
import { GADS_LOCALIZED_COPY } from "@/lib/gads-localized-copy";
import { AUDIT_WINDOW_LABEL } from "@/lib/gads-intake";
import { publicOAuthAttributes, publicOAuthProjection, publicOAuthStatement } from "@/lib/gads-public-oauth-contract";

// The Audit Devrika hub is the starting point for every audit.
// It is the application's declared home page in Google's consent screen, so its opening
// copy states who operates the application, what it does, and which data it accesses.

export const metadata = {
  title: "Audit Devrika — free audits for online stores",
  description: publicOAuthProjection.hubMetadata,
};

const audituri = [
  {
    href: "/google-ads",
    eticheta: "Available",
    titlu: "Audit Google Ads",
    text:
      `Connect your Google Ads account and use your real data from the last ${AUDIT_WINDOW_LABEL} to see `
      + "which products spend budget without selling and how your campaigns, tracking, and searches perform.",
    date: "Connects to your Google Ads account.",
    activ: true,
    icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
  },
  {
    href: "/audit-seo",
    eticheta: "Available",
    titlu: "Online store audit",
    text:
      "Starting only from your store address, we show where you lose buyers: sales tracking, "
      + "Google visibility, the shopping experience, and how your products appear in Google Shopping.",
    date: "Requires no account access — it analyzes only public website content.",
    activ: true,
    icon: <><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></>,
  },
  {
    eticheta: "Coming soon",
    titlu: "Audit Meta Ads",
    text:
      "The same analysis for Facebook and Instagram campaigns: which ads spend budget without "
      + "generating sales and how reliable the platform's reported figures are.",
    date: "Connects to your Meta advertising account.",
    activ: false,
    icon: <><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></>,
  },
];

export default function Hub() {
  return (
    <div {...publicOAuthAttributes("hub")} className="overflow-x-hidden" style={{ fontFamily: inter }}>

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

      {/* The opening copy identifies the application and its purpose. */}
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
          A web application that analyzes your store and advertising accounts and shows, using
          your numbers, where you are losing money.
        </p>
        <p className="mx-auto mb-10 max-w-[660px] text-[16.5px] leading-relaxed" style={{ color: C.gray500 }}>
          Choose what you want analyzed and connect an advertising account only when the audit needs it. {publicOAuthStatement("application-performs-no-mutations")} You can revoke access at any time.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2.5 text-[13px]" style={{ color: C.gray500 }}>
          {["Free", "No payment card", publicOAuthProjection.noChangesBadge, "Immediate result"].map((t) => (
            <span key={t} className="rounded-full border px-3.5 py-1.5" style={{ borderColor: "#e2e8f0", background: "#fff" }}>{t}</span>
          ))}
        </div>
      </section>

      {/* Available audits */}
      <section className="bg-white px-8 pb-24 pt-4">
        <h2 className="mb-3 text-center font-extrabold leading-[1.15] tracking-[-1px]"
          style={{ fontFamily: sora, fontSize: "clamp(25px,3.5vw,36px)", color: "#0f172a" }}>
          What you can analyze
        </h2>
        <p className="mx-auto mb-12 max-w-[560px] text-center text-base leading-relaxed" style={{ color: C.gray500 }}>
          Each audit tells you which data it needs before you start.
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
                    Start the audit
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

      {/* How we handle data */}
      <section className="px-8 py-20" style={{ background: "linear-gradient(180deg,#fff 0%,#f8f7ff 100%)" }}>
        <div className="mx-auto max-w-[720px]">
          <h2 className="mb-4 text-center font-extrabold leading-[1.15] tracking-[-1px]"
            style={{ fontFamily: sora, fontSize: "clamp(24px,3.5vw,34px)", color: "#0f172a" }}>
            How we handle your data
          </h2>
          <p className="mb-8 text-center text-[15.5px] leading-relaxed" style={{ color: C.gray500 }}>
            {publicOAuthProjection.officialAccessMechanism}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { t: "We read only what is needed", d: `${publicOAuthProjection.auditDataReadDisclosure} Nothing from Gmail, Drive, or other services.` },
              { t: publicOAuthProjection.noChangesBadge, d: publicOAuthProjection.noCampaignMutations },
              { t: GADS_LOCALIZED_COPY.accountDataRetention, d: "Your signed Google authorization expires after one hour and is not stored with your contact record. Requested PDFs and delivery context are retained so we can deliver and support them." },
              { t: "Revoke access whenever you want", d: "Use your Google account settings at any time; you do not need to contact us first." },
            ].map((r) => (
              <div key={r.t} className="rounded-2xl border bg-white p-5" style={{ borderColor: "#e6ebf4" }}>
                <p className="mb-1.5 text-[15px] font-bold" style={{ fontFamily: sora, color: "#1e293b" }}>{r.t}</p>
                <p className="text-[13.5px] leading-relaxed" style={{ color: C.gray500 }}>{r.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-7 text-center text-[14px]" style={{ color: C.gray500 }}>
            Full details:{" "}
            <Link href="/confidentialitate" style={{ color: C.indigo }}>privacy policy</Link>
            {" · "}
            <Link href="/termeni" style={{ color: C.indigo }}>terms and conditions</Link>
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
          <Link href="/confidentialitate" style={{ color: C.cyan }}>Privacy Policy</Link>
          {" · "}
          <Link href="/termeni" style={{ color: C.cyan }}>Terms and Conditions</Link>
        </p>
        <p className="text-[13px]" style={{ color: "#475569" }}>
          © {new Date().getFullYear()} Devrika · <a href="https://devrika.ro" style={{ color: C.cyan }}>devrika.ro</a>
        </p>
      </footer>
    </div>
  );
}
