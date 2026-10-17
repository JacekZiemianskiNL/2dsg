import type { EntityManager } from "@devmentor/db";
import { describe, expect, it, vi } from "vitest";

import { captureLogs } from "../../testing/captureLogs";
import { ServiceUnavailableError } from "../../http/errors";
import { createLogger } from "../../logger";
import { HealthService } from "./health.service";

function setup(execute: () => Promise<unknown>) {
  const logs = captureLogs();
  const em = { execute: vi.fn(execute) } as unknown as EntityManager;
  return { logs, service: new HealthService({ em, logger: createLogger("info", logs.destination) }) };
}

describe("HealthService.check", () => {
  it("reports ok when the database answers", async () => {
    const { service } = setup(async () => [{ "?column?": 1 }]);
    await expect(service.check()).resolves.toEqual({ status: "ok", db: "ok" });
  });

  it("throws ServiceUnavailableError and logs the cause when the database is down", async () => {
    const { service, logs } = setup(async () => {
      throw new Error("connect ECONNREFUSED 127.0.0.1:5432");
    });
    const error = await service.check().catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ServiceUnavailableError);
    expect((error as ServiceUnavailableError).message).toBe("Database unavailable");
    expect(logs.lines[0]).toMatchObject({ msg: "Database health check failed", err: { message: expect.stringContaining("ECONNREFUSED") } });
  });
});
