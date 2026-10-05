// The thresholds the SEO rows judge by. The engine and the report's wording both read them from here, so the report
// always states the limits the audit applied.
export const SEO_LIMITS = {
  titleMin: 15, titleMax: 65,        // characters of the title shown in Google
  descMin: 70, descMax: 160,         // characters of the description shown under it
  ownText: 200,                      // characters of a page's own written text that count as a real description
} as const;

// The thresholds the UX signals of a shop judge by, stated by their labels too.
export const UX_LIMITS = {
  homeLinks: 10,                     // links from the home page to the site's own pages
  productImages: 3,                  // photos on a product page
} as const;
