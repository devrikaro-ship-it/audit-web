import { publicOAuthProjection } from "@/shared/public-contract/oauth-contract";
import { isValidElement, type ReactElement } from "react";
import { HubView } from "@/modules/public/view/hub";


export function loadHub() {
  return {  };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type HubProps = Exclude<ReturnType<typeof loadHub>, ReactElement>;

export function showHub() {
  const loaded = loadHub();
  return isValidElement(loaded) ? loaded : <HubView {...(loaded as HubProps)} />;
}

export const metadata = {
  title: "Audit Devrika — free audits for online stores",
  description: publicOAuthProjection.hubMetadata,
};
