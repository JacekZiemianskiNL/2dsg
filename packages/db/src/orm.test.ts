import { MikroORM } from "@mikro-orm/postgresql";
import { afterEach, describe, expect, it, vi } from "vitest";

import { closeOrm, getOrm } from "./orm";

const config = { url: "postgresql://db/app", pool: { min: 0, max: 1 }, connectTimeoutMs: 100 };
const globalForOrm = globalThis as typeof globalThis & { __devmentorOrm?: unknown };

function fakeOrm() {
  return { close: vi.fn(async () => {}) } as unknown as MikroORM;
}

afterEach(() => {
  delete globalForOrm.__devmentorOrm;
  vi.restoreAllMocks();
});

describe("getOrm", () => {
  it("initializes once per process and reuses the instance", async () => {
    const orm = fakeOrm();
    const init = vi.spyOn(MikroORM, "init").mockResolvedValue(orm);
    expect(await getOrm(config)).toBe(orm);
    expect(await getOrm(config)).toBe(orm);
    expect(init).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith(expect.objectContaining({ clientUrl: config.url }));
  });

  it("forgets a failed initialization so the next call retries", async () => {
    const orm = fakeOrm();
    const init = vi.spyOn(MikroORM, "init").mockRejectedValueOnce(new Error("discovery failed")).mockResolvedValue(orm);
    await expect(getOrm(config)).rejects.toThrow("discovery failed");
    expect(await getOrm(config)).toBe(orm);
    expect(init).toHaveBeenCalledTimes(2);
  });
});

describe("closeOrm", () => {
  it("closes the pool and forgets the instance", async () => {
    const orm = fakeOrm();
    const init = vi.spyOn(MikroORM, "init").mockResolvedValue(orm);
    await getOrm(config);
    await closeOrm();
    expect(orm.close).toHaveBeenCalledOnce();
    await getOrm(config);
    expect(init).toHaveBeenCalledTimes(2);
  });

  it("does nothing when no instance exists", async () => {
    await expect(closeOrm()).resolves.toBeUndefined();
  });
});
