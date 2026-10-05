import { missingConfig } from "@/modules/google-ads/model/data/oauth";
import { isValidElement, type ReactElement } from "react";
import { ConnectView } from "@/modules/google-ads/view/connect";

const ERROR_COPY: Record<string, string> = {
  anulat: "You stopped the Google connection. Nothing changed — you can resume at any time.",
  state: "The connection expired before it was completed. Please try again.",
  sesiune: "Your session expired. Reconnect your account to continue.",
  expirat: "Access to your Google account expired or was revoked. Reconnect to resume the audit — it takes about ten seconds.",
  schimb: "Google could not confirm the connection. Please try again.",
  fara_cod: "Google returned an incomplete response. Please try again.",
  google: "Google declined the connection. Please try again.",
  config: "The connection is not active on this server yet.",
  website: "Enter your store website before connecting your Google Ads account.",
};

export async function loadConnect({ searchParams }: { searchParams: Promise<{ eroare?: string; lipsa?: string }> }) {
  const { eroare, lipsa } = await searchParams;
  const notConfigured = missingConfig().length > 0;
  const message = eroare ? (ERROR_COPY[eroare] ?? ERROR_COPY.google) : null;
  return { lipsa, notConfigured, message };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type ConnectProps = Exclude<Awaited<ReturnType<typeof loadConnect>>, ReactElement>;

export async function showConnect(props: Parameters<typeof loadConnect>[0]) {
  const loaded = await loadConnect(props);
  return isValidElement(loaded) ? loaded : <ConnectView {...(loaded as ConnectProps)} />;
}

export const metadata = { title: "Connect your Google Ads account · Devrika" };
