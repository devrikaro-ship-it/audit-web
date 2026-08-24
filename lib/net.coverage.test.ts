import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchPSI,
  fetchPage,
  fetchText,
  googleAdsSearch,
  measureTTFB,
  probeProductFeed,
} from "./net";

const auth = { accessToken: "access", developerToken: "developer", loginCustomerId: "123-456" };

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete process.env.PAGESPEED_API_KEY;
});

describe("network helpers in the public output graph", () => {
  it("paginates Google Ads searches and normalizes customer identifiers", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ results: [{ id: 1 }], nextPageToken: "next" }))
      .mockResolvedValueOnce(Response.json({ results: [{ id: 2 }] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(googleAdsSearch("111-222", "SELECT value", auth)).resolves.toEqual([{ id: 1 }, { id: 2 }]);
    expect(fetchMock.mock.calls[0][0]).toContain("111222");
    expect(fetchMock.mock.calls[0][1].headers["login-customer-id"]).toBe("123456");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ pageToken: "next" });
  });

  it("fails fast for permanent requests and retries transient response and fetch failures", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bad request", { status: 400 })));
    await expect(googleAdsSearch("123", "bad", { accessToken: "a", developerToken: "d" })).rejects.toThrow("400");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400, text: async () => { throw new Error("body unavailable"); } })));
    await expect(googleAdsSearch("123", "bad", { accessToken: "a", developerToken: "d" })).rejects.toThrow("400");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
    await expect(googleAdsSearch("123", "empty", { accessToken: "a", developerToken: "d" })).resolves.toEqual([]);

    vi.useFakeTimers();
    const transient = vi.fn()
      .mockRejectedValueOnce("offline")
      .mockResolvedValueOnce(new Response("INTERNAL", { status: 500 }))
      .mockResolvedValueOnce(Response.json({ results: [] }));
    vi.stubGlobal("fetch", transient);
    const result = googleAdsSearch("123", "retry", { accessToken: "a", developerToken: "d" });
    await vi.runAllTimersAsync();
    await expect(result).resolves.toEqual([]);
    expect(transient).toHaveBeenCalledTimes(3);

    const errorThenSuccess = vi.fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json({ results: [] }));
    vi.stubGlobal("fetch", errorThenSuccess);
    const recovered = googleAdsSearch("123", "retry", { accessToken: "a", developerToken: "d" });
    await vi.runAllTimersAsync();
    await expect(recovered).resolves.toEqual([]);

    const exhausted = vi.fn().mockResolvedValue(new Response("rate", { status: 429 }));
    vi.stubGlobal("fetch", exhausted);
    const failure = googleAdsSearch("123", "retry", { accessToken: "a", developerToken: "d" });
    const failureExpectation = expect(failure).rejects.toThrow("429");
    await vi.runAllTimersAsync();
    await failureExpectation;
  });

  it("queues the fifth simultaneous Google request until one slot is released", async () => {
    const releases: Array<() => void> = [];
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => releases.push(() => resolve(Response.json({ results: [] })))));
    vi.stubGlobal("fetch", fetchMock);
    const requests = Array.from({ length: 5 }, (_, index) => googleAdsSearch(String(index), "query", auth));
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    releases.shift()?.();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    while (releases.length) releases.shift()?.();
    await expect(Promise.all(requests)).resolves.toEqual([[], [], [], [], []]);
  });

  it("returns text, page metadata, timing, and their recoverable failures", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("text", { status: 200 }))
      .mockResolvedValueOnce(new Response("ignored", { status: 404 }))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response("<html></html>", { status: 200, headers: { "X-Test": "yes" } }))
      .mockResolvedValueOnce(new Response("ignored", { status: 404 }))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(new Response("", { status: 200 }))
      .mockRejectedValueOnce(new Error("offline")));
    await expect(fetchText("https://example.test/one")).resolves.toBe("text");
    await expect(fetchText("https://example.test/two")).resolves.toBe("");
    await expect(fetchText("https://example.test/three")).resolves.toBe("");
    await expect(fetchPage("https://example.test/page")).resolves.toMatchObject({ html: "<html></html>", status: 200, headers: { "x-test": "yes" }, ok: true });
    await expect(fetchPage("https://example.test/missing")).resolves.toMatchObject({ html: "", status: 404, ok: false });
    await expect(fetchPage("https://example.test/offline")).resolves.toMatchObject({ status: 0, ok: false });
    await expect(measureTTFB("https://example.test/timing")).resolves.toEqual(expect.any(Number));
    await expect(measureTTFB("https://example.test/offline")).resolves.toBeNull();
  });

  it("probes fulfilled, rejected, false feeds and every PSI response shape", async () => {
    let feedCall = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      feedCall++;
      if (feedCall === 1) return new Response("", { status: 200 });
      if (feedCall === 2) throw new Error("offline");
      return new Response("", { status: 404 });
    }));
    await expect(probeProductFeed("https://example.test")).resolves.toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 404 })));
    await expect(probeProductFeed("https://example.test")).resolves.toBe(false);

    process.env.PAGESPEED_API_KEY = "key";
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response("", { status: 429 }))
      .mockResolvedValueOnce(Response.json({ lighthouseResult: { categories: { performance: { score: 0.91 } }, audits: {
        "largest-contentful-paint": { displayValue: "1 s" },
        "cumulative-layout-shift": { displayValue: "0.1" },
        "total-blocking-time": { displayValue: "10 ms" },
      } } }))
      .mockResolvedValueOnce(Response.json({}))
      .mockRejectedValueOnce(new Error("offline")));
    await expect(fetchPSI("https://example.test", "mobile")).resolves.toBeNull();
    await expect(fetchPSI("https://example.test", "desktop")).resolves.toEqual({ score: 91, lcp: "1 s", cls: "0.1", tbt: "10 ms" });
    await expect(fetchPSI("https://example.test", "mobile")).resolves.toEqual({ score: 0, lcp: "—", cls: "—", tbt: "—" });
    await expect(fetchPSI("https://example.test", "mobile")).resolves.toBeNull();
  });
});
