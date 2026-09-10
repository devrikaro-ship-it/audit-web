const path = require("node:path") as typeof import("node:path");
const { defineConfig } = require("vitest/config") as typeof import("vitest/config");

module.exports = defineConfig({
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
    fileParallelism: false,
    include: ["tests/client-identity/http-auth.test.ts"],
  },
});
