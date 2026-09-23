import { describe, expect, it } from "vitest";
import { findChrome, internalReportUrl } from "./find-chrome";

describe("findChrome", () => {
  it("finds Chromium on PATH, where the production image installs it", () => {
    const bin = "/nix/var/nix/profiles/default/bin";
    expect(findChrome({ PATH: `${bin}:/usr/bin` }, (p) => p === `${bin}/chromium`)).toBe(`${bin}/chromium`);
  });
  it("prefers CHROME_PATH when it exists", () => {
    expect(findChrome({ CHROME_PATH: "/opt/c", PATH: "/usr/bin" }, (p) => p === "/opt/c" || p === "/usr/bin/chromium")).toBe("/opt/c");
  });
  it("returns null when no browser exists", () => {
    expect(findChrome({ PATH: "/bin" }, () => false)).toBeNull();
  });
});

describe("internalReportUrl", () => {
  it("prints from inside the container over plain HTTP, never the public https origin", () => {
    expect(internalReportUrl("abc", "3000", "")).toBe("http://127.0.0.1:3000/r/abc?print=1");
    expect(internalReportUrl("abc", undefined, "3917")).toBe("http://127.0.0.1:3917/r/abc?print=1");
  });
});
