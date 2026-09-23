"use server";
import { revalidatePath } from "next/cache";
import { requireManagerAccess } from "@/lib/gads-manager";
import { setStatus } from "@/lib/dashboard-status";

export async function updateLeadStatus(key: string, status: string): Promise<{ ok: boolean }> {
  await requireManagerAccess();
  const ok = await setStatus(key, status);
  if (ok) revalidatePath("/dashboard");
  return { ok };
}
