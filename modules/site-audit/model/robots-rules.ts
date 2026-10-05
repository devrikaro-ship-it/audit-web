// robots.txt as crawlers read it (RFC 9309): the group of the most specific matching user-agent, else "*"; within
// it the longest matching rule wins, Allow on a tie; "*" and "$" wildcards in paths.
type Rule = { allow: boolean; path: string };
type Group = { agents: string[]; rules: Rule[] };

function parse(robotsTxt: string): Group[] {
  const groups: Group[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) { current = { agents: [], rules: [] }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      if (value) current.rules.push({ allow: key === "allow", path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  return groups;
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = (anchored ? pattern.slice(0, -1) : pattern).split("*").map((s) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`).test(path);
}

export function hasRobotsRules(robotsTxt: string): boolean {
  return /^\s*user-agent\s*:/im.test(robotsTxt);
}

export function isAllowed(robotsTxt: string, userAgent: string, path: string): boolean {
  const groups = parse(robotsTxt);
  const ua = userAgent.toLowerCase();
  const best = groups.flatMap((g) => g.agents).filter((a) => a !== "*" && ua.includes(a)).sort((a, b) => b.length - a.length)[0] ?? "*";
  const group = groups.filter((g) => g.agents.includes(best));
  const rules = group.flatMap((g) => g.rules).filter((r) => matches(r.path, path));
  if (!rules.length) return true;
  rules.sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return rules[0].allow;
}
