# Idempotent `npm run setup` installer for local development

- **Date:** 2026-10-17
- **Status:** Proposed
- **Issue:** #5

## 📝 TLDR

To set up DevMentor today, a new developer follows the four manual steps in README's "Getting started". The `DATABASE_URL` they `export` is lost when the shell closes. The proposal is a single command, `npm run setup`, that installs dependencies, provisions the local PostgreSQL role and database, persists `DATABASE_URL` in a git-ignored root `.env` and applies migrations. A rerun reports every step that's already done as skipped. The manual steps stay in README as the alternative.

## 📝 Problem Statement

- Setup is four manual steps (README → Getting started). Step 2 needs `createuser`/`createdb` and an `export` that only lives as long as the shell does.
- Verified in the repo: nothing loads a `.env` file today.
  - The MikroORM CLI (`packages/db/src/mikro-orm.config.ts` → `loadDatabaseEnv()`) reads only `process.env`.
  - Next.js reads `.env*` only from its own project directory, `packages/app/`.
  - So every new shell needs `DATABASE_URL` exported again before `npm run db:migrate` or `npm run dev` work.
- `node --env-file-if-exists=.env --run <script>` doesn't pass the file's variables to the npm script it runs (checked on Node 24.21). The maintainer's "root `.env`" decision therefore needs a small loader; see Proposed Solution.

## 📝 Proposed Solution

1. **`npm run setup`** → `node scripts/setup.mjs`. This is a thin entry over `scripts/lib/setup.mjs`, following the existing `scripts/audit.mjs` → `scripts/lib/audit-gate.mjs` split.
2. **Root `.env` as the single persisted source.** The decision on issue #5 picks the repo root because `.env*` is already git-ignored there.
   - A new `scripts/with-env.mjs` calls `process.loadEnvFile(".env")` when the file exists and then spawns the rest of its argv with the inherited environment.
   - `loadEnvFile` never overrides a variable that's already set, so a value exported in the shell still wins. That matches Node's `--env-file` semantics and keeps the manual steps working.
   - These root scripts are wrapped: `db:migrate`, `db:migration:create` and `dev`. For example, `"db:migrate": "node scripts/with-env.mjs npm run migration:up -w @devmentor/db"` and `"dev": "node scripts/with-env.mjs npm run dev -w @devmentor/app --"`.
   - Arguments after `npm run <script> --` are appended to the wrapped command unchanged, so `npm run dev -- --port 3001` and `npm run db:migration:create -- --blank` keep working.
   - `start`, `build` and the test scripts aren't wrapped. A production-style `start` must not pick up a stray developer `.env`, the app must build without a database, and the tests must not depend on a developer's `.env`.
   - Precedence for `dev`: shell, then root `.env` (injected into the process env), then `packages/app/.env*`. Next.js never overrides a variable that's already set. README documents this.
   - `process.loadEnvFile` needs Node 20.12 or newer. Older Node fails with "loadEnvFile is not a function"; `.nvmrc` and `engines` already require 24.

**Alternatives rejected**

- **`packages/app/.env.local`:** Next.js reads it natively, but the MikroORM CLI would need a second, separate loader, so two places would know the path. The maintainer chose the root `.env`.
- **`dotenv` dependency:** Node 24's `process.loadEnvFile` covers it (AGENTS.md: don't add a dependency for something 20 lines of local code covers).
- **A shell script (`setup.sh`):** it can't be unit-tested under the existing Vitest `tooling` project with the coverage gate.
- **Shelling out to `createuser`/`createdb`/`psql`:** that requires the PostgreSQL client tools. `pg` is already a root devDependency.

### Setup steps

Each step reports `done`, `skipped (already done)` or a failure.

| # | Step | Skipped when | Failure |
| --- | --- | --- | --- |
| 1 | Node version check against `.nvmrc` | never; it's a check | major below `.nvmrc` → exit 1 with the required version |
| 2 | `npm install` | never; it always runs and reports `up to date` when npm changes nothing. An mtime heuristic would miss workspace `package.json` edits. | npm exit code is passed through |
| 3 | Environment file: create `.env` from `.env.example` (mode `0600`) with `DATABASE_URL`'s password replaced by a generated one; or add a generated `DATABASE_URL` to an existing `.env` that has none | `.env` already sets `DATABASE_URL`, and it's never overwritten | I/O error |
| 4 | Resolve `DATABASE_URL` (no output of its own; the source is shown on the Database line) | always resolves: shell, else `.env` | invalid URL → message at the Database step, nothing provisioned |
| 5 | Provision the role and database | a connection with the target URL succeeds | see Edge Cases |
| 6 | `npm run db:migrate`, with the resolved `DATABASE_URL` in the child env | never; it always runs and reports `ran`. MikroORM's `migration:up` already does nothing when no migration is pending. | npm exit code is passed through |
| 7 | Summary and next steps (`npm run dev`, the URLs from README step 4) | | |

- **Step 4 resolution order** mirrors runtime precedence: the shell, then `.env`. Step 3 has already put a generated value in `.env` when there was none. It generates the value right away instead of copying the template as-is, so `.env.example`'s sample password is never persisted (an implementation finding from PR #7). A shell `DATABASE_URL` is never written to `.env`.
- **Step statuses:** `done` (state changed), `skipped` (already in place) and `ran` (an always-run step: `npm install`, migrations, the version check). On a rerun, no step reports `done`. This is the definition of idempotent used in the tests.
- **Reading `.env`** uses `util.parseEnv` (Node ≥ 21.7), the same parser behind `--env-file`/`loadEnvFile`, so setup reads exactly what the runtime reads.
- **A generated value** is the `.env.example` URL with the password replaced by `randomBytes(24).toString("base64url")`.
  - It's written by replacing the first active `DATABASE_URL=` line (an optional `export ` prefix is allowed) or appending one when there's none. Commented lines and every other line are left alone, and the file's line endings (LF/CRLF) are kept.
  - Setup writes only when `parseEnv` finds no non-empty value. It never rewrites an existing value, so it can't create duplicates or edit a user's quoted value.
  - 24 bytes gives 192 bits of entropy, and base64url needs no URL escaping.
- **Step 5 admin connection:** `SETUP_ADMIN_DATABASE_URL` when set. Otherwise it's the target host and port, database `postgres`, with user and password from the standard libpq variables `pg` already honours (`PGUSER`, falling back to the OS user, and `PGPASSWORD`).
  - Known limitation: `pg` connects over TCP. On a stock Debian or Homebrew install where only peer auth over the socket is set up, the default can fail. The error then suggests `SETUP_ADMIN_DATABASE_URL=postgresql:///postgres?host=/var/run/postgresql` (a socket path) or `PGUSER`/`PGPASSWORD`.
  - The step creates the role (`LOGIN`, password from the target URL) only if `pg_roles` doesn't already have it, and creates the database (`OWNER` the role) only if `pg_database` doesn't already have it.
  - Identifiers are double-quoted after a `^[a-z_][a-z0-9_]*$` check of the role and database names. The password is set with the client's literal escaping. No SQL is built from unchecked input.
- **Bootstrap:** `scripts/setup.mjs` and the code before step 2 import only `node:` built-ins, because `node_modules` may not exist yet. `pg` is loaded with a dynamic `import("pg")` after step 2.
- **Secrets:** the password and any URL containing it are never printed.
  - Every log line and error message, including `pg` errors and captured child-process stderr, passes through `redact()`. It masks the password of the target and admin URLs, both as a bare password and inside a URL.
  - Child processes run with piped output that's redacted line by line before it's forwarded.
  - `.env` is created with mode `0600`.

## 📝 Architecture

- The new files are `scripts/setup.mjs`, `scripts/lib/setup.mjs`, `scripts/with-env.mjs` and their tests. No package under `packages/` changes, and no `core`/`db` boundary is crossed.
  - The setup script validates the URL with its own small check (protocol `postgres:`/`postgresql:`) rather than importing `@devmentor/db`. That entry point starts with `import "server-only"` and can't be imported from a plain Node script.
- Changed: root `package.json` scripts (`setup`, plus the `with-env` wrapping described above), README "Getting started" and the Commands table.
- CI: no new gate script and no workflow change. The integration job gets one more test file.

## 📝 Edge Cases & Failure Scenarios

- **PostgreSQL unreachable** (`ECONNREFUSED`/timeout on both the target and admin connections): exit 1 with "PostgreSQL is not reachable at host:port; start it or set DATABASE_URL". Nothing is created. `.env` may already exist from step 3, which is harmless and kept on rerun.
- **Admin auth fails:** exit 1, naming `SETUP_ADMIN_DATABASE_URL` and `PGPASSWORD` as the fix.
- **The role exists but the target password is wrong** (for example, `.env` was deleted and a new password was generated): exit 1. The message points to the existing `.env` value or `ALTER ROLE … PASSWORD`. Setup never resets the password of a role it didn't just create.
- **Role or database name fails the identifier check:** exit 1 before any SQL runs.
- **Migration fails:** npm's exit code and output are passed through. The role and database are kept, and a rerun retries only the remaining steps.
- **Interrupted run:** every step re-checks its own state, so a rerun resumes.
- **`.env` exists without `DATABASE_URL`:** the line is appended and the rest of the file is preserved. An empty `DATABASE_URL=` (the template's placeholder is non-empty, so this only happens when a user cleared it) is replaced in place.
- **Admin URL carries a password:** it's masked in every message through `redact()`, the same as the target URL.

## 📝 Risks & Impact Review

- **Changed commands:** `db:migrate`, `db:migration:create`, `dev` and `start` now load the root `.env`.
  - Developers who export variables see no change, because the shell wins.
  - Developers with a root `.env` that's lying around will have its values picked up. That's intended, and it's documented in README.
  - Rollback: revert the script wrapping in `package.json`.
- **No schema, API, auth or `BACKWARD_COMPATIBILITY.md`-protected surface is touched.**
- **The default admin connection uses libpq env/OS user over TCP.** Peer-auth-only installs need `SETUP_ADMIN_DATABASE_URL` (a socket path is supported); the error says so.

## 📋 Phasing

One phase. It ships in a single PR.

## 📋 Implementation Plan

1. **`scripts/with-env.mjs` + `scripts/lib/with-env.mjs`:** the lib's `main({ argv, envFile, deps })` loads the env file when it exists, spawns the argv with `stdio: "inherit"`, and resolves with the child's exit code, mapping a signal to 128 + its number. The entry file is just `process.exitCode = await main(...)`, like `scripts/audit.mjs`. Unit tests cover the lib with injected `spawn`, `existsSync` and `loadEnvFile`, and execute the entry with the lib mocked through `vi.mock`, so every `scripts/**/*.mjs` file is at 100%. Wrap `dev`, `db:migrate` and `db:migration:create`. Verify: `npm run db:migrate` works with only the root `.env` set, and `npm run dev -- --port 3001` forwards its flag.
2. **Pure helpers in `scripts/lib/setup.mjs`:** Node version comparison, `.env` line upsert (LF/CRLF, `export ` prefix, commented lines), `DATABASE_URL` resolution and generation, `redact`, identifier validation and admin config derivation. Cover them with unit tests in `scripts/lib/setup.test.mjs`.
3. **Steps runner** `runSetup({ repoRoot, envFile, env, deps })`, with injected `spawn`, `fs`, `createClient` and `log`. It runs the steps in order with a done/skipped/failed result for each. Unit-test the first run, the rerun (everything skipped), and each failure path in Edge Cases at 100% branch coverage. Add a test that no output line contains the password. The `scripts/setup.mjs` entry only wires the real deps and `envFile = <repoRoot>/.env` and sets `process.exitCode`. Its unit test runs it with the lib mocked.
4. **Integration test `test/integration/setup.test.ts`:**
   - Run `runSetup` against the test PostgreSQL server: the admin URL from Testcontainers or `INTEGRATION_DATABASE_URL`, a uniquely named role and database in `DATABASE_URL`, and an `envFile` in a temp directory.
   - Use the real `pg` client and the real migration spawn. Stub `npm install` so the test never reinstalls the repo's dependencies.
   - Assert that the first run reports `done` for the role, database and env steps, and that a connection with the new role sees the migrated schema.
   - Assert that the second run reports no `done` step and leaves the env file byte-identical.
   - Drop the role and database in teardown.
   - Expose the admin URL from `test/integration/database.ts` if it isn't already reachable.
5. **README:** add "Quick start: `npm run setup`" with what it does, the precedence rule, `SETUP_ADMIN_DATABASE_URL`, and rerun behavior. Keep the manual steps as "Manual setup", and add the `setup` row to the Commands table.
6. **Gate:** `npm run validate` green at 100% coverage, `npm run test:integration` green, and a manual check that `npm run setup` run twice in the sandbox prints the expected done/skipped summaries.

## Resolved assumptions (autonomous defaults)

| # | Question | Answer | Rationale |
| --- | --- | --- | --- |
| Q1 | Where is `DATABASE_URL` persisted? | Root `.env`, loaded through `scripts/with-env.mjs` | Decided by the maintainer on issue #5. The loader replaces `--env-file-if-exists` because `node --run` doesn't pass the variables on to npm scripts. |
| Q2 | Role password: generate or prompt? | Generate (192-bit, base64url) and store it only in `.env` | Keeps reruns and CI non-interactive. It's a local dev credential that's never printed. |
| Q3 | How does setup get admin access? | `pg` with `SETUP_ADMIN_DATABASE_URL`, falling back to the local `postgres` superuser | No new dependency on the PostgreSQL client tools. The override covers non-default servers. |
| Q4 | Should setup also start `npm run dev`? | No, it prints the next command | Smallest scope. Setup stays a finite, idempotent command. |
| Q5 | Reset the password when the role exists but authentication fails? | No, exit with guidance | It's the most reversible option: it never changes credentials it didn't create. |
