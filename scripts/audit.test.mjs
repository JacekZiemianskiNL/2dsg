import { afterEach, describe, expect, it, vi } from "vitest";

const { main } = vi.hoisted(() => ({ main: vi.fn(() => 1) }));
vi.mock("./lib/audit-gate.mjs", () => ({ main }));

afterEach(() => {
  process.exitCode = undefined;
});

describe("npm run audit entry point", () => {
  it("sets the process exit code from the gate", async () => {
    await import("./audit.mjs");
    expect(main).toHaveBeenCalledOnce();
    expect(process.exitCode).toBe(1);
  });
});
