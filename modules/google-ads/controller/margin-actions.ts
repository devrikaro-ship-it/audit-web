"use server";

import { href } from "@/shared/route-table";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unseal, seal, SESSION_COOKIE, cookieOptions } from "@/modules/google-ads/model/data/session";
import { calculateBreakEven, parseMoney } from "@/modules/google-ads/model/financials";

export async function salveazaMarja(formData: FormData) {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect(`${href("gadsConnect")}?eroare=sesiune`);

  const submittedAov = formData.getAll("averageOrderValue");
  const submittedGoodsCost = formData.getAll("goodsCost");
  const averageOrderValue = submittedAov.length === 1 ? parseMoney(submittedAov[0]) : null;
  const goodsCost = submittedGoodsCost.length === 1 ? parseMoney(submittedGoodsCost[0]) : null;
  if (averageOrderValue === null || goodsCost === null) redirect(`${href("gadsMargin")}?eroare=financiar`);

  let financials;
  try {
    financials = calculateBreakEven({ averageOrderValue, goodsCost });
  } catch {
    redirect(`${href("gadsMargin")}?eroare=financiar`);
  }

  jar.set(SESSION_COOKIE, seal({ ...session, ...financials, marginPct: financials.grossMarginPct }), cookieOptions());
  redirect(href("gadsReport"));
}
