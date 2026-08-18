// Autentificarea Basic a dashboard-ului intern, scoasa din `proxy.ts` ca sa poata fi testata
// fara sa pornim Next.
//
// Regula, aceeasi cu cea din `gads-session.ts`: in PRODUCTIE nu exista valoare implicita. Repo-ul
// e public, deci o parola scrisa in cod ar insemna ca oricine o citeste intra peste lead-uri.
// Fara `DASH_USER` + `DASH_PASS` pe server, dashboard-ul se inchide — nu se deschide.

export type DashCred = { user: string; pass: string } | null;

export function dashCredentials(env: Record<string, string | undefined> = process.env): DashCred {
  const user = env.DASH_USER;
  const pass = env.DASH_PASS;
  if (user && pass) return { user, pass };
  if (env.NODE_ENV === "production") return null;
  // Local: o pereche cunoscuta e comoda si nu risca nimic — nu exista lead-uri reale pe masina ta.
  return { user: "devrika", pass: "audit-local" };
}

export function basicAuthOk(header: string | null | undefined, cred: DashCred): boolean {
  if (!cred || !header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  // Primul `:` desparte; restul e parola. Un `split(":")` simplu ar rupe parolele care contin `:`.
  const i = decoded.indexOf(":");
  if (i < 0) return false;
  return decoded.slice(0, i) === cred.user && decoded.slice(i + 1) === cred.pass;
}
