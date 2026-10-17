import { describe, expect, it } from "vitest";

import { captureLogs } from "./testing/captureLogs";
import { createLogger } from "./logger";

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
