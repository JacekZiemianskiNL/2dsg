import { afterEach, describe, expect, it, vi } from "vitest";

const { main } = vi.hoisted(() => ({ main: vi.fn(async () => 3) }));
vi.mock("./lib/with-env.mjs", () => ({ main }));

afterEach(() => {
  process.exitCode = undefined;
});

describe("with-env entry point", () => {
  it("sets the process exit code from the wrapped command", async () => {
    await import("./with-env.mjs");
    expect(main).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(3);
  });
});
