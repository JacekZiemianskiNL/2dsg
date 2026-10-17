import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";

import { describe, expect, it, vi } from "vitest";

import {
  adminConfig,
  checkNodeVersion,
  collectSecrets,
  commandRunner,
  ensureEnvFile,
  formatResult,
  loadPgClientFactory,
  main,
  parseTarget,
  provisionDatabase,
  randomPassword,
  readText,
  redact,
  resolveDatabaseUrl,
  SetupError,
  upsertEnvLine,
  withPassword,
} from "./setup.mjs";

const TARGET = "postgresql://devmentor:s3cret@db.local:6543/devmentor";
const EXAMPLE = "# PostgreSQL\nDATABASE_URL=postgresql://devmentor:devmentor@localhost:5432/devmentor\n# LOG_LEVEL=info\n";

/** A pg error carrying a SQLSTATE code. */
function pgError(/** @type {string} */ code, message = `pg error ${code}`) {
  return Object.assign(new Error(message), { code });
}

/**
 * A fake pg server: `targetErrors` are thrown, in order, by successive target connections; admin queries
 * answer from `roles` / `databases` and record the DDL they receive.
 */
function fakeServer({ target = TARGET, targetErrors = /** @type {unknown[]} */ ([]), roles = /** @type {string[]} */ ([]), databases = /** @type {string[]} */ ([]), adminError = /** @type {unknown} */ (undefined) } = {}) {
  /** @type {string[]} */
  const ddl = [];
  const configs = /** @type {Array<Record<string, unknown>>} */ ([]);
  const ended = { count: 0 };
  const createClient = vi.fn((/** @type {Record<string, unknown>} */ config) => {
    configs.push(config);
    const isAdmin = config.connectionString !== target;
    return {
      connect: async () => {
        if (isAdmin && adminError) throw adminError;
        if (!isAdmin && targetErrors.length > 0) throw targetErrors.shift();
      },
      query: async (/** @type {string} */ text, /** @type {unknown[]} */ values = []) => {
        if (text.startsWith("select 1 from pg_roles")) return { rowCount: roles.includes(String(values[0])) ? 1 : 0 };
        if (text.startsWith("select 1 from pg_database")) return { rowCount: databases.includes(String(values[0])) ? 1 : null };
        if (text !== "select 1") ddl.push(text);
        return { rowCount: 1 };
      },
      escapeLiteral: (/** @type {string} */ value) => `'${value}'`,
      end: async () => {
        ended.count += 1;
      },
    };
  });
  return { createClient, ddl, configs, ended };
}

describe("checkNodeVersion", () => {
  it("accepts the .nvmrc major or newer", () => {
    expect(checkNodeVersion("24.21.0", "24\n")).toBe("Node.js 24.21.0");
    expect(checkNodeVersion("25.0.0", "v24")).toBe("Node.js 25.0.0");
  });

  it("rejects an older major with the required version", () => {
    expect(() => checkNodeVersion("22.17.0", "24\n")).toThrow(new SetupError("Node.js 24 or newer is required (see .nvmrc); this is 22.17.0."));
  });
});

describe("upsertEnvLine", () => {
  it("replaces the first active line, including an export-prefixed one, and keeps comments", () => {
    expect(upsertEnvLine("# DATABASE_URL=old\nexport DATABASE_URL=\nA=1\n", "DATABASE_URL", "new")).toBe("# DATABASE_URL=old\nDATABASE_URL=new\nA=1\n");
  });

  it("appends to content with or without a trailing newline, and to empty content", () => {
    expect(upsertEnvLine("A=1\n", "DATABASE_URL", "x")).toBe("A=1\nDATABASE_URL=x\n");
    expect(upsertEnvLine("A=1", "DATABASE_URL", "x")).toBe("A=1\nDATABASE_URL=x\n");
    expect(upsertEnvLine("", "DATABASE_URL", "x")).toBe("DATABASE_URL=x\n");
  });

  it("keeps CRLF line endings", () => {
    expect(upsertEnvLine("A=1\r\nDATABASE_URL=\r\n", "DATABASE_URL", "x")).toBe("A=1\r\nDATABASE_URL=x\r\n");
    expect(upsertEnvLine("A=1\r\n", "DATABASE_URL", "x")).toBe("A=1\r\nDATABASE_URL=x\r\n");
  });
});

describe("withPassword", () => {
  it("swaps the template's password", () => {
    expect(withPassword("postgresql://devmentor:devmentor@localhost:5432/devmentor", "abc")).toBe("postgresql://devmentor:abc@localhost:5432/devmentor");
  });
});

describe("parseTarget", () => {
  it("extracts role, database, password, host and port", () => {
    expect(parseTarget(TARGET)).toEqual({ role: "devmentor", database: "devmentor", password: "s3cret", host: "db.local", port: 6543 });
  });

  it("defaults the port to 5432 and decodes the password", () => {
    expect(parseTarget("postgres://app:p%40ss@localhost/app_db")).toMatchObject({ port: 5432, password: "p@ss", database: "app_db" });
  });

  it("rejects an invalid URL or another protocol", () => {
    expect(() => parseTarget("not a url")).toThrow("DATABASE_URL is not a valid URL.");
    expect(() => parseTarget("mysql://a:b@localhost/c")).toThrow("must be a postgres:// or postgresql:// URL");
  });

  it("rejects role and database names that aren't plain identifiers", () => {
    expect(() => parseTarget('postgresql://Bad"Role:x@localhost/db')).toThrow("The role name");
    expect(() => parseTarget("postgresql://role:x@localhost/my-db")).toThrow("The database name");
  });
});

describe("adminConfig", () => {
  const target = { host: "db.local", port: 6543 };

  it("uses SETUP_ADMIN_DATABASE_URL when set", () => {
    expect(adminConfig({ SETUP_ADMIN_DATABASE_URL: "postgresql:///postgres?host=/run/pg" }, target)).toEqual({
      connectionString: "postgresql:///postgres?host=/run/pg",
      connectionTimeoutMillis: 5000,
    });
  });

  it("otherwise targets the server's postgres database and leaves user/password to pg's env defaults", () => {
    expect(adminConfig({}, target)).toEqual({ host: "db.local", port: 6543, database: "postgres", connectionTimeoutMillis: 5000 });
  });
});

describe("collectSecrets and redact", () => {
  it("collects PGPASSWORD and the passwords of every URL, raw and decoded", () => {
    const secrets = collectSecrets({ PGPASSWORD: "pgpw", SETUP_ADMIN_DATABASE_URL: "postgresql://postgres:ad%2Fmin@localhost/postgres" }, [TARGET, undefined, "::not a url::", "postgresql://nopass@localhost/x"]);
    expect(secrets).toEqual(["pgpw", "s3cret", "s3cret", "ad%2Fmin", "ad/min"]);
  });

  it("returns nothing when there are no secrets", () => {
    expect(collectSecrets({}, [undefined])).toEqual([]);
  });

  it("masks every occurrence", () => {
    expect(redact("a s3cret b s3cret", ["s3cret"])).toBe("a *** b ***");
  });
});

describe("provisionDatabase", () => {
  it("skips when the target role can already connect", async () => {
    const server = fakeServer();
    await expect(provisionDatabase({ databaseUrl: TARGET, env: {}, createClient: server.createClient })).resolves.toEqual({
      status: "skipped",
      detail: 'role "devmentor" can already connect to database "devmentor"',
    });
    expect(server.ended.count).toBe(1);
    expect(server.configs[0]).toEqual({ connectionString: TARGET, connectionTimeoutMillis: 5000 });
  });

  it("creates a missing role and database, then verifies the connection", async () => {
    const server = fakeServer({ targetErrors: [pgError("28P01")] });
    await expect(provisionDatabase({ databaseUrl: TARGET, env: {}, createClient: server.createClient })).resolves.toEqual({
      status: "done",
      detail: 'created role "devmentor" and database "devmentor"',
    });
    expect(server.ddl).toEqual(['create role "devmentor" login password \'s3cret\'', 'create database "devmentor" owner "devmentor"']);
    expect(server.configs[1]).toEqual({ host: "db.local", port: 6543, database: "postgres", connectionTimeoutMillis: 5000 });
    expect(server.ended.count).toBe(3);
  });

  it("creates only the missing database for an existing role", async () => {
    const server = fakeServer({ targetErrors: [pgError("3D000")], roles: ["devmentor"] });
    const result = await provisionDatabase({ databaseUrl: TARGET, env: {}, createClient: server.createClient });
    expect(result.detail).toBe('created database "devmentor"');
    expect(server.ddl).toEqual(['create database "devmentor" owner "devmentor"']);
  });

  it("reports when both already existed but the role couldn't connect at first", async () => {
    const server = fakeServer({ targetErrors: [pgError("28000")], roles: ["devmentor"], databases: ["devmentor"] });
    const result = await provisionDatabase({ databaseUrl: TARGET, env: {}, createClient: server.createClient });
    expect(result).toEqual({ status: "done", detail: "created nothing (both already existed)" });
    expect(server.ddl).toEqual([]);
  });

  it("fails without touching anything when PostgreSQL isn't reachable", async () => {
    const refused = Object.assign(new Error("connect ECONNREFUSED 127.0.0.1:6543"), { code: "ECONNREFUSED" });
    const server = fakeServer({ targetErrors: [refused] });
    await expect(provisionDatabase({ databaseUrl: TARGET, env: {}, createClient: server.createClient })).rejects.toThrow(
      "Cannot connect to PostgreSQL at db.local:6543: connect ECONNREFUSED 127.0.0.1:6543. Start PostgreSQL or fix DATABASE_URL.",
    );
    expect(server.createClient).toHaveBeenCalledOnce();
  });

  it("treats a thrown non-error value as a connection failure", async () => {
    const server = fakeServer({ targetErrors: ["boom"] });
    await expect(provisionDatabase({ databaseUrl: TARGET, env: {}, createClient: server.createClient })).rejects.toThrow("db.local:6543: boom.");
  });

  it("names the admin override when the admin connection fails", async () => {
    const server = fakeServer({ targetErrors: [pgError("28P01")], adminError: pgError("28P01", 'password authentication failed for user "postgres"') });
    await expect(provisionDatabase({ databaseUrl: TARGET, env: {}, createClient: server.createClient })).rejects.toThrow(/as a PostgreSQL admin at db\.local:6543: password authentication failed.*SETUP_ADMIN_DATABASE_URL/);
  });

  it("explains a password mismatch when the role still can't connect, without resetting it", async () => {
    const mismatch = pgError("28P01", 'password authentication failed for user "devmentor"');
    const server = fakeServer({ targetErrors: [mismatch, mismatch], roles: ["devmentor"], databases: ["devmentor"] });
    await expect(provisionDatabase({ databaseUrl: TARGET, env: {}, createClient: server.createClient })).rejects.toThrow(/still can't connect: password authentication failed.*ALTER ROLE "devmentor"/);
    expect(server.ddl).toEqual([]);
  });
});

describe("ensureEnvFile", () => {
  const io = (/** @type {Record<string, string>} */ files) => ({
    exists: (/** @type {string} */ path) => path in files,
    read: async (/** @type {string} */ path) => files[path],
    write: vi.fn(async (/** @type {string} */ path, /** @type {string} */ content) => {
      files[path] = content;
    }),
    generatePassword: () => "generated",
  });

  it("creates the env file from the example with a generated password, owner-only", async () => {
    const deps = io({ "/r/.env.example": EXAMPLE });
    const result = await ensureEnvFile({ ...deps, envFile: "/r/.env", exampleFile: "/r/.env.example" });
    expect(result).toEqual({ status: "done", detail: "created /r/.env with a generated database password" });
    expect(deps.write).toHaveBeenCalledWith(
      "/r/.env",
      "# PostgreSQL\nDATABASE_URL=postgresql://devmentor:generated@localhost:5432/devmentor\n# LOG_LEVEL=info\n",
      { mode: 0o600, flag: "wx" },
    );
  });

  it("never overwrites an env file that already sets DATABASE_URL", async () => {
    const deps = io({ "/r/.env.example": EXAMPLE, "/r/.env": "DATABASE_URL=postgresql://mine\n" });
    await expect(ensureEnvFile({ ...deps, envFile: "/r/.env", exampleFile: "/r/.env.example" })).resolves.toEqual({
      status: "skipped",
      detail: "/r/.env already sets DATABASE_URL",
    });
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("adds a DATABASE_URL to an existing env file that lacks one, keeping its other lines", async () => {
    const deps = io({ "/r/.env.example": EXAMPLE, "/r/.env": "LOG_LEVEL=debug\nDATABASE_URL=\n" });
    const result = await ensureEnvFile({ ...deps, envFile: "/r/.env", exampleFile: "/r/.env.example" });
    expect(result.status).toBe("done");
    expect(deps.write).toHaveBeenCalledWith("/r/.env", "LOG_LEVEL=debug\nDATABASE_URL=postgresql://devmentor:generated@localhost:5432/devmentor\n");
  });

  it("fails when the example has no DATABASE_URL to start from", async () => {
    const deps = io({ "/r/.env.example": "# empty\n" });
    await expect(ensureEnvFile({ ...deps, envFile: "/r/.env", exampleFile: "/r/.env.example" })).rejects.toThrow("/r/.env.example has no DATABASE_URL");
  });
});

describe("resolveDatabaseUrl", () => {
  it("prefers the shell, like the runtime does", () => {
    expect(resolveDatabaseUrl({ DATABASE_URL: "postgresql://shell" }, "DATABASE_URL=postgresql://file\n")).toEqual({ databaseUrl: "postgresql://shell", source: "the shell environment" });
  });

  it("falls back to the env file", () => {
    expect(resolveDatabaseUrl({}, "DATABASE_URL=postgresql://file\n")).toEqual({ databaseUrl: "postgresql://file", source: ".env" });
  });
});

describe("commandRunner", () => {
  /** A fake child process whose output streams the test can write to. */
  function fakeChild() {
    const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough() });
    return child;
  }

  it("forwards stdout and stderr line by line with secrets masked, and resolves with the exit code", async () => {
    const child = fakeChild();
    const spawnProcess = vi.fn(() => child);
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const run = commandRunner({ spawnProcess: /** @type {never} */ (spawnProcess), stdout, stderr, secrets: () => ["s3cret"] });

    const done = run("npm", ["run", "db:migrate"], { cwd: "/r", env: { A: "1" } });
    child.stdout.end("connecting to postgresql://u:s3cret@h/db\nok");
    child.stderr.end("warn s3cret\n");
    await new Promise((resolve) => setImmediate(resolve));
    child.emit("close", 0);

    await expect(done).resolves.toBe(0);
    expect(spawnProcess).toHaveBeenCalledWith("npm", ["run", "db:migrate"], { cwd: "/r", env: { A: "1" }, stdio: ["inherit", "pipe", "pipe"] });
    expect(stdout.read().toString()).toBe("connecting to postgresql://u:***@h/db\nok\n");
    expect(stderr.read().toString()).toBe("warn ***\n");
  });

  it("reports a failure when the child closes without an exit code", async () => {
    const child = fakeChild();
    const run = commandRunner({ spawnProcess: /** @type {never} */ (() => child), secrets: () => [] });
    const done = run("npm", [], { cwd: "/r", env: {} });
    child.emit("close", null);
    await expect(done).resolves.toBe(1);
  });

  it("rejects when the command can't start", async () => {
    const child = fakeChild();
    const run = commandRunner({ spawnProcess: /** @type {never} */ (() => child), secrets: () => [] });
    const done = run("npm", [], { cwd: "/r", env: {} });
    child.emit("error", new Error("spawn npm ENOENT"));
    await expect(done).rejects.toThrow("ENOENT");
  });

  it("defaults to the real spawn and process streams", async () => {
    const run = commandRunner({ secrets: () => [] });
    await expect(run(process.execPath, ["-e", "process.exit(3)"], { cwd: process.cwd(), env: process.env })).resolves.toBe(3);
  });
});

describe("formatResult", () => {
  it("labels each status", () => {
    expect(formatResult({ name: "Database", status: "skipped", detail: "x" })).toBe("• Database: skipped (already done), x");
    expect(formatResult({ name: "Dependencies", status: "ran", detail: "y" })).toBe("• Dependencies: ok, y");
    expect(formatResult({ name: "Environment file", status: "done", detail: "z" })).toBe("• Environment file: done, z");
  });
});

describe("default dependencies", () => {
  it("builds pg clients without connecting", async () => {
    const createClient = await loadPgClientFactory();
    const client = createClient({ connectionString: TARGET, connectionTimeoutMillis: 5000 });
    expect(typeof client.connect).toBe("function");
    expect(client.escapeLiteral("it's")).toBe("'it''s'");
  });

  it("reads text files and generates 192-bit url-safe passwords", async () => {
    const directory = mkdtempSync(join(tmpdir(), "setup-"));
    try {
      writeFileSync(join(directory, "a.txt"), "hello");
      await expect(readText(join(directory, "a.txt"))).resolves.toBe("hello");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
    const password = randomPassword();
    expect(password).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(randomPassword()).not.toBe(password);
  });
});

describe("main", () => {
  /** In-memory files plus fakes for every side effect; `runCommand` codes are returned in call order. */
  function setupDeps({ files = /** @type {Record<string, string>} */ ({}), env = /** @type {NodeJS.ProcessEnv} */ ({}), codes = [0, 0], server = fakeServer() } = {}) {
    /** @type {Record<string, string>} */
    const all = { "/r/.nvmrc": "24\n", "/r/.env.example": EXAMPLE, ...files };
    const log = vi.fn();
    const error = vi.fn();
    const runCommand = vi.fn(async () => /** @type {number} */ (codes.shift()));
    const deps = {
      repoRoot: "/r",
      envFile: "/r/.env",
      env,
      nodeVersion: "24.21.0",
      runCommand,
      loadClientFactory: async () => server.createClient,
      exists: (/** @type {string} */ path) => path in all,
      read: async (/** @type {string} */ path) => all[path],
      write: vi.fn(async (/** @type {string} */ path, /** @type {string} */ content) => {
        all[path] = content;
      }),
      generatePassword: () => "Gen3rated",
      log,
      error,
    };
    const output = () => [...log.mock.calls, ...error.mock.calls].flat().join("\n");
    return { deps, files: all, log, error, runCommand, output };
  }

  it("runs every step on a fresh checkout, never printing the generated password", async () => {
    const server = fakeServer({ target: "postgresql://devmentor:Gen3rated@localhost:5432/devmentor", targetErrors: [pgError("28P01")] });
    const { deps, files, log, runCommand, output } = setupDeps({ server });

    await expect(main(deps)).resolves.toBe(0);

    expect(files["/r/.env"]).toContain("DATABASE_URL=postgresql://devmentor:Gen3rated@localhost:5432/devmentor");
    expect(runCommand).toHaveBeenNthCalledWith(1, "npm", ["install"], { cwd: "/r", env: {} });
    expect(runCommand).toHaveBeenNthCalledWith(2, "npm", ["run", "db:migrate"], {
      cwd: "/r",
      env: { DATABASE_URL: "postgresql://devmentor:Gen3rated@localhost:5432/devmentor" },
    });
    expect(log.mock.calls.map(([line]) => String(line).split(",")[0])).toEqual([
      "• Node.js version: ok",
      "• Dependencies: ok",
      "• Environment file: done",
      "• Database: done",
      "• Migrations: ok",
      expect.stringContaining("Setup complete"),
    ]);
    expect(output()).not.toContain("Gen3rated");
  });

  it("reports no 'done' step on a rerun", async () => {
    const { deps, log } = setupDeps({ files: { "/r/.env": "DATABASE_URL=postgresql://devmentor:Existing1@localhost:5432/devmentor\n" } });

    await expect(main(deps)).resolves.toBe(0);

    const statuses = log.mock.calls.map(([line]) => String(line)).filter((line) => line.startsWith("•"));
    expect(statuses.some((line) => line.includes(": done"))).toBe(false);
    expect(statuses[3]).toContain("(DATABASE_URL from .env)");
    expect(deps.write).not.toHaveBeenCalled();
  });

  it("uses a shell DATABASE_URL over the env file and hides its password", async () => {
    const server = fakeServer({ targetErrors: [pgError("ECONNREFUSED", "could not reach postgresql://devmentor:s3cret@db.local:6543")] });
    const { deps, error, output } = setupDeps({ env: { DATABASE_URL: TARGET }, files: { "/r/.env": "DATABASE_URL=postgresql://devmentor:filepw@localhost/devmentor\n" }, server });

    await expect(main(deps)).resolves.toBe(1);

    expect(error).toHaveBeenCalledWith(expect.stringMatching(/^Setup failed at Database: Cannot connect to PostgreSQL at db\.local:6543: could not reach postgresql:\/\/devmentor:\*\*\*@db\.local:6543/));
    expect(output()).not.toContain("s3cret");
  });

  it("stops at a failing npm command and names the step", async () => {
    const { deps, error, runCommand } = setupDeps({ codes: [1] });

    await expect(main(deps)).resolves.toBe(1);

    expect(error).toHaveBeenCalledWith("Setup failed at Dependencies: npm install failed with exit code 1; see the output above.");
    expect(runCommand).toHaveBeenCalledOnce();
  });

  it("stops at a failing migration", async () => {
    const { deps, error } = setupDeps({ codes: [0, 2], files: { "/r/.env": EXAMPLE } });

    await expect(main(deps)).resolves.toBe(1);

    expect(error).toHaveBeenCalledWith("Setup failed at Migrations: npm run db:migrate failed with exit code 2; see the output above.");
  });

  it("refuses an older Node.js before changing anything", async () => {
    const { deps, error, runCommand } = setupDeps();

    await expect(main({ ...deps, nodeVersion: "20.0.0" })).resolves.toBe(1);

    expect(error).toHaveBeenCalledWith(expect.stringContaining("Setup failed at Node.js version: Node.js 24 or newer is required"));
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("defaults to the real repository, process and console", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      // An unsupported version fails at the first step, before any default touches the repository or network.
      await expect(main({ nodeVersion: "1.0.0", exists: () => false, runCommand: async () => 0 })).resolves.toBe(1);
      expect(error).toHaveBeenCalledWith(expect.stringContaining("Node.js version"));
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  });
});
