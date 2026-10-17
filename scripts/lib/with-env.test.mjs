import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { constants, tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { exitCodeFor, main } from "./with-env.mjs";

/** A fake `spawn` whose child emits the given event once the listeners are attached. */
function fakeRun(/** @type {(child: EventEmitter) => void} */ emit) {
  return vi.fn(() => {
    const child = new EventEmitter();
    queueMicrotask(() => emit(child));
    return child;
  });
}

describe("exitCodeFor", () => {
  it("passes the child's exit code through", () => {
    expect(exitCodeFor(0, null)).toBe(0);
    expect(exitCodeFor(4, null)).toBe(4);
  });

  it("maps a terminating signal to 128 + its number", () => {
    expect(exitCodeFor(null, "SIGINT")).toBe(128 + constants.signals.SIGINT);
  });

  it("reports a failure when neither a code nor a signal is known", () => {
    expect(exitCodeFor(null, null)).toBe(1);
  });
});

describe("main", () => {
  it("loads an existing env file before running the command with inherited stdio", async () => {
    /** @type {string[]} */
    const calls = [];
    const loadEnvFile = vi.fn(() => calls.push("load"));
    const run = fakeRun((child) => {
      calls.push("run");
      child.emit("exit", 0, null);
    });

    const code = await main({ argv: ["npm", "run", "dev", "--", "--port", "3001"], envFile: "/repo/.env", exists: () => true, loadEnvFile, run: /** @type {never} */ (run) });

    expect(code).toBe(0);
    expect(calls).toEqual(["load", "run"]);
    expect(loadEnvFile).toHaveBeenCalledWith("/repo/.env");
    expect(run).toHaveBeenCalledWith("npm", ["run", "dev", "--", "--port", "3001"], { stdio: "inherit" });
  });

  it("runs the command without loading anything when the env file is missing", async () => {
    const loadEnvFile = vi.fn();
    const run = fakeRun((child) => child.emit("exit", 2, null));

    const code = await main({ argv: ["npm", "test"], exists: () => false, loadEnvFile, run: /** @type {never} */ (run) });

    expect(code).toBe(2);
    expect(loadEnvFile).not.toHaveBeenCalled();
  });

  it("rejects when the command cannot be started", async () => {
    const run = fakeRun((child) => child.emit("error", new Error("spawn nope ENOENT")));

    await expect(main({ argv: ["nope"], exists: () => false, run: /** @type {never} */ (run) })).rejects.toThrow("ENOENT");
  });

  it("prints usage and exits 2 without a command", async () => {
    const error = vi.fn();

    await expect(main({ argv: [], error })).resolves.toBe(2);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("Usage"));
  });

  it("defaults to the process arguments, the real loader and the real spawn", async () => {
    const directory = mkdtempSync(join(tmpdir(), "with-env-"));
    const envFile = join(directory, ".env");
    writeFileSync(envFile, "WITH_ENV_TEST_VALUE=7\n");
    const argv = process.argv;
    process.argv = ["node", "with-env.mjs", process.execPath, "-e", "process.exit(Number(process.env.WITH_ENV_TEST_VALUE))"];
    try {
      await expect(main({ envFile })).resolves.toBe(7);
    } finally {
      process.argv = argv;
      delete process.env.WITH_ENV_TEST_VALUE;
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
