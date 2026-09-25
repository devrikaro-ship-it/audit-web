// The thresholds the SEO rows judge by. The engine and the report's wording both read them from here, so the report
// always states the limits the audit applied.
export const SEO_LIMITS = {
  titleMin: 15, titleMax: 65,        // characters of the title shown in Google
  descMin: 70, descMax: 160,         // characters of the description shown under it
  ownText: 200,                      // characters of a page's own written text that count as a real description
} as const;
