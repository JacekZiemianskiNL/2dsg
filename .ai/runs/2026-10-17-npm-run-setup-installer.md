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

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: Env loading

- [ ] 1.1 with-env loader, tests and root script wrapping

### Phase 2: Setup command

- [ ] 2.1 Setup helpers with unit tests
- [ ] 2.2 Setup steps runner, entry and npm script with unit tests
- [ ] 2.3 Integration test running setup twice

### Phase 3: Docs and verification

- [ ] 3.1 README quick start and commands table
- [ ] 3.2 Full gate and manual double run of npm run setup
