import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AccountControls from "./account-controls";
import { listOwnedReports } from "@/lib/client-report-access";
import { CLIENT_SESSION_COOKIE } from "@/lib/client-session";

export const dynamic = "force-dynamic";

export default async function ClientHomePage() {
  const cookieStore = await cookies();
  let account;
  try {
    account = await listOwnedReports(cookieStore.get(CLIENT_SESSION_COOKIE)?.value);
  } catch {
    redirect("/client/login");
  }
  if (!account) redirect("/client/login");

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold">Your Google Ads reports</h1>
        <p className="mt-2 text-slate-600">Only reports assigned to this client identity are available.</p>
        <ul className="mt-8 space-y-3">
          {account.reports.map((report) => (
            <li className="rounded-xl border border-slate-200 bg-white p-5" key={report.reportId}>
              <Link className="font-medium text-blue-700" href={`/client/reports/${encodeURIComponent(report.reportId)}`}>
                Report created {new Date(report.createdAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
              </Link>
            </li>
          ))}
          {!account.reports.length && <li className="rounded-xl border border-slate-200 bg-white p-5 text-slate-600">No reports have been assigned yet.</li>}
        </ul>
        <AccountControls />
      </div>
    </main>
  );
}

