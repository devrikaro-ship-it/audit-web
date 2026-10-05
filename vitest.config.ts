import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname) } },
  test: { environment: "node", include: ["lib/**/*.test.ts", "app/**/*.test.tsx", "modules/**/*.test.{ts,tsx}", "shared/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"] },
});
