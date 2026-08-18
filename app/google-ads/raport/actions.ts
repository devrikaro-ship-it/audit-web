"use server";

import { cookies } from "next/headers";
import { unseal, SESSION_COOKIE } from "@/lib/gads-session";
import { saveLeadSafe } from "@/lib/gads-leads";

export async function salveazaContact(formData: FormData): Promise<{ ok: boolean }> {
  const jar = await cookies();
  const session = unseal(jar.get(SESSION_COOKIE)?.value);

  return saveLeadSafe({
    nume: String(formData.get("nume") ?? "").slice(0, 120),
    email: String(formData.get("email") ?? "").slice(0, 160),
    telefon: String(formData.get("telefon") ?? "").slice(0, 40),
    customerId: session?.customerId,
    customerName: session?.customerName,
    marginPct: session?.marginPct,
  });
}
