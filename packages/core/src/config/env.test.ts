import { describe, expect, it } from "vitest";

import { loadConfig } from "./env";

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
