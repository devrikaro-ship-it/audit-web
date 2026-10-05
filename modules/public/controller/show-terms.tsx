import { publicOAuthProjection } from "@/shared/public-contract/oauth-contract";
import { isValidElement, type ReactElement } from "react";
import { TermsView } from "@/modules/public/view/terms";


export function loadTerms() {
  return {  };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type TermsProps = Exclude<ReturnType<typeof loadTerms>, ReactElement>;

export function showTerms() {
  const loaded = loadTerms();
  return isValidElement(loaded) ? loaded : <TermsView {...(loaded as TermsProps)} />;
}

export const metadata = {
  title: "Terms and Conditions — Audit Devrika",
  description: publicOAuthProjection.termsMetadata,
};
