import { afterEach, describe, expect, it, vi } from "vitest";

const { main } = vi.hoisted(() => ({ main: vi.fn(async () => 1) }));
vi.mock("./lib/setup.mjs", () => ({ main }));

afterEach(() => {
  process.exitCode = undefined;
});

describe("npm run setup entry point", () => {
  it("sets the process exit code from the setup run", async () => {
    await import("./setup.mjs");
    expect(main).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(1);
  });
});
