import { afterEach, describe, expect, it, vi } from "vitest";
import { BROWSER_UA, fetchPage, fetchText } from "./net";

afterEach(() => vi.unstubAllGlobals());
const seq = (...answers: (number | "timeout")[]) => {
  const calls: { ua: string | null }[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_u: string, init?: RequestInit) => {
    calls.push({ ua: new Headers(init?.headers).get("user-agent") });
    const a = answers[Math.min(calls.length - 1, answers.length - 1)];
    if (a === "timeout") throw new DOMException("aborted", "AbortError");
    return new Response(a === 200 ? "ok body" : "", { status: a });
  }));
  return calls;
};

describe("requests to the audited site", () => {
  it("present themselves as a real browser, the same on every request", async () => {
    const calls = seq(200);
    await fetchText("https://s.ro/robots.txt");
    await fetchPage("https://s.ro/");
    expect(BROWSER_UA).toMatch(/Mozilla\/5\.0 .*Chrome\//);
    expect(calls.map((c) => c.ua)).toEqual([BROWSER_UA, BROWSER_UA]);
  });

  it("retry a server error and a timeout, then read the page", async () => {
    seq(503, "timeout", 200);
    expect(await fetchText("https://s.ro/sitemap.xml")).toBe("ok body");
  });

  it("do not retry a page that does not exist or is forbidden", async () => {
    const calls = seq(404);
    expect((await fetchPage("https://s.ro/x")).status).toBe(404);
    const forbidden = seq(403);
    await fetchPage("https://s.ro/y");
    expect([calls.length, forbidden.length]).toEqual([1, 1]);
  });
});
