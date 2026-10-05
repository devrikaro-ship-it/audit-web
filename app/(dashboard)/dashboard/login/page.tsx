import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { dashboardAccessOk, dashboardReturnPath } from "@/lib/dashboard-session";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sign in — Devrika Manager", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  const next = dashboardReturnPath(params.next);
  if (await dashboardAccessOk(await headers())) redirect(next);
  return <main className={styles.page}>
    <section className={styles.card} aria-labelledby="login-title">
      <a className={styles.brand} href="/dashboard/google-ads">Devrika<span> / Manager</span></a>
      <p className={styles.eyebrow}>Reporting workspace</p>
      <h1 id="login-title">Welcome back.</h1>
      <p className={styles.intro}>Sign in to view your clients and their reports.</p>
      {params.error === "invalid" && <p className={styles.error} role="alert">The username or password is incorrect. Please try again.</p>}
      <form action="/dashboard/login/submit" method="post">
        <input type="hidden" name="next" value={next} />
        <label htmlFor="username">Username</label>
        <input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} required maxLength={256} />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={1024} />
        <button type="submit">Sign in <span aria-hidden="true">→</span></button>
      </form>
      <p className={styles.note}>For the Devrika team.</p>
    </section>
  </main>;
}
