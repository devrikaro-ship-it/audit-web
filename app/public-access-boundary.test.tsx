import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import HubPage from "@/app/hub/page";
import PrivacyPage from "@/app/confidentialitate/page";
import TermsPage from "@/app/termeni/page";

const decode = (codes: number[]) => String.fromCharCode(...codes);
const permissionTerms = [
  decode([97, 99, 99, 101, 115]),
  decode([100, 114, 101, 112, 116]),
  decode([112, 101, 114, 109, 105, 115, 105, 117, 110, 101]),
];
const readOnlyTerms = [decode([99, 105, 116, 105, 114, 101]), "read-only"];

function permissionLevelReadOnlyClaims(text: string): string[] {
  return text
    .toLocaleLowerCase("ro-RO")
    .split(/[.!?]/)
    .filter((sentence) =>
      permissionTerms.some((term) => sentence.includes(term))
      && readOnlyTerms.some((term) => sentence.includes(term)),
    );
}

function publicCopySources(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return publicCopySources(entryPath);
    return entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")
      ? [fs.readFileSync(entryPath, "utf8")]
      : [];
  });
}

describe("public Google Ads access boundary", () => {
  it("does not describe OAuth permissions or account access as read-only in public source", () => {
    const claims = ["app", "components"]
      .flatMap((directory) => publicCopySources(path.join(process.cwd(), directory)))
      .flatMap(permissionLevelReadOnlyClaims);

    expect(claims).toEqual([]);
  });

  it.each([
    ["hub", <HubPage key="hub" />],
    ["privacy", <PrivacyPage key="privacy" />],
    ["terms", <TermsPage key="terms" />],
  ])("keeps the %s surface clear of permission-level read-only claims", (_name, page) => {
    expect(permissionLevelReadOnlyClaims(renderToStaticMarkup(page))).toEqual([]);
  });

  it("states the broad Google Ads scope separately from application behavior", () => {
    const privacy = renderToStaticMarkup(<PrivacyPage />).toLocaleLowerCase("ro-RO");
    const noMutation = decode([110, 117, 32, 112, 117, 116, 101, 109, 32, 102, 97, 99, 101, 32, 110, 105, 99, 105, 111, 32, 109, 111, 100, 105, 102, 105, 99, 97, 114, 101]);

    expect(privacy).toContain("adwords");
    expect(privacy).toContain(noMutation);
  });
});
