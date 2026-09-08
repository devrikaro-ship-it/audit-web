import Link from "next/link";
import { C, sora, inter } from "@/lib/theme";
import { publicOAuthAttributes, publicOAuthProjection, publicOAuthStatement } from "@/lib/gads-public-oauth-contract";

// Application terms published on the same host as the home page declared in Google's consent screen.

export const metadata = {
  title: "Terms and Conditions — Audit Devrika",
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
      <div className="mx-auto w-full max-w-[720px]">
        <Link href="/google-ads" className="mb-9 flex items-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-devrika.png" alt="Devrika" width={32} height={32} className="h-8 w-8" />
          <span className="text-base font-extrabold tracking-[-0.3px]" style={{ color: "#1e1b4b" }}>Devrika</span>
        </Link>

        <h1 className="mb-2 font-extrabold leading-[1.2] tracking-[-0.5px]"
          style={{ fontFamily: sora, fontSize: "clamp(26px,4vw,36px)", color: "#0f172a" }}>
          Terms and Conditions
        </h1>
        <p className="mb-8 text-[14px]" style={{ color: C.gray400 }}>
          The <b>Audit Devrika</b> application — Google Ads account analysis. Last updated: August 2026.
        </p>

        <H2>What this service is</H2>
        <P>
          Audit Devrika analyzes your Google Ads account and shows where Shopping campaign money goes:
          which products spend budget without selling, which products have never been shown, and
          whether conversion tracking is configured correctly. The service is free and creates no
          obligation to purchase anything.
        </P>

        <H2>What we ask from you</H2>
        <P>
          Authorize access to your Google Ads account through Google's official authorization
          mechanism and provide an approximate profit margin so we can calculate the threshold below
          which a product loses money. We do not ask for passwords, payment-card details, or documents.
        </P>

        <H2>What we guarantee and what we do not</H2>
        <P>
          Report figures read directly from your account are marked as measured. When we use a market
          benchmark instead of a measurement—for example, the typical cost-per-click difference
          between stores with and without a CSS partner—we label it <b>ESTIMATE</b>. We never present
          an estimate as a measured fact.
        </P>
        <P>
          The report is an analysis, not a guarantee of results. Decisions you make in your account
          remain yours, and Devrika is not responsible for their commercial effects. If conversion
          tracking is configured incorrectly, the report says so; performance figures cannot be
          judged reliably until tracking is repaired.
        </P>

        <H2>What we never do</H2>
        <P>
          {publicOAuthStatement("application-performs-no-mutations")} You can revoke the access you grant at any time from your Google account settings.
        </P>

        <H2>Your data</H2>
        <P>
          Our handling of your data is described in the{" "}
          <Link href="/confidentialitate" style={{ color: C.indigo }}>Privacy Policy</Link>.
          In short, we read only what is needed for the audit. If you request the PDF, we store the
          report, your contact details, the store and selected-account context, the confirmed
          financial inputs, and delivery status so the report can be delivered and supported.
        </P>

        <H2>Optional monthly campaign reports</H2>
        <P>
          If optional monthly report delivery becomes available, it will require a separate request.
          The email address you provide for an audit is used to deliver and support that requested
          audit only. We do not enroll you automatically in monthly reports, newsletters, general
          promotional messages, or third-party advertising.
        </P>

        <H2>Availability</H2>
        <P>
          This free service is provided &ldquo;as is.&rdquo; We may modify or discontinue it without prior notice.
        </P>

        <H2>Contact</H2>
        <P>
          For questions about these terms, contact{" "}
          <a href="mailto:hello@devrika.ro" style={{ color: C.indigo }}>hello@devrika.ro</a>.
        </P>

        <div className="mt-12 flex gap-5 border-t pt-6 text-[14px]" style={{ borderColor: "#e6ebf4" }}>
          <Link href="/google-ads" style={{ color: C.indigo }}>← Back to the application</Link>
          <Link href="/confidentialitate" style={{ color: C.indigo }}>Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}
