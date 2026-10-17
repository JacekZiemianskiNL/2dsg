import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("MikroORM CLI config", () => {
  it("builds the ORM config from the environment", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://cli@localhost:5432/devmentor");
    const { default: config } = await import("./mikro-orm.config");
    expect(config.clientUrl).toBe("postgresql://cli@localhost:5432/devmentor");
  });

  it("fails fast on an invalid environment", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(import("./mikro-orm.config")).rejects.toThrow(/Invalid database environment/);
  });
});
