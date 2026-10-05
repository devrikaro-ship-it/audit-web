import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { dashboardAccessOk, dashboardReturnPath } from "@/shared/auth/dashboard-session";
import { isValidElement, type ReactElement } from "react";
import { LoginView } from "@/modules/dashboard/view/login";


export async function loadLogin({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = dashboardReturnPath(params.next);
  if (await dashboardAccessOk(await headers())) redirect(next);
  return { params, next };
}

// What the view receives; an early screen (no session, unavailable data) is returned as is.
export type LoginProps = Exclude<Awaited<ReturnType<typeof loadLogin>>, ReactElement>;

export async function showLogin(props: Parameters<typeof loadLogin>[0]) {
  const loaded = await loadLogin(props);
  return isValidElement(loaded) ? loaded : <LoginView {...(loaded as LoginProps)} />;
}

export const metadata: Metadata = { title: "Sign in — Devrika Manager", robots: { index: false, follow: false } };
