export type PublicOutputPlaceholder = {
  kind: "account" | "product" | "amount" | "identifier";
  value: string;
  occurrences: number;
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
  const placeholderByValue = new Map<string, PublicOutputPlaceholder>();
  const seen = new Map<PublicOutputPlaceholder, number>();
  for (const placeholder of placeholders) {
    if (!placeholder.value || placeholder.occurrences < 1) throw new Error("A public-output placeholder requires a nonempty value and positive occurrence count");
    if (placeholderByValue.has(placeholder.value)) throw new Error(`Public-output placeholder collision: ${placeholder.value}`);
    placeholderByValue.set(placeholder.value, placeholder);
    seen.set(placeholder, 0);
  }

  const lines: string[] = [];
  const stack: Array<{ path: string; children: Map<string, number> }> = [{ path: "root", children: new Map() }];
  const ignored: string[] = [];
  const tokens = html.match(/<!--[\s\S]*?-->|<[^>]+>|[^<]+/g) ?? [];
  const replaceExact = (raw: string) => {
    const value = normalizedSpace(raw);
    let output = value;
    for (const placeholder of [...placeholders].sort((left, right) => right.value.length - left.value.length)) {
      const parts = output.split(placeholder.value);
      const matches = parts.length - 1;
      if (!matches) continue;
      seen.set(placeholder, (seen.get(placeholder) ?? 0) + matches);
      output = parts.join(`<${placeholder.kind.toUpperCase()}>`);
    }
    return output;
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
        const value = replaceExact(attributeMatch[2] ?? attributeMatch[3] ?? attributeMatch[4] ?? "");
        attributes.push(`${name}=${JSON.stringify(value)}`);
      }
      lines.push(`${path}${attributes.length ? ` ${attributes.join(" ")}` : ""}`);
      if (!token.endsWith("/>") && !["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"].includes(tag)) stack.push({ path, children: new Map() });
      continue;
    }
    if (ignored.length) continue;
    const text = replaceExact(token);
    if (text) lines.push(`${stack.at(-1)!.path}/text ${JSON.stringify(text)}`);
  }

  for (const placeholder of placeholders) {
    const actual = seen.get(placeholder) ?? 0;
    if (actual !== placeholder.occurrences) throw new Error(`Placeholder <${placeholder.kind.toUpperCase()}> for ${JSON.stringify(placeholder.value)} expected ${placeholder.occurrences} occurrences but saw ${actual}`);
  }
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
