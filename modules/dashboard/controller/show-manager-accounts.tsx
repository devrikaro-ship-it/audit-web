import type { Metadata } from "next";
import { managerAccounts, requireManagerAccess } from "@/modules/google-ads";
import { isValidElement, type ReactElement } from "react";
import { ManagerAccountsView } from "@/modules/dashboard/view/manager-accounts";


export async function loadManagerAccounts() {
  await requireManagerAccess();
  const accounts = await managerAccounts();
  return { accounts };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type ManagerAccountsProps = Exclude<Awaited<ReturnType<typeof loadManagerAccounts>>, ReactElement>;

export async function showManagerAccounts() {
  const loaded = await loadManagerAccounts();
  return isValidElement(loaded) ? loaded : <ManagerAccountsView {...(loaded as ManagerAccountsProps)} />;
}

export const metadata: Metadata = { title: "Reporting manager — Devrika", robots: { index: false, follow: false } };
