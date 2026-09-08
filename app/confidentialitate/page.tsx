import Link from "next/link";
import { C, sora, inter } from "@/lib/theme";
import { publicOAuthAttributes, publicOAuthProjection, publicOAuthStatement } from "@/lib/gads-public-oauth-contract";

// This application policy is published on the same host as the home page declared in
// Google's consent screen and is linked from that home page for brand verification.
// It discloses the exact Google data used and the Limited Use protections that apply.

export const metadata = {
  title: "Privacy Policy — Audit Devrika",
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
          Privacy Policy
        </h1>
        <p className="mb-8 text-[14px]" style={{ color: C.gray400 }}>
          The <b>Audit Devrika</b> application — Google Ads account analysis. Last updated: August 2026.
        </p>

        <P>
          This policy explains how the Audit Devrika application handles data you authorize it to
          access when you connect your Google Ads account. It uses plain language so you can
          understand what happens to your business data.
        </P>

        <H2>Who we are</H2>
        <P>
          Devrika is a Romanian online marketing agency. The <b>Audit Devrika</b> application described
          here runs on <b>audit.devrika.io</b> and is operated by the same company. You can contact us at{" "}
          <a href="mailto:hello@devrika.ro" style={{ color: C.indigo }}>hello@devrika.ro</a>.
        </P>

        <H2>What data we read from your Google account</H2>
        <P>
          {publicOAuthStatement("oauth-is-not-read-only")}
          {" "}The application reads the following data from your Google Ads account:
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
          <b>We do not request or obtain access</b> to Gmail, Google Drive, contacts, calendars, or any
          other Google service. {publicOAuthProjection.noCampaignMutations}
        </P>

        <H2>What we do with the data</H2>
        <P>
          We use these categories to generate the report you see on screen. The analysis runs when
          you request it on the site.
        </P>
        <P>
          Your Google authorization remains in a secure cookie for one hour and is not stored with
          the lead. If you request the PDF, we store your name, email, phone number, store website,
          selected account identity, confirmed financial inputs, calculated break-even values, the
          report PDF, and its delivery status. We use this record only to generate, deliver, and
          support the requested audit. If optional monthly report delivery becomes available and you
          request it separately, the same limited purpose applies. We do not use this agreement for
          newsletters or general promotional messages. You may request deletion at any time.
        </P>

        <H2>How we protect Google user data</H2>
        <P>
          We use HTTPS to encrypt data in transit between your browser, our application, and Google.
          Your Google authorization is held in a signed session cookie that expires after one hour.
          In production, the cookie is sent only over HTTPS, cannot be read by page JavaScript,
          and uses SameSite protection to limit cross-site requests.
        </P>
        <P>
          Google API requests and application secrets are handled on the server. We do not store
          your Google authorization token with your contact record. Pending reports are stored
          in private server directories, and report snapshot files have restricted filesystem
          permissions. We verify signed report snapshots before using them and check that saved
          reports belong to the portal link used to open them.
        </P>
        <P>
          Access to Google user data is limited to providing and supporting the requested audit
          and report delivery, as described in this policy. You can revoke Google access or
          request deletion using the instructions below.
        </P>

        <H2>Compliance with Google policies</H2>
        <P>
          Our use and transfer to any other application of information received from Google APIs complies with the{" "}
          <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: C.indigo }}>
            Google API Services User Data Policy
          </a>
          , including its <i>Limited Use</i> requirements. We do not use the data for advertising,
          sell it, transfer it, or allow people to read it except where strictly necessary to operate
          the application or comply with law.
        </P>

        <H2>Who we share data with</H2>
        <P>
          We do not sell, rent, or use this data for third-party advertising. When email delivery is
          configured, Resend processes the recipient address, message, and attached PDF solely to
          deliver the report. Infrastructure providers may process data only as required to operate
          the application.
        </P>

        <H2>How to revoke access</H2>
        <P>
          You can revoke access at any time without contacting us. Open{" "}
          <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: C.indigo }}>
            myaccount.google.com/permissions
          </a>
          , find <b>Audit Devrika</b>{" "}in the list, and select &ldquo;Remove access.&rdquo; The application
          can no longer read your account after access is removed.
        </P>

        <H2>Your rights</H2>
        <P>
          Under the GDPR, you may request a copy of the personal data we hold about you, request its
          correction or deletion, and object to processing. Email{" "}
          <a href="mailto:hello@devrika.ro" style={{ color: C.indigo }}>hello@devrika.ro</a>; we will
          respond within 30 days.
        </P>

        <H2>Changes to this policy</H2>
        <P>
          If we materially change how we handle data, we will update this page and the date shown above.
        </P>

        <div className="mt-12 flex gap-5 border-t pt-6 text-[14px]" style={{ borderColor: "#e6ebf4" }}>
          <Link href="/google-ads" style={{ color: C.indigo }}>← Back to the application</Link>
          <Link href="/termeni" style={{ color: C.indigo }}>Terms and Conditions</Link>
        </div>
      </div>
    </div>
  );
}
