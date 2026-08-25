"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unseal, seal, SESSION_COOKIE, cookieOptions } from "@/lib/gads-session";
import { calculateBreakEven, parseMoney } from "@/lib/gads-financials";

export async function salveazaMarja(formData: FormData) {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/google-ads/connect?eroare=sesiune");

  const submittedAov = formData.getAll("averageOrderValue");
  const submittedGoodsCost = formData.getAll("goodsCost");
  const averageOrderValue = submittedAov.length === 1 ? parseMoney(submittedAov[0]) : null;
  const goodsCost = submittedGoodsCost.length === 1 ? parseMoney(submittedGoodsCost[0]) : null;
  if (averageOrderValue === null || goodsCost === null) redirect("/google-ads/marja?eroare=financiar");

  let financials;
  try {
    financials = calculateBreakEven({ averageOrderValue, goodsCost });
  } catch {
    redirect("/google-ads/marja?eroare=financiar");
  }

  jar.set(SESSION_COOKIE, seal({ ...session, ...financials, marginPct: financials.grossMarginPct }), cookieOptions());
  redirect("/google-ads/raport");
}
