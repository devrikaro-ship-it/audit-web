import { readFile } from "node:fs/promises";
import { join } from "node:path";

// The report's @font-face rules with each font file inlined, loaded only by the page Chromium prints to PDF: the
// printed PDF then never depends on the font files arriving in time (production PDFs came out in a fallback font).
// The rules come from report-deck.css, the one place the report's fonts are declared.
export async function GET(): Promise<Response> {
  const root = process.cwd();
  const css = await readFile(join(root, "app/r/report-deck.css"), "utf8");
  const faces = css.match(/@font-face\{[^}]*\}/g) ?? [];
  const inlined = await Promise.all(faces.map(async (face) => {
    const file = face.match(/url\(\/fonts\/([a-z0-9-]+\.woff2)\)/)?.[1];
    if (!file) return face;
    const data = (await readFile(join(root, "public/fonts", file))).toString("base64");
    return face.replace(`url(/fonts/${file})`, `url(data:font/woff2;base64,${data})`);
  }));
  return new Response(inlined.join("\n"), { headers: { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
