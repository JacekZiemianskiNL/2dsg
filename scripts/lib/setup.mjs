// `npm run setup`: the README "Getting started" steps as one idempotent command. Each step checks its own
// state first, so a rerun changes nothing that is already in place. This module imports only `node:`
// built-ins because it runs before `npm install`; `pg` is loaded after the install step.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

import { resolveCommand } from "./npm-command.mjs";

const REPO_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DATABASE_URL_KEY = "DATABASE_URL";
// 24 random bytes = 192 bits of entropy; base64url needs no escaping inside a connection URL.
const PASSWORD_BYTES = 24;
// Owner read/write only: the file holds a database password.
const ENV_FILE_MODE = 0o600;
const DEFAULT_POSTGRES_PORT = 5432;
const ADMIN_DATABASE = "postgres";
const CONNECT_TIMEOUT_MS = 5_000;
// Plain unquoted PostgreSQL identifiers only, so quoting them into DDL is safe. At most 63 bytes
// (NAMEDATALEN - 1): PostgreSQL silently truncates longer names, which would defeat the rerun check.
const IDENTIFIER = /^[a-z_][a-z0-9_]{0,62}$/;
// SQLSTATEs that mean "the role or database isn't there yet": provision them instead of failing.
const PROVISIONABLE_ERRORS = new Set(["3D000", "28000", "28P01"]);
const REDACTED = "***";
// Passwords in connection strings, whether in the userinfo or in a `password=` parameter, even if unknown.
const URL_PASSWORD = /(\w+:\/\/[^:/@\s]*:)[^@\s]+@/g;
const PASSWORD_PARAMETER = /(password=)[^&\s]+/gi;

/** @typedef {"done" | "skipped" | "ran"} StepStatus */
/** @typedef {{ name: string, status: StepStatus, detail: string }} StepResult */
/** @typedef {{ connect(): Promise<unknown>, query(text: string, values?: unknown[]): Promise<{ rowCount: number | null }>, escapeLiteral(value: string): string, end(): Promise<void> }} DbClient */
/** @typedef {{ connectionString?: string, host?: string, port?: number, database?: string, connectionTimeoutMillis: number }} ClientConfig */
/** @typedef {(command: string, args: string[], options: { cwd: string, env: NodeJS.ProcessEnv }) => Promise<number>} RunCommand */

/** A failure with a user-facing, actionable message. */
export class SetupError extends Error {}

/**
 * @param {string} nodeVersion e.g. "24.21.0"
 * @param {string} nvmrc the contents of .nvmrc, e.g. "24\n"
 */
export function checkNodeVersion(nodeVersion, nvmrc) {
  const required = Number.parseInt(nvmrc.trim().replace(/^v/, ""), 10);
  const current = Number.parseInt(nodeVersion, 10);
  if (Number.isNaN(required)) throw new SetupError(`.nvmrc must name a Node.js major version (e.g. 24); found "${nvmrc.trim()}".`);
  if (current < required) {
    throw new SetupError(`Node.js ${required} or newer is required (see .nvmrc); this is ${nodeVersion}.`);
  }
  return `Node.js ${nodeVersion}`;
}

/**
 * Sets `key=value` in env-file content: replaces the first active (uncommented) line for the key, optionally
 * `export`-prefixed, or appends one. Other lines and the file's line endings are kept.
 * @param {string} content
 * @param {string} key
 * @param {string} value
 */
export function upsertEnvLine(content, key, value) {
  const eol = content.includes("\r\n") ? "\r\n" : "\n";
  const lines = content.split(eol);
  const pattern = new RegExp(`^\\s*(export\\s+)?${key}\\s*=`);
  const index = lines.findIndex((line) => pattern.test(line));
  if (index >= 0) {
    lines[index] = `${key}=${value}`;
    return lines.join(eol);
  }
  const body = content === "" || content.endsWith(eol) ? content : `${content}${eol}`;
  return `${body}${key}=${value}${eol}`;
}

/**
 * The template's DATABASE_URL with a freshly generated password.
 * @param {string} template a postgres:// URL
 * @param {string} password
 */
export function withPassword(template, password) {
  const url = new URL(template);
  url.password = password;
  return url.toString();
}

/** @param {string} value */
function assertPostgresUrl(value) {
  /** @type {URL} */
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new SetupError("DATABASE_URL is not a valid URL.");
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new SetupError("DATABASE_URL must be a postgres:// or postgresql:// URL.");
  }
  return url;
}

/**
 * The server a URL points at.
 * @param {string} databaseUrl
 */
export function parseServer(databaseUrl) {
  const url = assertPostgresUrl(databaseUrl);
  const port = url.port ? Number(url.port) : DEFAULT_POSTGRES_PORT;
  // Like pg, a `host` parameter (a socket directory, e.g. ?host=/var/run/postgresql) overrides the URL's host.
  return { url, host: url.searchParams.get("host") || url.hostname, port };
}

/**
 * The role, password and database to provision, from the target URL. Only needed when something must be
 * created, so an existing database with any name keeps working.
 * @param {string} databaseUrl
 */
export function parseTarget(databaseUrl) {
  const { url, host, port } = parseServer(databaseUrl);
  const role = decodeURIComponent(url.username);
  const database = decodeURIComponent(url.pathname.slice(1));
  for (const [label, name] of [["role", role], ["database", database]]) {
    if (!IDENTIFIER.test(name)) {
      throw new SetupError(`The ${label} name in DATABASE_URL must match ${IDENTIFIER} (lowercase letters, digits, underscores).`);
    }
  }
  return { role, database, password: decodeURIComponent(url.password), host, port };
}

/**
 * Admin connection: SETUP_ADMIN_DATABASE_URL, or the target server's `postgres` database with the user and
 * password `pg` takes from PGUSER/PGPASSWORD (falling back to the OS user).
 * @param {NodeJS.ProcessEnv} env
 * @param {{ host: string, port: number }} target
 * @returns {ClientConfig}
 */
export function adminConfig(env, target) {
  if (env.SETUP_ADMIN_DATABASE_URL) {
    return { connectionString: env.SETUP_ADMIN_DATABASE_URL, connectionTimeoutMillis: CONNECT_TIMEOUT_MS };
  }
  return { host: target.host, port: target.port, database: ADMIN_DATABASE, connectionTimeoutMillis: CONNECT_TIMEOUT_MS };
}

/**
 * The passwords that must never reach the output: those in the given URLs and the admin URL, and PGPASSWORD.
 * @param {NodeJS.ProcessEnv} env
 * @param {Array<string | undefined>} databaseUrls
 * @returns {string[]}
 */
export function collectSecrets(env, databaseUrls) {
  const secrets = env.PGPASSWORD ? [env.PGPASSWORD] : [];
  for (const value of [...databaseUrls, env.SETUP_ADMIN_DATABASE_URL]) {
    if (!value || !URL.canParse(value)) continue;
    const password = new URL(value).password;
    secrets.push(password, decodeURIComponent(password));
  }
  return secrets.filter((secret) => secret !== "");
}

/**
 * @param {string} text
 * @param {string[]} secrets
 */
export function redact(text, secrets) {
  const masked = text.replace(URL_PASSWORD, `$1${REDACTED}@`).replace(PASSWORD_PARAMETER, `$1${REDACTED}`);
  return secrets.reduce((result, secret) => result.split(secret).join(REDACTED), masked);
}

/** @param {unknown} error */
function sqlState(error) {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : undefined;
}

/** @param {unknown} error */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Connects, runs `fn`, and always closes the connection.
 * @template T
 * @param {(config: ClientConfig) => DbClient} createClient
 * @param {ClientConfig} config
 * @param {(client: DbClient) => Promise<T>} fn
 */
async function withClient(createClient, config, fn) {
  const client = createClient(config);
  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * Creates the role and database from DATABASE_URL when connecting as that role fails because they're missing.
 * Never changes the password of a role that already exists.
 * @param {{ databaseUrl: string, env: NodeJS.ProcessEnv, createClient: (config: ClientConfig) => DbClient }} input
 * @returns {Promise<{ status: StepStatus, detail: string }>}
 */
export async function provisionDatabase({ databaseUrl, env, createClient }) {
  const server = parseServer(databaseUrl);
  const where = `${server.host}:${server.port}`;
  const targetConfig = { connectionString: databaseUrl, connectionTimeoutMillis: CONNECT_TIMEOUT_MS };
  const select = () => withClient(createClient, targetConfig, (client) => client.query("select 1"));
  try {
    await select();
    return { status: "skipped", detail: `DATABASE_URL already connects to ${where}${server.url.pathname}` };
  } catch (error) {
    if (!PROVISIONABLE_ERRORS.has(sqlState(error) ?? "")) {
      throw new SetupError(`Cannot connect to PostgreSQL at ${where}: ${messageOf(error)}. Start PostgreSQL or fix DATABASE_URL.`);
    }
  }
  const target = parseTarget(databaseUrl);

  /** @type {string[]} */
  const created = [];
  try {
    await withClient(createClient, adminConfig(env, target), async (admin) => {
      const role = await admin.query("select 1 from pg_roles where rolname = $1", [target.role]);
      if (!role.rowCount) {
        await admin.query(`create role "${target.role}" login password ${admin.escapeLiteral(target.password)}`);
        created.push(`role "${target.role}"`);
      }
      const database = await admin.query("select 1 from pg_database where datname = $1", [target.database]);
      if (!database.rowCount) {
        await admin.query(`create database "${target.database}" owner "${target.role}"`);
        created.push(`database "${target.database}"`);
      }
    });
  } catch (error) {
    throw new SetupError(
      `Cannot provision the database as a PostgreSQL admin at ${where}: ${messageOf(error)}. ` +
        "Set SETUP_ADMIN_DATABASE_URL to a superuser connection (a socket works too, e.g. postgresql:///postgres?host=/var/run/postgresql), or PGUSER/PGPASSWORD.",
    );
  }

  try {
    await select();
  } catch (error) {
    throw new SetupError(
      `Role "${target.role}" still can't connect: ${messageOf(error)}. If the role existed before, its password differs from DATABASE_URL; ` +
        `put the right password in .env or reset it with ALTER ROLE "${target.role}" PASSWORD '...'.`,
    );
  }
  return { status: "done", detail: `created ${created.join(" and ") || "nothing (both already existed)"}` };
}

/**
 * Makes sure the env file exists and holds a DATABASE_URL, without overwriting anything already set. The value
 * saved is the shell's DATABASE_URL when there is one (so it survives the shell), otherwise a generated one.
 * @param {{ envFile: string, exampleFile: string, shellDatabaseUrl?: string, exists: (path: string) => boolean, read: (path: string) => Promise<string>, write: (path: string, content: string, options?: { mode: number, flag: string }) => Promise<void>, generatePassword: () => string }} input
 * @returns {Promise<{ status: StepStatus, detail: string }>}
 */
export async function ensureEnvFile({ envFile, exampleFile, shellDatabaseUrl, exists, read, write, generatePassword }) {
  const example = await read(exampleFile);
  const template = parseEnv(example)[DATABASE_URL_KEY];
  if (!template) throw new SetupError(`${exampleFile} has no ${DATABASE_URL_KEY} to start from.`);
  const value = () => shellDatabaseUrl || withPassword(template, generatePassword());
  const origin = shellDatabaseUrl ? `${DATABASE_URL_KEY} from the shell` : "a generated database password";

  if (!exists(envFile)) {
    await write(envFile, upsertEnvLine(example, DATABASE_URL_KEY, value()), { mode: ENV_FILE_MODE, flag: "wx" });
    return { status: "done", detail: `created ${envFile} with ${origin}` };
  }
  const content = await read(envFile);
  if (parseEnv(content)[DATABASE_URL_KEY]) return { status: "skipped", detail: `${envFile} already sets ${DATABASE_URL_KEY}` };
  await write(envFile, upsertEnvLine(content, DATABASE_URL_KEY, value()));
  return { status: "done", detail: `added ${origin} to ${envFile}` };
}

/**
 * The DATABASE_URL every later step uses, with the runtime's precedence: the shell, then the env file.
 * @param {NodeJS.ProcessEnv} env
 * @param {string} envContent
 */
export function resolveDatabaseUrl(env, envContent) {
  if (env[DATABASE_URL_KEY]) return { databaseUrl: env[DATABASE_URL_KEY], source: "the shell environment" };
  return { databaseUrl: /** @type {string} */ (parseEnv(envContent)[DATABASE_URL_KEY]), source: ".env" };
}

/**
 * Runs a command, forwarding its output line by line with secrets redacted.
 * @param {{ spawnProcess?: typeof spawn, stdout?: NodeJS.WritableStream, stderr?: NodeJS.WritableStream, secrets: () => string[] }} deps
 * @returns {RunCommand}
 */
export function commandRunner({ spawnProcess = spawn, stdout = process.stdout, stderr = process.stderr, secrets }) {
  return (command, args, options) =>
    new Promise((resolve, reject) => {
      const child = spawnProcess(...resolveCommand(command, args, options.env), { ...options, stdio: ["inherit", "pipe", "pipe"] });
      for (const [input, output] of /** @type {const} */ ([
        [child.stdout, stdout],
        [child.stderr, stderr],
      ])) {
        createInterface({ input: /** @type {NodeJS.ReadableStream} */ (input) }).on("line", (line) => output.write(`${redact(line, secrets())}\n`));
      }
      child.on("error", reject);
      child.on("close", (code) => resolve(code ?? 1));
    });
}

/**
 * @param {RunCommand} runCommand
 * @param {string} label
 * @param {string[]} args
 * @param {{ cwd: string, env: NodeJS.ProcessEnv }} options
 */
async function runNpm(runCommand, label, args, options) {
  const code = await runCommand("npm", args, options);
  if (code !== 0) throw new SetupError(`${label} failed with exit code ${code}; see the output above.`);
}

/**
 * @typedef {object} SetupOptions
 * @property {string} repoRoot
 * @property {string} envFile
 * @property {NodeJS.ProcessEnv} env
 * @property {string} nodeVersion
 * @property {RunCommand} runCommand
 * @property {() => Promise<(config: ClientConfig) => DbClient>} loadClientFactory
 * @property {(path: string) => boolean} exists
 * @property {(path: string) => Promise<string>} read
 * @property {(path: string, content: string, options?: { mode: number, flag: string }) => Promise<void>} write
 * @property {() => string} generatePassword
 * @property {(result: StepResult) => void} report
 */

/**
 * Runs every setup step in order and returns their results. A failing step throws, naming the step.
 * @param {SetupOptions} options
 * @returns {Promise<StepResult[]>}
 */
export async function runSetup(options) {
  const { repoRoot, envFile, env, runCommand, report } = options;
  /** @type {StepResult[]} */
  const results = [];
  /**
   * @param {string} name
   * @param {() => Promise<{ status: StepStatus, detail: string }>} fn
   */
  const step = async (name, fn) => {
    try {
      const result = { name, ...(await fn()) };
      results.push(result);
      report(result);
    } catch (error) {
      throw new SetupError(`${name}: ${messageOf(error)}`, { cause: error });
    }
  };

  await step("Node.js version", async () => ({
    status: "ran",
    detail: checkNodeVersion(options.nodeVersion, await options.read(join(repoRoot, ".nvmrc"))),
  }));
  await step("Dependencies", async () => {
    await runNpm(runCommand, "npm install", ["install"], { cwd: repoRoot, env });
    return { status: "ran", detail: "npm install is up to date" };
  });
  await step("Environment file", () =>
    ensureEnvFile({ ...options, exampleFile: join(repoRoot, ".env.example"), shellDatabaseUrl: env[DATABASE_URL_KEY] }),
  );

  const { databaseUrl, source } = resolveDatabaseUrl(env, await options.read(envFile));
  await step("Database", async () => {
    const createClient = await options.loadClientFactory();
    const result = await provisionDatabase({ databaseUrl, env, createClient });
    return { status: result.status, detail: `${result.detail} (DATABASE_URL from ${source})` };
  });
  await step("Migrations", async () => {
    await runNpm(runCommand, "npm run db:migrate", ["run", "db:migrate"], { cwd: repoRoot, env: { ...env, [DATABASE_URL_KEY]: databaseUrl } });
    return { status: "ran", detail: "all migrations applied" };
  });
  return results;
}

/** @type {Record<StepStatus, string>} */
const STATUS_LABEL = { done: "done", skipped: "skipped (already done)", ran: "ok" };

/** @param {StepResult} result */
export function formatResult(result) {
  return `• ${result.name}: ${STATUS_LABEL[result.status]}, ${result.detail}`;
}

const NEXT_STEPS = [
  "Setup complete. Start the app with `npm run dev`, then open:",
  "  http://localhost:3000/            public site",
  "  http://localhost:3000/admin       back office",
  "  http://localhost:3000/api/health  health check",
];

/** @returns {Promise<(config: ClientConfig) => DbClient>} */
export async function loadPgClientFactory() {
  const { default: pg } = await import("pg");
  return (config) => new pg.Client(config);
}

/** @param {string} path */
export function readText(path) {
  return readFile(path, "utf8");
}

export function randomPassword() {
  return randomBytes(PASSWORD_BYTES).toString("base64url");
}

/**
 * @typedef {object} MainDeps
 * @property {string} [repoRoot]
 * @property {string} [envFile]
 * @property {NodeJS.ProcessEnv} [env]
 * @property {string} [nodeVersion]
 * @property {RunCommand} [runCommand] defaults to npm with redacted output
 * @property {SetupOptions["loadClientFactory"]} [loadClientFactory]
 * @property {SetupOptions["exists"]} [exists]
 * @property {SetupOptions["read"]} [read]
 * @property {SetupOptions["write"]} [write]
 * @property {SetupOptions["generatePassword"]} [generatePassword]
 * @property {(message: string) => void} [log]
 * @property {(message: string) => void} [error]
 */

/**
 * Entry point: runs setup and returns the process exit code. All output is redacted.
 * @param {MainDeps} [deps]
 */
export async function main(deps = {}) {
  const {
    repoRoot = REPO_ROOT,
    envFile = join(REPO_ROOT, ".env"),
    env = process.env,
    nodeVersion = process.versions.node,
    loadClientFactory = loadPgClientFactory,
    generatePassword = randomPassword,
    exists = existsSync,
    read = readText,
    write = writeFile,
    log = console.log,
    error = console.error,
  } = deps;
  // The env file's URL is tracked because setup may create it partway through the run; its password must be
  // hidden from every later line of output.
  /** @type {string | undefined} */
  let envFileUrl;
  const secrets = () => collectSecrets(env, [env[DATABASE_URL_KEY], envFileUrl]);
  const { runCommand = commandRunner({ secrets }) } = deps;

  try {
    if (exists(envFile)) envFileUrl = parseEnv(await read(envFile).catch((cause) => Promise.reject(new SetupError(`Environment file: ${messageOf(cause)}`))))[DATABASE_URL_KEY];
    await runSetup({
      repoRoot,
      envFile,
      env,
      nodeVersion,
      runCommand,
      loadClientFactory,
      exists,
      read,
      write: async (path, content, options) => {
        envFileUrl = parseEnv(content)[DATABASE_URL_KEY];
        await write(path, content, options);
      },
      generatePassword,
      report: (result) => log(redact(formatResult(result), secrets())),
    });
  } catch (failure) {
    error(redact(`Setup failed at ${messageOf(failure)}`, secrets()));
    return 1;
  }
  log(NEXT_STEPS.join("\n"));
  return 0;
}
