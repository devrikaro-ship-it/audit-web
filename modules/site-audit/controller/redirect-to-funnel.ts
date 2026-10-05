import { redirect } from "next/navigation";
import { href } from "@/shared/route-table";

// /audit is an old address of the funnel.
export function redirectToFunnel() {
  redirect(href("siteFunnel"));
}
