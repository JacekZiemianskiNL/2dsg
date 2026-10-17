import type { EntityManager } from "@mikro-orm/postgresql";
import { describe, expect, it, vi } from "vitest";

import { pingDatabase } from "./health";

describe("pingDatabase", () => {
  it("runs a trivial query", async () => {
    const execute = vi.fn(async () => [{ "?column?": 1 }]);
    await pingDatabase({ execute } as unknown as EntityManager);
    expect(execute).toHaveBeenCalledWith("select 1");
  });

  it("rejects when the database can't be reached", async () => {
    const execute = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(pingDatabase({ execute } as unknown as EntityManager)).rejects.toThrow("ECONNREFUSED");
  });
});
