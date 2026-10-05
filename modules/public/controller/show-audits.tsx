import { isValidElement, type ReactElement } from "react";
import { AuditsView } from "@/modules/public/view/audits";


export function loadAudits() {
  return {  };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type AuditsProps = Exclude<ReturnType<typeof loadAudits>, ReactElement>;

export function showAudits() {
  const loaded = loadAudits();
  return isValidElement(loaded) ? loaded : <AuditsView {...(loaded as AuditsProps)} />;
}

export const metadata = {
  title: "Audituri gratuite pentru magazine online — Devrika",
  description: "Alege ce vrei sa analizam: site-ul magazinului (disponibil acum), Google Ads sau Meta Ads (in curand).",
};
