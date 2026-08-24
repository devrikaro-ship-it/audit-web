export type PublicOutputPlaceholder = {
  kind: "account" | "product" | "amount" | "identifier";
  value: string;
  locations: readonly string[];
};

const observableAttributes = new Set([
  "action", "alt", "aria-label", "aria-labelledby", "data-application-behavior",
  "data-mutation-behavior", "data-permission-capability", "data-provider-scope",
  "data-public-oauth-surface", "href", "name", "role", "title", "type", "value",
]);

function normalizedSpace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function normalizePublicOutput(html: string, placeholders: PublicOutputPlaceholder[] = []): string {
  const locationOwners = new Map<string, PublicOutputPlaceholder>();
  const seen = new Set<string>();
  for (const placeholder of placeholders) {
    if (!placeholder.value || !placeholder.locations.length) throw new Error("A public-output placeholder requires a nonempty value and at least one structural location");
    for (const location of placeholder.locations) {
      if (locationOwners.has(location)) throw new Error(`Public-output placeholder collision at ${location}`);
      locationOwners.set(location, placeholder);
    }
  }

  const lines: string[] = [];
  const stack: Array<{ path: string; children: Map<string, number> }> = [{ path: "root", children: new Map() }];
  const ignored: string[] = [];
  const tokens = html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) ?? [];
  const replaceAt = (raw: string, location: string) => {
    const value = normalizedSpace(raw);
    const placeholder = locationOwners.get(location);
    if (!placeholder) return value;
    const parts = value.split(placeholder.value);
    if (parts.length !== 2) throw new Error(`Placeholder at ${location} must match its source exactly once`);
    seen.add(location);
    return parts.join(`<${placeholder.kind.toUpperCase()}>`);
  };

  for (const token of tokens) {
    if (token.startsWith("<!--")) continue;
    if (token.startsWith("</")) {
      const tag = token.slice(2).split(/[\s>]/, 1)[0].toLowerCase();
      if (ignored.at(-1) === tag) ignored.pop();
      else if (!ignored.length && stack.length > 1) stack.pop();
      continue;
    }
    if (token.startsWith("<")) {
      const match = token.match(/^<\s*([\w-]+)/);
      if (!match || ignored.length) continue;
      const tag = match[1].toLowerCase();
      if (tag === "script" || tag === "style") { ignored.push(tag); continue; }
      const parent = stack.at(-1)!;
      const index = parent.children.get(tag) ?? 0;
      parent.children.set(tag, index + 1);
      const path = `${parent.path}/${tag}[${index}]`;
      const attributes: string[] = [];
      const attributePattern = /([^\s=/>]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
      attributePattern.lastIndex = match[0].length;
      let attributeMatch: RegExpExecArray | null;
      while ((attributeMatch = attributePattern.exec(token))) {
        const name = attributeMatch[1].toLowerCase();
        if (!observableAttributes.has(name) && !name.startsWith("aria-")) continue;
        const value = replaceAt(attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? "", `${path}@${name}`);
        attributes.push(`${name}=${JSON.stringify(value)}`);
      }
      lines.push(`${path}${attributes.length ? ` ${attributes.join(" ")}` : ""}`);
      if (!token.endsWith("/>") && !["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"].includes(tag)) stack.push({ path, children: new Map() });
      continue;
    }
    if (ignored.length) continue;
    const text = replaceAt(token, `${stack.at(-1)!.path}/text`);
    if (text) lines.push(`${stack.at(-1)!.path}/text ${JSON.stringify(text)}`);
  }

  for (const location of locationOwners.keys()) if (!seen.has(location)) throw new Error(`Public-output placeholder location was not observed: ${location}`);
  return lines.join("\n");
}

export function normalizePublicMetadata(metadata: Record<string, unknown>): string {
  return Object.entries(metadata).sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n");
}

export async function normalizePublicResponse(response: Response): Promise<string> {
  const headers = [...response.headers.entries()]
    .filter(([name]) => ["content-type", "location", "set-cookie"].includes(name.toLowerCase()))
    .map(([name, value]) => `${name.toLowerCase()}=${value.replace(/gads_session=[^;]+/g, "gads_session=<SESSION>").replace(/gads_state=[^;]+/g, "gads_state=<STATE>").replace(/Expires=[^;]+/g, "Expires=<EXPIRY>")}`)
    .sort();
  return [`status=${response.status}`, ...headers, `body=${JSON.stringify(await response.clone().text())}`].join("\n");
}
