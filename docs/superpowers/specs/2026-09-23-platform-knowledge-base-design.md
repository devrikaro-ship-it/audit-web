# Platform knowledge base for the site audit — design

Status: approved by the operator on 2026-09-23 (learning with a safety gate, option 1). Built and live on 2026-09-23: stage 1 (reading profiles), stage 2 (lib/observations.ts, one line per audit in platform-knowledge/observations.jsonl, per-platform summary in the dashboard) and stage 3 (lib/learning.ts: bounded pace, URL-prefix rules promoted at 5 domains or approved in the dashboard, approved.json). Scope: the cold website audit
(lead magnet). Follows `2026-09-23-site-audit-page-selection-design.md`.

## Goal

Every ecommerce platform gets clear reading rules and a record of the problems usually found on it, and the audit
learns from every run: which rules to respect, how to behave on each platform, what to do and what not to do.

## Why not a fully self-rewriting base, and why not RAG

1. A base that rewrites its own rules after each audit also learns from outliers. Measured 2026-09-23: vegis.ro
   (Magento) answers 403 to every bot request, homepage included. Learning from it alone would conclude "Magento
   sites yield 0 pages" and change the rule for every Magento store, in a report that prospects read.
2. The audit engine computes with deterministic rules; no model reads documents during an audit, so retrieval
   (RAG) has nothing to feed. The base is structured data: rules, parameters and statistics per platform.

## Platforms

WooCommerce, Shopify, Magento, PrestaShop, GoMag, MerchantPro, OpenCart, plus a generic profile for anything else.
Detection keeps using `lib/site-signals.ts` (`detectPlatform`).

## The two layers

1. **Curated layer, in the repository** (`lib/platform-knowledge/<platform>.json`, versioned, tested, shipped by
   deploy). Seeded from measured facts, including Darwin's platform adapters (`backend/services/sitePlatform.js`,
   2026-09-19/22: MerchantPro `sitemap_shop.xml` mixes products and categories; Gomag category listings).
2. **Learned layer, online** (the production data volume `/app/data/platform-knowledge/`, survives deploys, not in
   git). Written by the application after every audit.

The effective profile of a platform = curated layer, overridden only by learned entries that passed the gate.

## A profile

1. **Recognition** — the markers that identify the platform (single source stays `site-signals.ts`).
2. **Reading** — sitemap entry points in order; child-sitemap name signals per page type (product / category /
   other / mixed); URL path signals per page type; polite concurrency (simultaneous requests); known traps.
3. **Typical problems** — each with an id, how the audit detects it (an existing check id), the client-language
   explanation, and the Devrika service it maps to. Frequencies come from the learned layer.

## Learning and the safety gate

After every finished audit the application appends one observation: domain, platform, sitemap children seen and
the type each resolved to, URLs per type, pages fetched / blocked (429, 403), products and categories confirmed by
content, the check ids that failed, duration.

From the observations:
1. **Problem statistics** update automatically (they are counts, e.g. "68% of WooCommerce stores lack Product
   schema").
2. **Bounded parameters** update automatically inside hard limits, e.g. a platform's concurrency is lowered when
   its audits get 429s and raised slowly when they get none; never below 1 or above 8.
3. **Candidate reading rules** (e.g. "on GoMag, child sitemap name X holds categories") become active by
   themselves only when seen on at least 5 distinct domains with no contradicting observation; otherwise they wait
   in the dashboard for the operator's approval.
4. A domain that blocked the audit (homepage not 200) contributes no observation to rules or parameters.

The dashboard shows, per platform, what was learned, from how many stores, and the pending candidates.

## Delivery in three stages, each live and verified before the next

1. **Reading profiles** — curated profiles for the 7 platforms + generic; the engine selects pages and paces
   requests by profile (includes the bounded 429 retry and XML-unescaped sitemap URLs already built).
   Done when: one real store per platform audited in production reaches 50+ pages, at least 30 products and
   10 categories where the store has them, 0 pages lost to blocking, under about 90 s; the store list lives in the
   curated layer.
2. **Observation log** — one observation per audit on the data volume, visible per platform in the dashboard.
   Done when: a production audit adds exactly one observation, and a blocked domain is recorded as blocked.
3. **Learning** — statistics, bounded parameters and gated candidate rules; dashboard approval for pending ones.
   Done when: on recorded observations, a candidate seen on 5 domains is promoted, one seen on 4 is pending, a
   contradicted one is not promoted, and concurrency moves only inside its limits.

## Not in scope

No change to the report structure (`docs/AUDIT-SPEC.md` §3-§4): typical problems feed statistics and the team, not
new report fields. No model-generated report text.
