"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { parseGrossMargin, unseal, seal, SESSION_COOKIE, cookieOptions } from "@/lib/gads-session";

export async function salveazaMarja(formData: FormData) {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/google-ads/connect?eroare=sesiune");

  const submittedMargins = formData.getAll("marginPct");
  const marginPct = submittedMargins.length === 1 ? parseGrossMargin(submittedMargins[0]) : null;
  if (marginPct === null) redirect("/google-ads/marja?eroare=marja");

  jar.set(SESSION_COOKIE, seal({ ...session, marginPct }), cookieOptions());
  redirect("/google-ads/raport");
}
