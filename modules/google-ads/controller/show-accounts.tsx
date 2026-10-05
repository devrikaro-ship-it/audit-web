import { href } from "@/shared/route-table";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unseal, SESSION_COOKIE } from "@/modules/google-ads/model/data/session";
import { accessTokenFrom, listAccounts, type AccessibleAccount } from "@/modules/google-ads/model/data/oauth";
import { demoOn, demoAccounts } from "@/modules/google-ads/model/data/demo";
import { GADS_LOCALIZED_COPY } from "@/shared/public-contract/localized-copy";
import { runGoogleAdsRead } from "@/shared/public-contract/read-disclosure";
import { isValidElement, type ReactElement } from "react";
import { AccountsView } from "@/modules/google-ads/view/accounts";


export async function loadAccounts({
  searchParams,
}: {
  searchParams: Promise<{ eroare?: string }>;
}) {
  const { eroare } = await searchParams;
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect(`${href("gadsConnect")}?eroare=sesiune`);
  let accounts: AccessibleAccount[] = [];
  const requestedError = Boolean(eroare);
  let errorDetails: string | null = null;
  if (demoOn()) {
    accounts = demoAccounts();
  } else {
    try {
      accounts = await runGoogleAdsRead("listAccounts", async () => listAccounts(await accessTokenFrom(session.refreshToken)));
    } catch (e) {
      errorDetails = e instanceof Error ? e.message : "unknown";
    }
  }
  const usable = accounts.filter((a) => !a.manager);
  const hasAccountReadError = requestedError || errorDetails !== null;
  const accountReadExplanation = requestedError
    ? GADS_LOCALIZED_COPY.selectedAccountDataReadFailure
    : GADS_LOCALIZED_COPY.accountListReadFailure;
  return { requestedError, errorDetails, usable, hasAccountReadError, accountReadExplanation };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type AccountsProps = Exclude<Awaited<ReturnType<typeof loadAccounts>>, ReactElement>;

export async function showAccounts(props: Parameters<typeof loadAccounts>[0]) {
  const loaded = await loadAccounts(props);
  return isValidElement(loaded) ? loaded : <AccountsView {...(loaded as AccountsProps)} />;
}

export const metadata = { title: "Choose an account · Devrika Google Ads Audit" };
