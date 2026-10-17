import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const APP_DIR = fileURLToPath(new URL("../../packages/app", import.meta.url));
const NEXT_BIN = fileURLToPath(new URL("../../node_modules/next/dist/bin/next", import.meta.url));
const STARTUP_TIMEOUT_MS = 60_000;
const SHUTDOWN_TIMEOUT_MS = 10_000;
const POLL_INTERVAL_MS = 250;
// Keep the tail of the server output for failure messages.
const MAX_OUTPUT_CHARS = 20_000;

export interface AppServer {
  url: string;
  output(): string;
  stop(): Promise<void>;
}

/** Fails fast with instructions when the production build is missing. */
export function assertAppBuilt(): void {
  if (!existsSync(`${APP_DIR}/.next/BUILD_ID`)) {
    throw new Error("No production build found. Run `npm run build` before `npm run test:integration`.");
  }
}

/** Applies the migrations with the real CLI, exactly as `npm run db:migrate` does. */
export function migrateDatabase(databaseUrl: string): void {
  const result = spawnSync("npm", ["run", "db:migrate"], { cwd: ROOT, env: { ...process.env, DATABASE_URL: databaseUrl }, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`Migrations failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`);
  }
}

async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => (typeof address === "object" && address ? resolve(address.port) : reject(new Error("No port assigned"))));
    });
  });
}

function waitForExit(child: ChildProcess, timeoutMs: number): Promise<boolean> {
  if (child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

/** Starts the built app (`next start`) on a free port and waits until it serves `/`. */
export async function startApp({ databaseUrl }: { databaseUrl: string }): Promise<AppServer> {
  const port = await findFreePort();
  const url = `http://127.0.0.1:${port}`;
  let output = "";
  const child = spawn(process.execPath, [NEXT_BIN, "start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: APP_DIR,
    env: { ...process.env, NODE_ENV: "production", DATABASE_URL: databaseUrl, LOG_LEVEL: process.env.LOG_LEVEL ?? "warn" },
    stdio: ["ignore", "pipe", "pipe"],
    // Own process group, so stop() also ends Next's worker processes.
    detached: true,
  });
  const append = (chunk: Buffer) => {
    output = (output + chunk.toString()).slice(-MAX_OUTPUT_CHARS);
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);

  const stop = async () => {
    if (child.pid === undefined || child.exitCode !== null) return;
    process.kill(-child.pid, "SIGTERM");
    if (!(await waitForExit(child, SHUTDOWN_TIMEOUT_MS))) process.kill(-child.pid, "SIGKILL");
  };

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`The app exited during startup (code ${child.exitCode}):\n${output}`);
    const isReady = await fetch(url).then(
      (response) => response.ok,
      () => false,
    );
    if (isReady) return { url, output: () => output, stop };
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  await stop();
  throw new Error(`The app did not become ready within ${STARTUP_TIMEOUT_MS}ms:\n${output}`);
}
