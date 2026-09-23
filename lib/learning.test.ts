import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { approveCandidate, candidateKey, computeLearning, effectiveProfile, learnedConcurrency, readApprovals } from "./learning";
import { pathPrefixes, type Observation } from "./observations";
import { profileFor } from "./platform-knowledge";

const obs = (domain: string, extra: Partial<Observation> = {}): Observation => ({
  at: 1, domain, platform: "GoMag", sitemap: "", urls: { product: 1, category: 1, other: 0 }, fetched: 60, ok: 60, refused: 0,
  usedBrowser: false, blocked: false, products: 30, categories: 10, failedChecks: [], durationMs: 1, ...extra,
});
const gomag = profileFor("GoMag");

describe("computeLearning", () => {
  const seenOn = (n: number, prefix: string) => Array.from({ length: n }, (_, i) => obs(`shop${i}-${prefix}.ro`, { productPrefixes: [prefix] }));

  it("promotes a rule seen on 5 distinct domains and keeps one seen on 4 pending", () => {
    const l = computeLearning([...seenOn(5, "/p/"), ...seenOn(4, "/produs-nou/")], [gomag]);
    expect(l.candidates.find((c) => c.signal === "/p/")?.status).toBe("promoted");
    expect(l.candidates.find((c) => c.signal === "/produs-nou/")?.status).toBe("pending");
  });

  it("never promotes a contradicted rule, however often it is seen", () => {
    const l = computeLearning([...seenOn(6, "/x/"), obs("other.ro", { categoryPrefixes: ["/x/"] })], [gomag]);
    expect(l.candidates.find((c) => c.signal === "/x/" && c.kind === "product")?.status).toBe("rejected");
  });

  it("does not learn from blocked domains", () => {
    const l = computeLearning(seenOn(5, "/p/").map((o) => ({ ...o, blocked: true })), [gomag]);
    expect(l.candidates).toHaveLength(0);
  });

  it("marks an approved pending rule active", () => {
    const l = computeLearning(seenOn(2, "/p/"), [gomag], [candidateKey("GoMag", "product", "/p/")]);
    expect(l.candidates[0].status).toBe("approved");
  });
});

describe("learnedConcurrency", () => {
  it("halves on frequent refusals, grows after 5 clean audits, and stays between 1 and 8", () => {
    expect(learnedConcurrency([obs("a", { refused: 30 })], 4)).toBe(2);
    expect(learnedConcurrency([obs("a", { refused: 60 })], 1)).toBe(1);
    expect(learnedConcurrency(Array.from({ length: 5 }, (_, i) => obs(`s${i}`)), 8)).toBe(8);
    expect(learnedConcurrency(Array.from({ length: 5 }, (_, i) => obs(`s${i}`)), 4)).toBe(5);
    expect(learnedConcurrency([obs("a")], 4)).toBe(4);
  });
});

describe("effectiveProfile", () => {
  it("adds only active rules and the learned pace to the profile the engine reads with", () => {
    const l = computeLearning([...Array.from({ length: 5 }, (_, i) => obs(`d${i}`, { productPrefixes: ["/p/"], refused: 30 })), obs("z", { productPrefixes: ["/q/"] })], [gomag]);
    const p = effectiveProfile(gomag, l);
    expect(p.urlSignals.product).toContain("/p/");
    expect(p.urlSignals.product).not.toContain("/q/");
    expect(p.concurrency).toBeLessThan(gomag.concurrency);
  });
});

describe("approvals and prefixes", () => {
  it("stores a well-formed approval and refuses anything else", async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "appr-")), "approved.json");
    expect(await approveCandidate("GoMag|product|/p/", file)).toBe(true);
    expect(await approveCandidate("../x|product|/p/", file)).toBe(false);
    expect(await readApprovals(file)).toEqual(["GoMag|product|/p/"]);
  });

  it("takes the first path segment of deeper URLs only", () => {
    expect(pathPrefixes(["https://s.ro/cumpara/1-a", "https://s.ro/cumpara/2-b", "https://s.ro/flat-product"])).toEqual(["/cumpara/"]);
  });
});
