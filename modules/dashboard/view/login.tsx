import { href } from "@/shared/route-table";
import styles from "@/modules/dashboard/view/login.module.css";
import type { LoginProps } from "@/modules/dashboard/controller/show-login";


export function LoginView({ params, next }: LoginProps) {
  return <main className={styles.page}>
    <section className={styles.card} aria-labelledby="login-title">
      <a className={styles.brand} href={href("dashboardGads")}>Devrika<span> / Manager</span></a>
      <p className={styles.eyebrow}>Reporting workspace</p>
      <h1 id="login-title">Welcome back.</h1>
      <p className={styles.intro}>Sign in to view your clients and their reports.</p>
      {params.error === "invalid" && <p className={styles.error} role="alert">The username or password is incorrect. Please try again.</p>}
      <form action={href("dashboardLoginSubmit")} method="post">
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
