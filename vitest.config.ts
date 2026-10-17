import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    // `server-only` throws outside the react-server condition; tests import server modules directly.
    alias: { "server-only": fromRoot("./test/stubs/server-only.ts") },
  },
  test: {
    projects: [
      { extends: true, test: { name: "core", root: fromRoot("./packages/core"), environment: "node" } },
      { extends: true, test: { name: "db", root: fromRoot("./packages/db"), environment: "node" } },
      {
        extends: true,
        test: {
          name: "ui",
          root: fromRoot("./packages/ui"),
          environment: "jsdom",
          setupFiles: [fromRoot("./test/setup-dom.ts")],
        },
      },
    ],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
