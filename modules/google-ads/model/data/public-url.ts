// De unde stie serverul pe ce adresa il vede omul din browser.
//
// In productie (Coolify) proxy-ul trimite cererea mai departe catre container cu
// `Host: localhost:3000`, iar Next construieste `req.url` din acel antet. Un redirect facut
// cu `new URL("/undeva", req.url)` iese atunci ca `https://localhost:3000/undeva` — adica in
// gol, pe calculatorul vizitatorului. Asa a picat intoarcerea de la Google pe live (20.08.2026),
// desi local mergea: acolo `req.url` chiar ESTE localhost:3000.
//
// Ordinea de mai jos pune mediul inaintea antetelor dintr-un motiv de siguranta, nu doar de
// corectitudine: `Host`/`X-Forwarded-Host` vin, la origine, din afara. Daca ne-am lua dupa ele
// fara sa avem o valoare setata de noi, cine trimite cererea ne poate dicta unde redirectam.

type CerereMinima = { url: string; headers: Headers };
type Mediu = Record<string, string | undefined>;

const LOCALE = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function origineDin(valoare: string | undefined): string | null {
  if (!valoare) return null;
  try {
    const u = new URL(valoare);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    // Un env care arata spre localhost nu are ce spune: pe server nu inseamna nimic, iar pe
    // masina de lucru portul adevarat e cel pe care a venit cererea (demo pe 3100, de exemplu,
    // cu GADS_REDIRECT_URI ramas pe 3000).
    if (LOCALE.has(u.hostname)) return null;
    return u.origin;
  } catch {
    return null;
  }
}

/** Originea publica ("https://audit.devrika.ro"), fara bara la final. */
export function publicOrigin(req: CerereMinima, env: Mediu = process.env): string {
  // 1. Setat explicit de noi pe server.
  const dinPublicUrl = origineDin(env.PUBLIC_URL);
  if (dinPublicUrl) return dinPublicUrl;

  // 2. Adresa de intoarcere inregistrata la Google e tot o valoare a noastra, si e deja
  //    obligatorie pentru flux — deci pe orice server unde merge OAuth-ul, exista.
  const dinRedirect = origineDin(env.GADS_REDIRECT_URI);
  if (dinRedirect) return dinRedirect;

  // 3. Ce spune proxy-ul despre el insusi.
  const gazda = req.headers.get("x-forwarded-host");
  if (gazda) {
    const schema = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    const dinProxy = origineDin(`${schema}://${gazda.split(",")[0].trim()}`);
    if (dinProxy) return dinProxy;
  }

  // 4. Local, unde adresa cererii e chiar cea adevarata.
  return new URL(req.url).origin;
}

/** Adresa absoluta catre o cale din aplicatie, buna de pus in `Location`. */
export function publicUrl(req: CerereMinima, cale: string, env: Mediu = process.env): string {
  return new URL(cale, publicOrigin(req, env)).toString();
}
