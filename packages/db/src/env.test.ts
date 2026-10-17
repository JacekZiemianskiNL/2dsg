import { afterEach, describe, expect, it, vi } from "vitest";

import { loadDatabaseEnv } from "./env";

const URL = "postgresql://user:pass@localhost:5432/devmentor";

describe("loadDatabaseEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("reads process.env when no env is passed", () => {
    vi.stubEnv("DATABASE_URL", URL);
    expect(loadDatabaseEnv().url).toBe(URL);
  });

  it("applies defaults when only DATABASE_URL is set", () => {
    expect(loadDatabaseEnv({ DATABASE_URL: URL })).toEqual({
      url: URL,
      pool: { min: 2, max: 10 },
      connectTimeoutMs: 5000,
    });
  });

  it("treats empty optional variables as unset", () => {
    const config = loadDatabaseEnv({ DATABASE_URL: URL, DATABASE_POOL_MAX: "", DATABASE_CONNECT_TIMEOUT_MS: "" });
    expect(config.pool.max).toBe(10);
    expect(config.connectTimeoutMs).toBe(5000);
  });

  it("parses numeric overrides", () => {
    const config = loadDatabaseEnv({ DATABASE_URL: URL, DATABASE_POOL_MIN: "0", DATABASE_POOL_MAX: "4", DATABASE_CONNECT_TIMEOUT_MS: "250" });
    expect(config).toMatchObject({ pool: { min: 0, max: 4 }, connectTimeoutMs: 250 });
  });

  it.each([
    ["missing DATABASE_URL", {}],
    ["non-postgres DATABASE_URL", { DATABASE_URL: "mysql://localhost/db" }],
    ["malformed DATABASE_URL", { DATABASE_URL: "not a url" }],
    ["negative pool size", { DATABASE_URL: URL, DATABASE_POOL_MAX: "-1" }],
    ["non-integer timeout", { DATABASE_URL: URL, DATABASE_CONNECT_TIMEOUT_MS: "1.5" }],
  ])("rejects %s", (_, env) => {
    expect(() => loadDatabaseEnv(env)).toThrow(/Invalid database environment/);
  });

  it("does not echo the connection string in the error", () => {
    expect(() => loadDatabaseEnv({ DATABASE_URL: "mysql://admin:s3cret@db/x" })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining("s3cret") }),
    );
  });
});
