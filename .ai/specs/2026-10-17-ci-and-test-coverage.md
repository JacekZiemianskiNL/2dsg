# GitHub CI, 100% unit coverage and browser integration tests

- **Date:** 2026-10-17
- **Status:** Approved 2026-10-17 (user request), implementation in progress (see Plan and progress)

## Context

Today the gate is local only (`npm run validate`): lint, typecheck, Vitest unit tests (81 tests, no coverage measurement), build and audit. The user wants:

- **A GitHub Actions workflow for every pull request:** build check, lint check, unit tests, and integration tests.
- **Ephemeral integration tests:** a Testcontainers PostgreSQL instance and the real app, driven with agent-browser (Vercel Labs' browser automation CLI).
- **A coverage rule in `AGENTS.md`:** every new feature must be 100% covered by unit tests.
- **Coverage now:** unit tests that cover 100% of the existing code.

## Decisions

- **Unit framework:** keep Vitest 5, which is already in place.
  - Add `@vitest/coverage-v8` with a **100% threshold for lines, branches, functions and statements**, and add a project for `packages/app` and one for `scripts/`.
  - Coverage includes every source file in `packages/*/src`, including shadcn primitives, barrels and Next pages/routes, plus `scripts/*.mjs`.
  - Excluded: test files, test-only helpers (`src/testing/`), type declarations, and build/config files outside `src` (`next.config.ts`, `postcss.config.mjs`, the ESLint and Vitest configs).
  - `/* v8 ignore */` comments aren't allowed as a way to reach the threshold.
- **Integration framework:** a separate Vitest config (`vitest.integration.config.ts`) with tests in `test/integration/`, run with `npm run test:integration` against an already-built app (`npm run build`). The global setup:
  1. Starts `postgres:17-alpine` with `@testcontainers/postgresql`.
  2. Runs the migrations through the real CLI (`npm run db:migrate`).
  3. Starts `next start` on a free port with that `DATABASE_URL` and waits for `/api/health`.
  4. Tears everything down afterwards.
- **Escape hatch for machines without Docker** (like the agent sandbox): if `INTEGRATION_DATABASE_URL` is set, it points at an admin connection to an existing server. The setup creates a uniquely named throwaway database there and drops it on teardown. CI always uses Testcontainers.
- **Browser:** tests drive agent-browser through a typed helper around the CLI.
  - Each run gets its own `--session`, and output is parsed from `--json`.
  - CI installs Chrome with `agent-browser install --with-deps`.
  - Locally, `AGENT_BROWSER_EXECUTABLE_PATH` can point at an existing Chromium.
- **Outage test:** the database-outage scenario starts a second app instance pointed at an unreachable database, so the shared database is never stopped.
- **CI** (`.github/workflows/ci.yml`):
  - Triggers: `pull_request` and pushes to `main`, plus `workflow_dispatch`, with concurrency cancelling superseded runs.
  - Node 24 (agent-browser requires Node 24 or newer), with the npm cache.
  - Parallel jobs: `lint` (lint and typecheck), `unit` (coverage gate, coverage report uploaded as an artifact), `build`, `integration` (build, then integration tests), and `audit` (`npm run audit`).
  - Least-privilege `permissions: contents: read`.
- **`audit.mjs`:** split into a pure `evaluateAudit()` function plus a thin CLI, so it can be unit-tested.

## Plan and progress

Each phase ends with `npm run validate` passing.

### Phase 1: Coverage tooling and 100% unit coverage

- Add `@vitest/coverage-v8`, the coverage config and thresholds, an `app` project (jsdom, with the `@/` alias and the `next/font` mock) and a `tooling` project.
- `npm run test:coverage`, and make `validate` use it.
- Write unit tests until every included file reaches 100% on all four metrics.

Done when `npm run test:coverage` passes with 100/100/100/100.

### Phase 2: Integration framework

- Root devDependencies: `@testcontainers/postgresql`, `pg`, `agent-browser`.
- `vitest.integration.config.ts`, `test/integration/{global-setup,app-server,database,browser}.ts`.
- Tests:
  - The health API (envelope, 405).
  - The pages through the browser: `/` title and heading; `/admin` Operational, navigation back to `/`.
  - The database outage: `/admin` Unavailable and `/api/health` 503.

Done when `npm run test:integration` passes locally through `INTEGRATION_DATABASE_URL` (no Docker here), and lint and typecheck cover the new files.

### Phase 3: GitHub Actions workflow

- `.github/workflows/ci.yml` with the five jobs above.
- Validate the YAML locally and pin the action major versions to their current releases.

Done when the workflow file is valid and runs green on a PR (see phase 5).

### Phase 4: Rules and docs

- `AGENTS.md`:
  - 100% unit coverage is mandatory for every change, with no ignore comments or new excludes without a spec.
  - Integration tests for user-facing flows.
  - The CI jobs and commands.
- README: the test commands and the CI overview.

### Phase 5: Verification

- Locally: a clean `npm ci`, `npm run validate` (with coverage) and `npm run test:integration`.
- CI: push the branch and open a PR so the workflow runs, but only after the user confirms, since that's outward-facing. Testcontainers only runs there.

### Progress

| Phase | Status | Notes |
| --- | --- | --- |
| 1 | Done 2026-10-17 | 150 tests in 29 files; 100% lines/branches/functions/statements over 43 tracked files. `validate` now runs `test:coverage`. See the phase 1 notes below. |
| 2 | Done 2026-10-17 | 8 integration tests pass locally in 4s through `INTEGRATION_DATABASE_URL`, and throwaway databases and processes are cleaned up. A missing build and a missing Docker runtime both fail with clear errors. Testcontainers itself runs only in CI. |
| 3 | Done 2026-10-17 | `.github/workflows/ci.yml` (5 jobs) plus a composite setup action (`.nvmrc`, npm cache, `npm ci`). actionlint 1.7.12 reports no problems. Actions are on their current majors (checkout, setup-node and upload-artifact v7). |
| 4 | Done 2026-10-17 | `AGENTS.md`: a mandatory 100% unit coverage rule with no workarounds, integration tests for user-facing flows, the commands and CI. README: commands, a CI table, stack rows. Node 24 in `engines`/`.nvmrc`. |
| 5 | Local done, CI pending | Clean `npm ci` (11s), `npm run validate` exit 0 (150 tests, 100% coverage), `npm run test:integration` 8/8 in 4s with no leftovers. The GitHub run waits on the user confirming push and PR. |

### Phase 1 notes

- **Projects:**
  - New `app` project (jsdom; `@/` alias; `next/font/google` stubbed in `test/stubs/`, with Next-like `__variable_*` class names).
  - New `tooling` project (`scripts/**/*.test.mjs`).
  - Route-handler tests use `// @vitest-environment node`.
- **Refactors for testability:**
  - `getLogger(destination?)`.
  - `scripts/audit.mjs` became a one-line entry plus `scripts/lib/audit-gate.mjs` (`collectAdvisories`, `evaluateAudit`, `runNpmAudit`, `readAllowlist`, `main` with injectable dependencies).
  - The admin status card renders from an explicit view state (loading, status or error). The old condition had a branch no test could reach.
  - Its loader passes unexpected `apiCall` rejections to the nearest error boundary (`setState(() => { throw })`) instead of leaving an unhandled rejection.
- **Dead code removed:** the `?? ""` fallbacks in `CrudForm`, since every field is initialised in state.
- **A claim I retracted:** I suspected `CrudForm`'s `isSubmitting` double-submit guard was ineffective and tried a ref. The regression test passed on the original code too (React flushes discrete events), so I reverted to the original guard and kept the test that covers it.
- **Config:** the ESLint ignores include `coverage/**`, and the app tsconfig includes `test/setup-dom.ts` for the jest-dom matcher types.

### Phase 2 notes

- **Harness:**
  - `test/integration/database.ts`: Testcontainers `postgres:17-alpine`, or a `devmentor_it_<hex>` database created on the `INTEGRATION_DATABASE_URL` server and dropped with `with (force)`.
  - `app-server.ts`: checks the build exists, migrates through `npm run db:migrate`, and starts `next start` on a free port in its own process group, waiting for `/`. Stopping sends SIGTERM to the group, then SIGKILL after 10s.
  - `browser.ts`: a typed wrapper around the agent-browser CLI with `--session <run id> --json`.
  - `global-setup.ts`: provides `appUrl`, `databaseUrl` and `browserSession`, and tears everything down even when setup fails.
- **Tests:**
  - `health.test.ts`: the envelope, `no-store` and 405 over real HTTP, plus the `mikro_orm_migrations` table existing in the ephemeral database.
  - `pages.test.ts`: `/` title, heading and rendered text; `/admin` Operational; clicking "View public site" returns to `/`.
  - `database-outage.test.ts`: a second app on an unreachable database gives `/api/health` 503 without leaking details, `/` still renders, and `/admin` shows Unavailable.
- **First run:** the `/` text assertion failed because CSS `uppercase` changes rendered text. Recorded as a lesson.

## Acceptance criteria

- [ ] Every PR runs lint, typecheck, unit (with the 100% coverage gate), build, integration and audit jobs.
- [ ] `npm run test:coverage` reports 100% lines, branches, functions and statements for all included files.
- [ ] `npm run test:integration` starts PostgreSQL (Testcontainers in CI), migrates it, starts the built app and passes browser-driven tests with agent-browser, then cleans everything up.
- [ ] `AGENTS.md` makes 100% unit coverage mandatory for every new feature.
