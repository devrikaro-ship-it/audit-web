import { publicOAuthProjection } from "@/shared/public-contract/oauth-contract";
import { isValidElement, type ReactElement } from "react";
import { PrivacyView } from "@/modules/public/view/privacy";


export function loadPrivacy() {
  return {  };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type PrivacyProps = Exclude<ReturnType<typeof loadPrivacy>, ReactElement>;

export function showPrivacy() {
  const loaded = loadPrivacy();
  return isValidElement(loaded) ? loaded : <PrivacyView {...(loaded as PrivacyProps)} />;
}

export const metadata = {
  title: "Privacy Policy — Audit Devrika",
  description: publicOAuthProjection.privacyMetadata,
};
