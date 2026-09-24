import { describe, expect, it } from "vitest";
import { hasRobotsRules, isAllowed } from "./robots-rules";

describe("isAllowed", () => {
  const robots = `User-agent: *
Disallow: /cos/
Disallow: /*?orderby=
Allow: /cos/ajutor$

User-agent: GPTBot
Disallow: /

User-agent: OAI-SearchBot
User-agent: PerplexityBot
Allow: /
Disallow: /cont/

Sitemap: https://s.ro/sitemap.xml`;

  it("uses the group of the named robot, else the * group", () => {
    expect(isAllowed(robots, "GPTBot", "/gantere/")).toBe(false);
    expect(isAllowed(robots, "OAI-SearchBot", "/gantere/")).toBe(true);
    expect(isAllowed(robots, "PerplexityBot", "/cont/date")).toBe(false);
    expect(isAllowed(robots, "Googlebot", "/cos/")).toBe(false);
    expect(isAllowed(robots, "Googlebot", "/gantere/")).toBe(true);
  });

  it("applies the longest matching rule, with * and $ wildcards", () => {
    expect(isAllowed(robots, "Googlebot", "/cos/ajutor")).toBe(true);
    expect(isAllowed(robots, "Googlebot", "/cos/ajutor/x")).toBe(false);
    expect(isAllowed(robots, "Googlebot", "/gantere/?orderby=price")).toBe(false);
  });

  it("picks the longest rule whatever the order of the lines", () => {
    expect(isAllowed("User-agent: *\nDisallow: /a\nAllow: /a/b", "Googlebot", "/a/b/x")).toBe(true);
    expect(isAllowed("User-agent: *\nAllow: /q/r\nDisallow: /q", "Googlebot", "/q/r/x")).toBe(true);
    expect(isAllowed("User-agent: *\nAllow: /q/r\nDisallow: /q", "Googlebot", "/q/s")).toBe(false);
  });

  it("allows everything when there are no rules, and ignores an empty Disallow", () => {
    expect(isAllowed("", "Googlebot", "/")).toBe(true);
    expect(isAllowed("User-agent: *\nDisallow:", "Googlebot", "/")).toBe(true);
    expect(isAllowed("User-agent: *\nDisallow: /", "Bingbot", "/")).toBe(false);
  });

  it("recognises a robots.txt, not an HTML error page", () => {
    expect(hasRobotsRules(robots)).toBe(true);
    expect(hasRobotsRules("<html><body>404</body></html>")).toBe(false);
  });
});
