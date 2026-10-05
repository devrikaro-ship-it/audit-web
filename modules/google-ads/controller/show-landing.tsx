import { publicOAuthProjection } from "@/shared/public-contract/oauth-contract";
import { AUDIT_WINDOW_LABEL_ENGLISH as AUDIT_WINDOW_LABEL } from "@/shared/public-contract/audit-window";
import { isValidElement, type ReactElement } from "react";
import { LandingView } from "@/modules/google-ads/view/landing";


export function loadLanding() {
  return {  };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type LandingProps = Exclude<ReturnType<typeof loadLanding>, ReactElement>;

export function showLanding() {
  const loaded = loadLanding();
  return isValidElement(loaded) ? loaded : <LandingView {...(loaded as LandingProps)} />;
}

export const metadata = {
  title: "Free Google Ads audit — Devrika",
  description: publicOAuthProjection.landingMetadata(AUDIT_WINDOW_LABEL),
};
