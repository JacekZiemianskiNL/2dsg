import type { MikroORM } from "@devmentor/db";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getOrm } = vi.hoisted(() => ({ getOrm: vi.fn<(config: unknown) => Promise<MikroORM>>() }));
vi.mock("@devmentor/db", async (importOriginal) => ({ ...(await importOriginal<typeof import("@devmentor/db")>()), getOrm }));

const DATABASE_URL = "postgresql://localhost:5432/devmentor";

function fakeOrm() {
  let forks = 0;
  return { em: { fork: vi.fn(() => ({ fork: ++forks })) } } as unknown as MikroORM;
}

async function loadContainerModule() {
  vi.resetModules();
  return import("./container");
}

beforeEach(() => {
  vi.stubEnv("DATABASE_URL", DATABASE_URL);
  getOrm.mockReset();
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("container", () => {
  it("registers config, logger, orm, a scoped em and scoped services", async () => {
    const orm = fakeOrm();
    getOrm.mockResolvedValue(orm);
    const { withScope } = await loadContainerModule();
    const { HealthService } = await import("../services/health/health.service");

    const resolved = await withScope(async ({ config, logger, orm: scopedOrm, em, healthService }) => ({ config, logger, scopedOrm, em, healthService }));
    expect(resolved.config.database.url).toBe(DATABASE_URL);
    expect(typeof resolved.logger.info).toBe("function");
    expect(resolved.scopedOrm).toBe(orm);
    expect(resolved.healthService).toBeInstanceOf(HealthService);
    expect(getOrm).toHaveBeenCalledWith(expect.objectContaining({ url: DATABASE_URL }));
  });

  it("forks one EntityManager per scope and reuses it within the scope", async () => {
    getOrm.mockResolvedValue(fakeOrm());
    const { withScope } = await loadContainerModule();
    const [first, again] = await withScope(async (cradle) => [cradle.em, cradle.em]);
    const second = await withScope(async (cradle) => cradle.em);
    expect(first).toBe(again);
    expect(second).not.toBe(first);
  });

  it("builds the container once and caches it", async () => {
    getOrm.mockResolvedValue(fakeOrm());
    const { getContainer } = await loadContainerModule();
    const container = await getContainer();
    expect(await getContainer()).toBe(container);
    expect(getOrm).toHaveBeenCalledOnce();
  });

  it("retries the build after a failure instead of caching it", async () => {
    getOrm.mockRejectedValueOnce(new Error("bad config")).mockResolvedValue(fakeOrm());
    const { getContainer } = await loadContainerModule();
    await expect(getContainer()).rejects.toThrow("bad config");
    await expect(getContainer()).resolves.toBeDefined();
    expect(getOrm).toHaveBeenCalledTimes(2);
  });

  it("disposes the scope after the callback, also when it throws", async () => {
    getOrm.mockResolvedValue(fakeOrm());
    const { getContainer, withScope } = await loadContainerModule();
    const container = await getContainer();
    const dispose = vi.fn(async () => {});
    const createScope = container.createScope.bind(container);
    vi.spyOn(container, "createScope").mockImplementation(() => Object.assign(createScope(), { dispose }));

    await expect(withScope(async () => "done")).resolves.toBe("done");
    await expect(
      withScope(async () => {
        throw new Error("handler failed");
      }),
    ).rejects.toThrow("handler failed");
    expect(dispose).toHaveBeenCalledTimes(2);
  });
});
