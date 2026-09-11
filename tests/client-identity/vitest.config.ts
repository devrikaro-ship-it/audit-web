import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd()),
      "server-only": path.resolve(
        process.cwd(),
        "node_modules/next/dist/compiled/server-only/empty.js",
      ),
    },
  },
  test: {
    environment: "node",
    include: ["tests/client-identity/**/*.test.ts", "tests/client-identity/**/*.test.tsx"],
    fileParallelism: false,
  },
});
