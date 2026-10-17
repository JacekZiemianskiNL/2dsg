import { afterEach, describe, expect, it, vi } from "vitest";

import { loadConfig, loadLogLevel } from "./env";

const DATABASE_URL = "postgres://localhost:5432/devmentor";

describe("loadConfig", () => {
  it("composes the database settings with app-level settings", () => {
    const config = loadConfig({ DATABASE_URL, LOG_LEVEL: "debug" });
    expect(config.logLevel).toBe("debug");
    expect(config.database.url).toBe(DATABASE_URL);
  });

  it("defaults LOG_LEVEL to info, also when empty", () => {
    expect(loadConfig({ DATABASE_URL }).logLevel).toBe("info");
    expect(loadConfig({ DATABASE_URL, LOG_LEVEL: "" }).logLevel).toBe("info");
  });

  it("rejects an unknown log level", () => {
    expect(() => loadConfig({ DATABASE_URL, LOG_LEVEL: "verbose" })).toThrow(/Invalid environment/);
  });

  it("rejects an invalid database environment", () => {
    expect(() => loadConfig({ LOG_LEVEL: "info" })).toThrow(/Invalid database environment/);
  });
});

describe("loadLogLevel", () => {
  it("validates LOG_LEVEL on its own, without database settings", () => {
    expect(loadLogLevel({ LOG_LEVEL: "warn" })).toBe("warn");
    expect(loadLogLevel({})).toBe("info");
    expect(() => loadLogLevel({ LOG_LEVEL: "loud" })).toThrow(/Invalid environment/);
  });
});

describe("defaults to process.env", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads process.env when no env is passed", () => {
    vi.stubEnv("DATABASE_URL", DATABASE_URL);
    vi.stubEnv("LOG_LEVEL", "error");
    expect(loadLogLevel()).toBe("error");
    expect(loadConfig()).toMatchObject({ logLevel: "error", database: { url: DATABASE_URL } });
  });
});
