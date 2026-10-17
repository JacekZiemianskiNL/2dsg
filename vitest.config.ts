import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // `server-only` throws outside the react-server condition; tests import server modules directly.
      "server-only": fromRoot("./test/stubs/server-only.ts"),
      // next/font downloads fonts at build time; tests only need the returned class names.
      "next/font/google": fromRoot("./test/stubs/next-font-google.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    projects: [
      { extends: true, test: { name: "core", root: fromRoot("./packages/core"), environment: "node" } },
      { extends: true, test: { name: "db", root: fromRoot("./packages/db"), environment: "node" } },
      {
        extends: true,
        test: { name: "ui", root: fromRoot("./packages/ui"), environment: "jsdom", setupFiles: [fromRoot("./test/setup-dom.ts")] },
      },
      {
        extends: true,
        resolve: { alias: { "@/": fromRoot("./packages/app/src/") } },
        test: { name: "app", root: fromRoot("./packages/app"), environment: "jsdom", setupFiles: [fromRoot("./test/setup-dom.ts")] },
      },
      {
        extends: true,
        test: { name: "tooling", root: fromRoot("./scripts"), environment: "node", include: ["**/*.test.mjs"] },
      },
    ],
    coverage: {
      provider: "v8",
      // Every source file counts, including ones no test imports yet.
      include: ["packages/*/src/**/*.{ts,tsx}", "scripts/**/*.mjs"],
      exclude: ["**/*.test.{ts,tsx,mjs}", "**/src/testing/**", "**/*.d.ts"],
      reporter: ["text", "html", "lcov", "json", "json-summary"],
      reportsDirectory: fromRoot("./coverage"),
      // Engineering standard: 100% unit coverage. Never lower these or add v8-ignore comments to pass.
      thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
    },
  },
});
