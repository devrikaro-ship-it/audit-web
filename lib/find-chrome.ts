// Headless Chrome/Chromium for printing the report to PDF: CHROME_PATH first, then known install paths, then PATH
// (the production image gets Chromium from nixpacks, under /nix/var/nix/profiles/default/bin).
import { existsSync } from "node:fs";
import path from "node:path";

const KNOWN = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser",
];
const ON_PATH = ["chromium", "chromium-browser", "google-chrome-stable", "google-chrome"];

export function findChrome(env: Record<string, string | undefined> = process.env, exists: (p: string) => boolean = existsSync): string | null {
  if (env.CHROME_PATH && exists(env.CHROME_PATH)) return env.CHROME_PATH;
  const known = KNOWN.find((p) => exists(p));
  if (known) return known;
  for (const dir of (env.PATH ?? "").split(path.delimiter).filter(Boolean)) {
    for (const name of ON_PATH) {
      const candidate = path.join(dir, name);
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}
