import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

const root = __dirname;
const manifest = JSON.parse(fs.readFileSync(path.join(root, "app/public-output-reachable-files.json"), "utf8")) as { files: string[] };

export default defineConfig({
  resolve: { alias: { "@": root } },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: manifest.files,
      reporter: ["text", "json", "json-summary"],
      reportsDirectory: "coverage/public-output",
      thresholds: { branches: 100 },
    },
  },
});
