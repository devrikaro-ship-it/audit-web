import type { HTMLAttributes } from "react";

export const publicOAuthContract = {
  providerScope: "adwords",
  permissionCapability: "broad",
  applicationBehavior: "read-operations-only",
  mutationBehavior: "none",
} as const;

export const publicOAuthSurfaceRegistry = {
  landing: { route: "/google-ads", states: ["normal"] },
  connect: { route: "/google-ads/connect", states: ["normal", "error"] },
  "account-picker": { route: "/google-ads/conturi", states: ["success", "list-error", "account-error"] },
  margin: { route: "/google-ads/marja", states: ["normal", "error"] },
  report: { route: "/google-ads/raport", states: ["success", "catalog-unavailable"] },
  simulator: { route: "/google-ads/impreuna", states: ["normal"] },
  hub: { route: "/hub", states: ["normal"] },
  privacy: { route: "/confidentialitate", states: ["normal"] },
  terms: { route: "/termeni", states: ["normal"] },
} as const;

export const publicLocalizedBranchRegistry = {
  accountListReadFailure: { surface: "account-picker", state: "list-error" },
  selectedAccountDataReadFailure: { surface: "account-picker", state: "account-error" },
  accountDataRetention: { surface: "hub", state: "normal" },
} as const;

export type PublicOAuthSurface = keyof typeof publicOAuthSurfaceRegistry;

export function publicOAuthAttributes(surface: PublicOAuthSurface, state: string = "normal"): HTMLAttributes<HTMLElement> {
  const registered = publicOAuthSurfaceRegistry[surface];
  if (!registered.states.includes(state as never)) throw new Error(`Unknown public OAuth surface state: ${surface}:${state}`);
  return {
    "data-public-oauth-surface": `${surface}:${state}`,
    "data-provider-scope": publicOAuthContract.providerScope,
    "data-permission-capability": publicOAuthContract.permissionCapability,
    "data-application-behavior": publicOAuthContract.applicationBehavior,
    "data-mutation-behavior": publicOAuthContract.mutationBehavior,
  } as HTMLAttributes<HTMLElement>;
}

export const registeredPublicOAuthAttributes = Object.fromEntries(
  Object.entries(publicOAuthSurfaceRegistry).map(([surface, registration]) => [
    surface,
    Object.fromEntries(registration.states.map((state) => [state, publicOAuthAttributes(surface as PublicOAuthSurface, state)])),
  ]),
) as Record<PublicOAuthSurface, Record<string, HTMLAttributes<HTMLElement>>>;

// LANG: pending full translation to EN
export const PUBLIC_OAUTH_LOCALIZED_COPY = {
  readsOnlyLabel: "Doar citim",
  applicationReadsData: "Aplicatia citeste datele, le compara cu pragurile afacerii tale si iti arata rezultatul pe loc.",
  noAccountChanges: "Nu modificam nimic in contul tau.",
  noChangesBadge: "Nu modificam nimic",
  noCampaignMutations: "Nu putem porni sau opri campanii si nu putem cheltui bani.",
  googleAdsPermission: "Cerem un singur drept de acces, cel pentru Google Ads. Nimic din Gmail sau Drive.",
  permissionDisclosure: "Cu acordul tau explicit, aplicatia cere o singura permisiune Google (adwords).",
  officialAccessMechanism: "Cand un audit are nevoie de acces la un cont de publicitate, ti-l cerem prin mecanismul oficial al platformei.",
  shoppingReadAndNoMutation: "Citim doar datele de Shopping. Nu modificam nimic in contul tau.",
  shoppingReadNoMutationAndRevoke: "Citim doar datele de Shopping. Nu modificam nimic si poti retrage accesul oricand din contul tau Google.",
  termsNoMutations: "Nu modificam nimic in contul tau: nu pornim si nu oprim campanii, nu schimbam bugete, nu adaugam si nu stergem cuvinte cheie.",
  connectNoMutations: "NU putem modifica nimic — nici bugete, nici campanii",
} as const;

const publicOAuthStatements = {
  "oauth-is-not-read-only": PUBLIC_OAUTH_LOCALIZED_COPY.permissionDisclosure,
  "application-performs-no-mutations": PUBLIC_OAUTH_LOCALIZED_COPY.termsNoMutations,
} as const;

export type PublicOAuthStatement = keyof typeof publicOAuthStatements;

export function publicOAuthStatement(statement: PublicOAuthStatement): string {
  const localized = publicOAuthStatements[statement];
  if (!localized) throw new Error(`Unknown public OAuth statement: ${statement}`);
  return localized;
}
