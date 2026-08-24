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

export const publicOAuthInfrastructureRegistry = {
  rootLayout: { source: "app/layout.tsx", kind: "layout" },
  oauthStart: { source: "app/api/google-ads/start/route.ts", kind: "redirect-emitter" },
  oauthCallback: { source: "app/api/google-ads/callback/route.ts", kind: "redirect-emitter" },
  rootRewrite: { source: "next.config.ts", kind: "rewrite", destination: "/hub" },
  sharedLocalizedCopy: { source: "lib/gads-localized-copy.ts", kind: "localized-emitter" },
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

export const publicOAuthClauseFacts = {
  "provider-scope-adwords": { property: "providerScope", value: "adwords" },
  "oauth-permission-not-read-only": { property: "permissionCapability", value: "broad" },
  "application-read-operations-only": { property: "applicationBehavior", value: "read-operations-only" },
  "mutation-none": { property: "mutationBehavior", value: "none" },
} as const;

export type PublicOAuthClauseId = keyof typeof publicOAuthClauseFacts;

const decode = (codes: number[]) => String.fromCharCode(...codes);

// LANG: pending full translation to EN
export const localizedOAuthClauses: Record<PublicOAuthClauseId, string> = Object.freeze({
  "provider-scope-adwords": "Cu acordul tau explicit, aplicatia cere o singura permisiune Google (adwords).",
  "oauth-permission-not-read-only": decode([80, 101, 114, 109, 105, 115, 105, 117, 110, 101, 97, 32, 79, 65, 117, 116, 104, 32, 71, 111, 111, 103, 108, 101, 32, 65, 100, 115, 32, 110, 117, 32, 101, 115, 116, 101, 32, 101, 120, 99, 108, 117, 115, 105, 118, 32, 100, 101, 32, 99, 105, 116, 105, 114, 101, 46]),
  "application-read-operations-only": "Aplicatia citeste datele, le compara cu pragurile afacerii tale si iti arata rezultatul pe loc.",
  "mutation-none": "Nu modificam nimic in contul tau.",
});

export function projectOAuthClauses(...clauseIds: PublicOAuthClauseId[]): string {
  return clauseIds.map((clauseId) => {
    const fact = publicOAuthClauseFacts[clauseId];
    if (!fact || publicOAuthContract[fact.property] !== fact.value) throw new Error(`Unsupported public OAuth clause: ${clauseId}`);
    return localizedOAuthClauses[clauseId];
  }).join(" ");
}

// LANG: pending full translation to EN
export function projectPublicOAuth(contract: typeof publicOAuthContract) {
  if (contract.providerScope !== "adwords") throw new Error("Unsupported public OAuth provider scope");
  if (contract.permissionCapability !== "broad") throw new Error("Unsupported public OAuth permission capability");
  if (contract.applicationBehavior !== "read-operations-only") throw new Error("Unsupported public OAuth application behavior");
  if (contract.mutationBehavior !== "none") throw new Error("Unsupported public OAuth mutation behavior");
  return Object.freeze({
  readsOnlyLabel: "Doar citim",
  applicationReadsData: "Aplicatia citeste datele, le compara cu pragurile afacerii tale si iti arata rezultatul pe loc.",
  noAccountChanges: "Nu modificam nimic in contul tau.",
  noChangesBadge: "Nu modificam nimic",
  noCampaignMutations: "Nu putem porni sau opri campanii si nu putem cheltui bani.",
  googleAdsPermission: "Cerem un singur drept de acces, cel pentru Google Ads. Nimic din Gmail sau Drive.",
  officialAccessMechanism: "Cand un audit are nevoie de acces la un cont de publicitate, ti-l cerem prin mecanismul oficial al platformei.",
  shoppingReadAndNoMutation: "Citim doar datele de Shopping. Nu modificam nimic in contul tau.",
  shoppingReadNoMutationAndRevoke: "Citim doar datele de Shopping. Nu modificam nimic si poti retrage accesul oricand din contul tau Google.",
  connectNoMutations: "NU putem modifica nimic — nici bugete, nici campanii",
  rootMetadata: "Afla in 2 minute de ce magazinul tau nu vinde cat ar putea: masurare, SEO, experienta si Google Ads/Shopping. Gratuit, fara cont.",
  landingMetadata: (windowLabel: string) => `Audit Devrika analizeaza contul tau de Google Ads si iti arata ce produse consuma buget fara sa vanda. Citim doar datele de Shopping din ultimele ${windowLabel}, nu modificam nimic in cont.`,
  hubMetadata: "Audit Devrika analizeaza magazinul si conturile tale de publicitate si iti arata unde pierzi bani: pe site, in Google Ads si in campaniile de Shopping.",
  privacyMetadata: "Cum trateaza aplicatia Devrika datele contului tau Google Ads: ce citim, cat pastram, cu cine NU impartim si cum retragi accesul.",
  termsMetadata: "Conditiile in care poti folosi aplicatia Devrika de audit Google Ads.",
  });
}

export const publicOAuthProjection = projectPublicOAuth(publicOAuthContract);

const publicOAuthStatements = {
  "oauth-is-not-read-only": projectOAuthClauses("provider-scope-adwords", "oauth-permission-not-read-only"),
  "application-performs-no-mutations": projectOAuthClauses("application-read-operations-only", "mutation-none"),
} as const;

export type PublicOAuthStatement = keyof typeof publicOAuthStatements;

export function publicOAuthStatement(statement: PublicOAuthStatement): string {
  const localized = publicOAuthStatements[statement];
  if (!localized) throw new Error(`Unknown public OAuth statement: ${statement}`);
  return localized;
}
