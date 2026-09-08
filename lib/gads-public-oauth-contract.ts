import type { HTMLAttributes } from "react";
import { googleAdsReadCategories, projectGoogleAdsReadCategories } from "./gads-read-disclosure";

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
  "client-portal": { route: "/google-ads/portal/[token]", states: ["normal"] },
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
  reportDownload: { source: "app/api/google-ads/reports/[id]/route.ts", kind: "response-emitter" },
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

export const localizedOAuthGrammar = Object.freeze({
  consent: "With your explicit consent",
  application: "the application",
  requestsOneGooglePermission: "requests one Google permission",
  oauthGoogleAdsPermission: "The Google Ads OAuth permission",
  isOperator: "is",
  notOperator: "not",
  readOnlyCapability: "read-only",
  readOperation: "reads data, compares it with your business thresholds, and shows you the result immediately",
  mutationSubject: "we do",
  mutateOperation: "change anything in your account",
});

export function projectOAuthClause(clauseId: PublicOAuthClauseId): string {
  const fact = publicOAuthClauseFacts[clauseId];
  if (!fact || publicOAuthContract[fact.property] !== fact.value) throw new Error(`Unsupported public OAuth clause: ${clauseId}`);
  if (fact.property === "providerScope") {
    return `${localizedOAuthGrammar.consent}, ${localizedOAuthGrammar.application} ${localizedOAuthGrammar.requestsOneGooglePermission} (${publicOAuthContract.providerScope}).`;
  }
  if (fact.property === "permissionCapability") {
    return `${localizedOAuthGrammar.oauthGoogleAdsPermission} ${localizedOAuthGrammar.isOperator} ${localizedOAuthGrammar.notOperator} ${localizedOAuthGrammar.readOnlyCapability}.`;
  }
  if (fact.property === "applicationBehavior") {
    return `${localizedOAuthGrammar.application[0].toUpperCase()}${localizedOAuthGrammar.application.slice(1)} ${localizedOAuthGrammar.readOperation}.`;
  }
  return `${localizedOAuthGrammar.mutationSubject[0].toUpperCase()}${localizedOAuthGrammar.mutationSubject.slice(1)} ${localizedOAuthGrammar.notOperator} ${localizedOAuthGrammar.mutateOperation}.`;
}

export function projectOAuthClauses(...clauseIds: PublicOAuthClauseId[]): string {
  return clauseIds.map(projectOAuthClause).join(" ");
}

export function projectPublicOAuth(contract: typeof publicOAuthContract) {
  if (contract.providerScope !== "adwords") throw new Error("Unsupported public OAuth provider scope");
  if (contract.permissionCapability !== "broad") throw new Error("Unsupported public OAuth permission capability");
  if (contract.applicationBehavior !== "read-operations-only") throw new Error("Unsupported public OAuth application behavior");
  if (contract.mutationBehavior !== "none") throw new Error("Unsupported public OAuth mutation behavior");
  const auditDataCategories = projectGoogleAdsReadCategories(googleAdsReadCategories);
  const auditDataReadDisclosure = `The app reads the data required for the audit: ${auditDataCategories}.`;
  return Object.freeze({
  readsOnlyLabel: "The application only reads",
  applicationReadsData: "The application reads data, compares it with your business thresholds, and shows you the result immediately.",
  noAccountChanges: "We do not change anything in your account.",
  noChangesBadge: "No account changes",
  noCampaignMutations: "We cannot start or stop campaigns, change budgets, or spend money.",
  googleAdsPermission: "We request one access permission, for Google Ads. Nothing from Gmail or Drive.",
  officialAccessMechanism: "When an audit needs access to an advertising account, we request it through the platform's official authorization mechanism.",
  auditDataCategories,
  auditDataReadDisclosure,
  auditDataReadAndNoMutation: `${auditDataReadDisclosure} We do not change anything in your account.`,
  auditDataReadNoMutationAndRevoke: `${auditDataReadDisclosure} We do not change anything, and you can revoke access at any time from your Google account.`,
  connectNoMutations: "We CANNOT change anything — including budgets or campaigns",
  rootMetadata: "Find out in 2 minutes why your store is not selling as much as it could: tracking, SEO, user experience, and Google Ads/Shopping. Free, no account required.",
  landingMetadata: (windowLabel: string) => `Audit Devrika analyzes your Google Ads account over the last ${windowLabel}. ${auditDataReadDisclosure} We do not change anything in your account.`,
  hubMetadata: "A web application that analyzes your store and advertising accounts and shows where you are losing money: on your website, in Google Ads, and in Shopping campaigns.",
  privacyMetadata: "How the Devrika application handles your Google Ads account data: what we read, what we retain, who we do not share it with, and how you revoke access.",
  termsMetadata: "The terms under which you may use the Devrika Google Ads audit application.",
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
