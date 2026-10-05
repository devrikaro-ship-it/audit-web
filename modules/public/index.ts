// The door of the public module (spec 2026-10-05 §3 rule 4): the home, audits, hub, terms and privacy pages.
import { showHome } from "./controller/show-home";
import { showAudits } from "./controller/show-audits";
import { showHub } from "./controller/show-hub";
import { showTerms } from "./controller/show-terms";
import { showPrivacy } from "./controller/show-privacy";

export { metadata as auditsMetadata } from "./controller/show-audits";
export { metadata as hubMetadata } from "./controller/show-hub";
export { metadata as termsMetadata } from "./controller/show-terms";
export { metadata as privacyMetadata } from "./controller/show-privacy";

export const publicPages = {
  name: "public",
  controllers: { showHome, showAudits, showHub, showTerms, showPrivacy },
} as const;
