# Run: idempotent `npm run setup` installer

- **Goal:** implement `npm run setup`, which runs README's "Getting started" steps idempotently, and update README while keeping the manual steps.
- **Source doc:** .ai/specs/2026-10-17-npm-run-setup-installer.md (spec PR #6; the spec merges through that PR, not this one)
- **Issue:** #5
- **Engine:** om-auto-create-pr (steps: 6, --loop: no)

## Scope

- New: `scripts/with-env.mjs`, `scripts/lib/with-env.mjs`, `scripts/setup.mjs` and `scripts/lib/setup.mjs`, with unit tests, plus `test/integration/setup.test.ts`.
- Changed: the root `package.json` scripts (`setup`, and `with-env` wrapping of `dev`, `db:migrate` and `db:migration:create`) and `README.md`.
- Non-goals: installing Node, PostgreSQL or Docker; production provisioning; seeding; auto-starting dev; any change under `packages/`; CI workflow changes.

## Risks

- Wrapping `dev`/`db:*` changes how they load env. The shell still wins, and `start`/`build`/tests are untouched.
- The sandbox's local PostgreSQL may not allow the default admin connection. Verify with `SETUP_ADMIN_DATABASE_URL`.

## Progress

PR: #7

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Env loading

- [x] 1.1 with-env loader, tests and root script wrapping — 46f053b

### Phase 2: Setup command

- [x] 2.1 Setup helpers with unit tests — 5f18d76
- [x] 2.2 Setup steps runner, entry and npm script with unit tests — 5f18d76, 4f2feec
- [x] 2.3 Integration test running setup twice — 1d58219

### Phase 3: Docs and verification

- [x] 3.1 README quick start and commands table — 85a8efa
- [x] 3.2 Full gate and manual double run of npm run setup — 4f2feec

## Actions and findings

- `node --env-file-if-exists=.env --run` doesn't pass the variables on to npm scripts, so a `process.loadEnvFile` wrapper (`scripts/with-env.mjs`) loads the root `.env`. Recorded as a lesson in spec PR #6.
- Deviation from the spec table: steps 3 and 4 are merged. A new `.env` is created from `.env.example` with a generated password straight away, because copying the example as-is would persist its sample password. The spec on PR #6 is updated to match.
- The real `npm install` rewrote `package-lock.json`'s root `engines` (`>=22.17.0` → `>=24.0.0`, which `package.json` already declares). This pre-existing drift is synced here so setup leaves a clean tree.

## Verification

- `npm run validate`: green. Coverage is 100% statements, branches, functions and lines (563/313/166/508).
- Integration tests (sandbox, `INTEGRATION_DATABASE_URL`):
  - `setup.test.ts` and `health.test.ts` pass (6 tests).
  - `pages.test.ts` and `database-outage.test.ts` weren't run locally: there's no headless Chromium in this sandbox. CI runs them.
- Manual: `env -u DATABASE_URL SETUP_ADMIN_DATABASE_URL=… npm run setup`, run twice against the sandbox PostgreSQL.
  - Run 1 created `.env` (mode `0600`) and the `devmentor` role and database, then migrated.
  - Run 2 reported every state step as skipped, with exit 0 both times.
  - `npm run db:migrate` without a shell `DATABASE_URL` used `.env`.
  - The `devmentor` role and database were dropped afterwards.
- Failure paths tried by hand: a password mismatch after deleting `.env`, and an unreachable port. Both exit 1 with actionable messages and no password in the output.

## Outcome

Done. Follow-up: after spec PR #6 merges, move the spec to `.ai/specs/implemented/`.
