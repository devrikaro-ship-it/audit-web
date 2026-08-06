"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { unseal, seal, SESSION_COOKIE, cookieOptions } from "@/lib/gads-session";

export async function salveazaMarja(formData: FormData) {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);
  if (!session) redirect("/google-ads/connect?eroare=sesiune");

  // Limitele oglindesc sliderul; break-even-ul are sens doar pe marje reale.
  const raw = Number(formData.get("marginPct"));
  const marginPct = Number.isFinite(raw) ? Math.min(90, Math.max(5, Math.round(raw))) : 35;

  jar.set(SESSION_COOKIE, seal({ ...session, marginPct }), cookieOptions());
  redirect("/google-ads/raport");
}
