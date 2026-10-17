import { defineConfig } from "vitest/config";

// Integration tests: real PostgreSQL (Testcontainers), the built app (`next start`) and a real
// browser (agent-browser). Run `npm run build` first; see test/integration/global-setup.ts.
export default defineConfig({
  test: {
    name: "integration",
    include: ["test/integration/**/*.test.ts"],
    environment: "node",
    globalSetup: ["test/integration/global-setup.ts"],
    // Tests share one app instance and one browser session.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 180_000,
  },
});
