// `node scripts/with-env.mjs <command> [args...]`: loads the git-ignored root .env, when present, then runs
// the command. `node --env-file --run` can't do this: npm scripts started by `--run` don't receive the file's
// variables. `process.loadEnvFile` never overrides a variable that is already set, so the shell still wins.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { constants } from "node:os";
import { fileURLToPath } from "node:url";

import { resolveCommand } from "./npm-command.mjs";

const ROOT_ENV_FILE = fileURLToPath(new URL("../../.env", import.meta.url));
// POSIX shells report a child killed by a signal as 128 + the signal number.
const SIGNAL_EXIT_BASE = 128;
const USAGE_EXIT_CODE = 2;
// Forwarded so a wrapper stopped on its own (not via the terminal's process group) doesn't orphan the child.
const FORWARDED_SIGNALS = /** @type {const} */ (["SIGINT", "SIGTERM"]);

/**
 * @param {number | null} code
 * @param {NodeJS.Signals | null} signal
 */
export function exitCodeFor(code, signal) {
  if (signal) return SIGNAL_EXIT_BASE + constants.signals[signal];
  return code ?? 1;
}

/**
 * Loads the env file and runs the command, resolving with its exit code.
 * @param {{ argv?: string[], envFile?: string, exists?: (path: string) => boolean, loadEnvFile?: (path: string) => void, run?: typeof spawn, signals?: NodeJS.EventEmitter, env?: NodeJS.ProcessEnv, error?: (message: string) => void }} [deps]
 * @returns {Promise<number>}
 */
export function main(deps = {}) {
  const {
    argv = process.argv.slice(2),
    envFile = ROOT_ENV_FILE,
    exists = existsSync,
    loadEnvFile = (path) => process.loadEnvFile(path),
    run = spawn,
    signals = process,
    env = process.env,
    error = console.error,
  } = deps;
  const [command, ...args] = argv;
  if (!command) {
    error("Usage: node scripts/with-env.mjs <command> [args...]");
    return Promise.resolve(USAGE_EXIT_CODE);
  }
  if (exists(envFile)) loadEnvFile(envFile);
  return new Promise((resolve, reject) => {
    const child = run(...resolveCommand(command, args, env), { stdio: "inherit" });
    const forward = (/** @type {NodeJS.Signals} */ signal) => child.kill(signal);
    for (const signal of FORWARDED_SIGNALS) signals.on(signal, forward);
    const stopForwarding = () => {
      for (const signal of FORWARDED_SIGNALS) signals.off(signal, forward);
    };
    child.on("error", (error) => {
      stopForwarding();
      reject(error);
    });
    child.on("exit", (code, signal) => {
      stopForwarding();
      resolve(exitCodeFor(code, signal));
    });
  });
}
