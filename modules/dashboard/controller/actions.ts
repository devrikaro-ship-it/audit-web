"use server";
import { href } from "@/shared/route-table";
import { revalidatePath } from "next/cache";
import { requireManagerAccess } from "@/modules/google-ads";
import { setStatus } from "@/modules/dashboard/model/data/status-store";
import { approveCandidate } from "@/modules/site-audit";

export async function updateLeadStatus(key: string, status: string): Promise<{ ok: boolean }> {
  await requireManagerAccess();
  const ok = await setStatus(key, status);
  if (ok) revalidatePath(href("dashboardHome"));
  return { ok };
}

export async function approveLearning(key: string): Promise<void> {
  await requireManagerAccess();
  if (await approveCandidate(key)) revalidatePath(href("dashboardHome"));
}
