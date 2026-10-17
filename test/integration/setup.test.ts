import { randomBytes } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import pg from "pg";
import { afterAll, describe, expect, inject, it } from "vitest";

import { commandRunner, main } from "../../scripts/lib/setup.mjs";

// The injected URL connects as the server's superuser (Testcontainers' user, or the INTEGRATION_DATABASE_URL
// admin), which is exactly what setup needs to provision a role and database.
const adminUrl = inject("databaseUrl");
const name = `setup_it_${randomBytes(4).toString("hex")}`;
const targetUrl = (() => {
  const url = new URL(adminUrl);
  url.username = name;
  url.password = randomBytes(12).toString("hex");
  url.pathname = `/${name}`;
  return url.toString();
})();
const directory = mkdtempSync(join(tmpdir(), "devmentor-setup-"));
const envFile = join(directory, ".env");

async function withAdmin<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: adminUrl });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function runSetupOnce(): Promise<{ code: number; lines: string[] }> {
  const lines: string[] = [];
  const realRun = commandRunner({ secrets: () => [] });
  const code = await main({
    repoRoot: process.cwd(),
    envFile,
    env: { ...process.env, DATABASE_URL: targetUrl, SETUP_ADMIN_DATABASE_URL: adminUrl },
    // Never reinstall the repository's dependencies from a test; the migration runs for real.
    runCommand: (command, args, options) => (args[0] === "install" ? Promise.resolve(0) : realRun(command, args, options)),
    log: (message) => lines.push(message),
    error: (message) => lines.push(message),
  });
  return { code, lines };
}

afterAll(async () => {
  await withAdmin(async (client) => {
    await client.query(`drop database if exists "${name}" with (force)`);
    await client.query(`drop role if exists "${name}"`);
  });
  rmSync(directory, { recursive: true, force: true });
});

describe("npm run setup", () => {
  let firstEnvFile = "";

  it("provisions the role and database, writes the env file and migrates on the first run", async () => {
    const { code, lines } = await runSetupOnce();

    expect(code).toBe(0);
    expect(lines).toContainEqual(expect.stringMatching(/^• Environment file: done/));
    expect(lines).toContainEqual(expect.stringMatching(new RegExp(`^• Database: done, created role "${name}" and database "${name}"`)));
    expect(lines.at(-1)).toContain("Setup complete");
    firstEnvFile = readFileSync(envFile, "utf8");

    const client = new pg.Client({ connectionString: targetUrl });
    await client.connect();
    try {
      const { rows } = await client.query<{ exists: boolean }>("select to_regclass('public.mikro_orm_migrations') is not null as exists");
      expect(rows[0]?.exists).toBe(true);
    } finally {
      await client.end();
    }
  });

  it("changes nothing on a second run", async () => {
    const { code, lines } = await runSetupOnce();

    expect(code).toBe(0);
    expect(lines.filter((line) => line.startsWith("•") && line.includes(": done"))).toEqual([]);
    expect(lines).toContainEqual(expect.stringMatching(/^• Database: skipped \(already done\)/));
    expect(readFileSync(envFile, "utf8")).toBe(firstEnvFile);
  });
});
