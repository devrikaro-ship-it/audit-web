// Monede suportate in simulare — SURSA UNICA a codului ISO + simbolul afisat.
// Consumata de funnel (selector + inputuri), roi-sim (ipoteza CPC de referinta) si
// raport (afisarea sumelor). Un singur loc ca sa nu se contrazica simbolurile.
// Pur: doar constante + lookup, fara retea.

export const CURRENCIES = [
  { code: "RON", sym: "lei" },
  { code: "EUR", sym: "€" },
  { code: "USD", sym: "$" },
  { code: "GBP", sym: "£" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

// Simbolul de afisare pentru un cod ISO. Necunoscut -> intoarce codul ca atare.
export function symOf(code: string | null | undefined): string {
  const c = CURRENCIES.find((x) => x.code === (code ?? "").toUpperCase());
  return c ? c.sym : (code ?? "").toUpperCase();
}
