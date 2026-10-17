import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { captureLogs } from "./testing/captureLogs";
import { createLogger, getLogger } from "./logger";

describe("createLogger", () => {
  it("redacts secrets at the top level and one level deep", () => {
    const { destination, lines } = captureLogs();
    const logger = createLogger("info", destination);
    logger.info(
      {
        password: "hunter2",
        token: "abc",
        user: { email: "a@b.c", password: "hunter2", jwt: "eyJ.x.y" },
        req: { headers: { authorization: "Bearer eyJ.x.y", cookie: "session=1", accept: "json" } },
      },
      "login",
    );
    const line = lines[0];
    expect(JSON.stringify(line)).not.toMatch(/hunter2|eyJ|session=1|"abc"/);
    expect(line).toMatchObject({
      password: "[REDACTED]",
      token: "[REDACTED]",
      user: { email: "a@b.c", password: "[REDACTED]", jwt: "[REDACTED]" },
      req: { headers: { authorization: "[REDACTED]", cookie: "[REDACTED]", accept: "json" } },
    });
  });

  it("respects the level", () => {
    const { destination, lines } = captureLogs();
    const logger = createLogger("warn", destination);
    logger.info("hidden");
    logger.warn("shown");
    expect(lines.map((line) => line.msg)).toEqual(["shown"]);
  });
});

describe("getLogger", () => {
  const globalForLogger = globalThis as typeof globalThis & { __devmentorLogger?: unknown };

  beforeEach(() => {
    delete globalForLogger.__devmentorLogger;
  });
  afterEach(() => {
    delete globalForLogger.__devmentorLogger;
    vi.unstubAllEnvs();
  });

  it("creates one process-wide logger at LOG_LEVEL and reuses it", () => {
    vi.stubEnv("LOG_LEVEL", "debug");
    const logger = getLogger(captureLogs().destination);
    expect(logger.level).toBe("debug");
    expect(getLogger()).toBe(logger);
  });

  it("falls back to info and warns when LOG_LEVEL is invalid", () => {
    vi.stubEnv("LOG_LEVEL", "chatty");
    const { destination, lines } = captureLogs();
    const logger = getLogger(destination);
    expect(logger.level).toBe("info");
    expect(lines).toEqual([expect.objectContaining({ level: 40, msg: "Invalid LOG_LEVEL; using info" })]);
  });
});
